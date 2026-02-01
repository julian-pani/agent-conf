import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stringify as yamlStringify } from "yaml";
import {
  GLOBAL_END_MARKER,
  GLOBAL_START_MARKER,
  REPO_END_MARKER,
  REPO_START_MARKER,
} from "../../src/core/markers.js";
import { resolveLocalSource } from "../../src/core/source.js";
import { getSyncStatus, sync } from "../../src/core/sync.js";

describe("init integration", () => {
  let tempTargetDir: string;
  let agentConfDir: string;

  beforeEach(async () => {
    // Create temp directories
    tempTargetDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-conf-target-"));
    agentConfDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-conf-source-"));

    // Create mock agent-conf repo structure
    await fs.mkdir(path.join(agentConfDir, "instructions"), { recursive: true });
    await fs.mkdir(path.join(agentConfDir, "skills", "test-skill", "references"), {
      recursive: true,
    });

    // Write mock AGENTS.md
    await fs.writeFile(
      path.join(agentConfDir, "instructions", "AGENTS.md"),
      "# Global Engineering Standards\n\nThese are the company standards.",
      "utf-8",
    );

    // Write mock skill files
    await fs.writeFile(
      path.join(agentConfDir, "skills", "test-skill", "SKILL.md"),
      "# Test Skill\n\nSkill instructions.",
      "utf-8",
    );
    await fs.writeFile(
      path.join(agentConfDir, "skills", "test-skill", "README.md"),
      "# Test Skill README\n\nHuman-readable docs.",
      "utf-8",
    );
  });

  afterEach(async () => {
    await fs.rm(tempTargetDir, { recursive: true, force: true });
    await fs.rm(agentConfDir, { recursive: true, force: true });
  });

  it("should sync from local source to empty target", async () => {
    const resolvedSource = await resolveLocalSource({ path: agentConfDir });
    const result = await sync(tempTargetDir, resolvedSource, {
      override: false,
      targets: ["claude"],
    });

    // Check AGENTS.md was created in root with markers
    const agentsMdPath = path.join(tempTargetDir, "AGENTS.md");
    const agentsMd = await fs.readFile(agentsMdPath, "utf-8");
    expect(agentsMd).toContain(GLOBAL_START_MARKER);
    expect(agentsMd).toContain(GLOBAL_END_MARKER);
    expect(agentsMd).toContain(REPO_START_MARKER);
    expect(agentsMd).toContain(REPO_END_MARKER);
    expect(agentsMd).toContain("# Global Engineering Standards");

    // Check CLAUDE.md was created in .claude/ with correct reference
    const claudeMdPath = path.join(tempTargetDir, ".claude", "CLAUDE.md");
    const claudeMd = await fs.readFile(claudeMdPath, "utf-8");
    expect(claudeMd).toContain("@../AGENTS.md");

    // Check skills were copied
    const skillPath = path.join(tempTargetDir, ".claude", "skills", "test-skill", "SKILL.md");
    const skillContent = await fs.readFile(skillPath, "utf-8");
    expect(skillContent).toContain("# Test Skill");

    // Check lockfile was created
    const lockfilePath = path.join(tempTargetDir, ".agent-conf", "lockfile.json");
    const lockfileExists = await fs
      .access(lockfilePath)
      .then(() => true)
      .catch(() => false);
    expect(lockfileExists).toBe(true);

    // Check result summary
    expect(result.agentsMd.merged).toBe(false);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.target).toBe("claude");
    expect(result.targets[0]?.instructionsMd.created).toBe(true);
    expect(result.skills.synced).toContain("test-skill");
    expect(result.skills.totalCopied).toBeGreaterThan(0);
  });

  it("should preserve repo content on subsequent syncs", async () => {
    // First sync
    const resolvedSource = await resolveLocalSource({ path: agentConfDir });
    await sync(tempTargetDir, resolvedSource, { override: false, targets: ["claude"] });

    // Modify repo block content (AGENTS.md is in root)
    const agentsMdPath = path.join(tempTargetDir, "AGENTS.md");
    let agentsMd = await fs.readFile(agentsMdPath, "utf-8");
    agentsMd = agentsMd.replace(
      `${REPO_START_MARKER}\n<!-- Repository-specific instructions below -->`,
      `${REPO_START_MARKER}\n<!-- Repository-specific instructions below -->\n\n# My Custom Instructions\nDo special things.`,
    );
    await fs.writeFile(agentsMdPath, agentsMd, "utf-8");

    // Update source
    await fs.writeFile(
      path.join(agentConfDir, "instructions", "AGENTS.md"),
      "# Updated Global Standards\n\nNew version of standards.",
      "utf-8",
    );

    // Second sync
    const resolvedSource2 = await resolveLocalSource({ path: agentConfDir });
    const result = await sync(tempTargetDir, resolvedSource2, {
      override: false,
      targets: ["claude"],
    });

    // Verify merge behavior
    expect(result.agentsMd.merged).toBe(true);
    expect(result.agentsMd.preservedRepoContent).toBe(true);

    // Verify content
    const updatedAgentsMd = await fs.readFile(agentsMdPath, "utf-8");
    expect(updatedAgentsMd).toContain("# Updated Global Standards");
    expect(updatedAgentsMd).toContain("# My Custom Instructions");
  });

  it("should report correct status", async () => {
    // Initially not synced
    let status = await getSyncStatus(tempTargetDir);
    expect(status.hasSynced).toBe(false);
    expect(status.lockfile).toBeNull();

    // After sync
    const resolvedSource = await resolveLocalSource({ path: agentConfDir });
    await sync(tempTargetDir, resolvedSource, { override: false, targets: ["claude"] });

    status = await getSyncStatus(tempTargetDir);
    expect(status.hasSynced).toBe(true);
    expect(status.lockfile).not.toBeNull();
    expect(status.agentsMdExists).toBe(true);
    expect(status.skillsExist).toBe(true);
    expect(status.lockfile?.source.type).toBe("local");
  });

  it("should sync to multiple targets", async () => {
    const resolvedSource = await resolveLocalSource({ path: agentConfDir });
    const result = await sync(tempTargetDir, resolvedSource, {
      override: false,
      targets: ["claude", "codex"],
    });

    // Check skills were copied to both targets
    const claudeSkillPath = path.join(tempTargetDir, ".claude", "skills", "test-skill", "SKILL.md");
    const codexSkillPath = path.join(tempTargetDir, ".codex", "skills", "test-skill", "SKILL.md");

    const claudeSkillExists = await fs
      .access(claudeSkillPath)
      .then(() => true)
      .catch(() => false);
    const codexSkillExists = await fs
      .access(codexSkillPath)
      .then(() => true)
      .catch(() => false);

    expect(claudeSkillExists).toBe(true);
    expect(codexSkillExists).toBe(true);

    // Check CLAUDE.md was created (only Claude uses instructions files)
    const claudeMdPath = path.join(tempTargetDir, ".claude", "CLAUDE.md");
    const claudeMd = await fs.readFile(claudeMdPath, "utf-8");
    expect(claudeMd).toContain("@../AGENTS.md");

    // Codex does NOT need a CODEX.md - it reads AGENTS.md directly
    const codexMdPath = path.join(tempTargetDir, ".codex", "CODEX.md");
    const codexMdExists = await fs
      .access(codexMdPath)
      .then(() => true)
      .catch(() => false);
    expect(codexMdExists).toBe(false);

    // Check result has both targets
    expect(result.targets).toHaveLength(2);
    expect(result.targets.map((t) => t.target)).toContain("claude");
    expect(result.targets.map((t) => t.target)).toContain("codex");
  });

  it("should use custom marker prefix from canonical config", async () => {
    const CUSTOM_PREFIX = "fbagents";

    // Create agent-conf.yaml with custom marker prefix
    const canonicalConfig = {
      version: "1",
      meta: {
        name: "test-canonical",
        organization: "test-org",
      },
      markers: {
        prefix: CUSTOM_PREFIX,
      },
    };
    await fs.writeFile(
      path.join(agentConfDir, "agent-conf.yaml"),
      yamlStringify(canonicalConfig),
      "utf-8",
    );

    // Create skill with proper frontmatter
    await fs.writeFile(
      path.join(agentConfDir, "skills", "test-skill", "SKILL.md"),
      `---
name: test-skill
description: A test skill
---

# Test Skill

Skill instructions.`,
      "utf-8",
    );

    const resolvedSource = await resolveLocalSource({ path: agentConfDir });
    await sync(tempTargetDir, resolvedSource, {
      override: false,
      targets: ["claude"],
    });

    // Check AGENTS.md uses custom prefix markers
    const agentsMdPath = path.join(tempTargetDir, "AGENTS.md");
    const agentsMd = await fs.readFile(agentsMdPath, "utf-8");

    expect(agentsMd).toContain(`<!-- ${CUSTOM_PREFIX}:global:start -->`);
    expect(agentsMd).toContain(`<!-- ${CUSTOM_PREFIX}:global:end -->`);
    expect(agentsMd).toContain(`<!-- ${CUSTOM_PREFIX}:repo:start -->`);
    expect(agentsMd).toContain(`<!-- ${CUSTOM_PREFIX}:repo:end -->`);
    // Should NOT contain default prefix
    expect(agentsMd).not.toContain("agent-conf:global");
    expect(agentsMd).not.toContain("agent-conf:repo");

    // Check skill metadata uses custom prefix
    const skillPath = path.join(tempTargetDir, ".claude", "skills", "test-skill", "SKILL.md");
    const skillContent = await fs.readFile(skillPath, "utf-8");

    // Should use custom prefix (with underscores)
    expect(skillContent).toContain("fbagents_managed");
    expect(skillContent).toContain("fbagents_content_hash");
    // Should NOT contain default prefix
    expect(skillContent).not.toContain("agent_conf_managed");
    expect(skillContent).not.toContain("agent_conf_content_hash");
  });
});
