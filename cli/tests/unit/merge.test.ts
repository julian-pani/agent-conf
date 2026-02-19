import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMarkers } from "../../src/core/markers.js";

// Use getMarkers() to get marker strings for tests
const markers = getMarkers();
const GLOBAL_START_MARKER = markers.globalStart;
const GLOBAL_END_MARKER = markers.globalEnd;
const REPO_START_MARKER = markers.repoStart;
const REPO_END_MARKER = markers.repoEnd;

import { consolidateClaudeMd, mergeAgentsMd } from "../../src/core/merge.js";
import type { Source } from "../../src/schemas/lockfile.js";

describe("merge", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agconf-test-"));
    await fs.mkdir(path.join(tempDir, ".claude"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const testSource: Source = {
    type: "local",
    path: "/path/to/agconf",
    commit_sha: "abc1234",
  };

  describe("mergeAgentsMd", () => {
    it("should create new file when none exists", async () => {
      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.merged).toBe(false);
      expect(result.changed).toBe(true);
      expect(result.preservedRepoContent).toBe(false);
      expect(result.content).toContain(GLOBAL_START_MARKER);
      expect(result.content).toContain(GLOBAL_END_MARKER);
      expect(result.content).toContain(REPO_START_MARKER);
      expect(result.content).toContain(REPO_END_MARKER);
      expect(result.content).toContain("# Global Standards");
    });

    it("should merge existing AGENTS.md content without markers into repo block", async () => {
      // AGENTS.md is now in root
      const agentsMdPath = path.join(tempDir, "AGENTS.md");
      await fs.writeFile(agentsMdPath, "# My Existing Instructions\nDo things.", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.merged).toBe(true);
      expect(result.preservedRepoContent).toBe(true);
      expect(result.content).toContain("# Global Standards");
      expect(result.content).toContain("# My Existing Instructions");

      // Verify existing content is in repo block
      const repoStartIdx = result.content.indexOf(REPO_START_MARKER);
      const existingIdx = result.content.indexOf("# My Existing Instructions");
      expect(existingIdx).toBeGreaterThan(repoStartIdx);
    });

    it("should update global block and preserve repo block when markers exist", async () => {
      const existingContent = `${GLOBAL_START_MARKER}
Old global content
${GLOBAL_END_MARKER}

${REPO_START_MARKER}
# My Repo Specific
Keep this content
${REPO_END_MARKER}
`;
      // AGENTS.md is now in root
      const agentsMdPath = path.join(tempDir, "AGENTS.md");
      await fs.writeFile(agentsMdPath, existingContent, "utf-8");

      const result = await mergeAgentsMd(tempDir, "# New Global Standards", testSource);

      expect(result.merged).toBe(true);
      expect(result.preservedRepoContent).toBe(true);
      expect(result.content).toContain("# New Global Standards");
      expect(result.content).not.toContain("Old global content");
      expect(result.content).toContain("Keep this content");
    });

    it("should report changed=false when content is identical after sync", async () => {
      // First sync to create the file
      const firstResult = await mergeAgentsMd(tempDir, "# Global Standards", testSource);
      const agentsMdPath = path.join(tempDir, "AGENTS.md");
      await fs.writeFile(agentsMdPath, firstResult.content, "utf-8");

      // Second sync with same global content
      const secondResult = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(secondResult.merged).toBe(true);
      expect(secondResult.changed).toBe(false);
      expect(secondResult.content).toBe(firstResult.content);
    });

    it("should report changed=true when global content differs", async () => {
      // First sync
      const firstResult = await mergeAgentsMd(tempDir, "# Global Standards v1", testSource);
      const agentsMdPath = path.join(tempDir, "AGENTS.md");
      await fs.writeFile(agentsMdPath, firstResult.content, "utf-8");

      // Second sync with different global content
      const secondResult = await mergeAgentsMd(tempDir, "# Global Standards v2", testSource);

      expect(secondResult.merged).toBe(true);
      expect(secondResult.changed).toBe(true);
    });

    it("should override when override option is true", async () => {
      // AGENTS.md is now in root
      const agentsMdPath = path.join(tempDir, "AGENTS.md");
      await fs.writeFile(agentsMdPath, "# Existing content to be removed", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource, {
        override: true,
      });

      expect(result.merged).toBe(false);
      expect(result.preservedRepoContent).toBe(false);
      expect(result.content).toContain("# Global Standards");
      expect(result.content).not.toContain("Existing content to be removed");
    });

    it("should merge root CLAUDE.md content into repo block", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      await fs.writeFile(rootClaudeMdPath, "# Root CLAUDE content\nSome instructions", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.merged).toBe(true);
      expect(result.preservedRepoContent).toBe(true);
      expect(result.hadRootClaudeMd).toBe(true);
      expect(result.hadDotClaudeClaudeMd).toBe(false);
      expect(result.content).toContain("# Root CLAUDE content");
    });

    it("should merge .claude/CLAUDE.md content into repo block", async () => {
      const dotClaudeClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      await fs.writeFile(dotClaudeClaudeMdPath, "# Dot claude content\nMore instructions", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.merged).toBe(true);
      expect(result.preservedRepoContent).toBe(true);
      expect(result.hadRootClaudeMd).toBe(false);
      expect(result.hadDotClaudeClaudeMd).toBe(true);
      expect(result.content).toContain("# Dot claude content");
    });

    it("should merge content from both CLAUDE.md files", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      const dotClaudeClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      await fs.writeFile(rootClaudeMdPath, "# Root content", "utf-8");
      await fs.writeFile(dotClaudeClaudeMdPath, "# Dot claude content", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.hadRootClaudeMd).toBe(true);
      expect(result.hadDotClaudeClaudeMd).toBe(true);
      expect(result.content).toContain("# Root content");
      expect(result.content).toContain("# Dot claude content");
    });

    it("should deduplicate identical content from both CLAUDE.md files", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      const dotClaudeClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      const sameContent = "# Shared content\nIdentical instructions";
      await fs.writeFile(rootClaudeMdPath, sameContent, "utf-8");
      await fs.writeFile(dotClaudeClaudeMdPath, sameContent, "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.hadRootClaudeMd).toBe(true);
      expect(result.hadDotClaudeClaudeMd).toBe(true);
      // Content should appear only once (deduplicated)
      const matches = result.content.match(/# Shared content/g);
      expect(matches).toHaveLength(1);
    });

    it("should strip @AGENTS.md references from CLAUDE.md content", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      await fs.writeFile(rootClaudeMdPath, "@AGENTS.md\n\n# My content", "utf-8");

      const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource);

      expect(result.content).toContain("# My content");
      // Should not have duplicate @AGENTS.md in repo block
      const repoBlockMatch = result.content.match(
        /<!-- agconf:repo:start -->[\s\S]*<!-- agconf:repo:end -->/,
      );
      expect(repoBlockMatch?.[0]).not.toContain("@AGENTS.md");
    });
  });

  describe("consolidateClaudeMd", () => {
    it("should create root CLAUDE.md with reference when none exists", async () => {
      const result = await consolidateClaudeMd(tempDir, false);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.deletedDotClaudeClaudeMd).toBe(false);

      const claudeMdPath = path.join(tempDir, "CLAUDE.md");
      const content = await fs.readFile(claudeMdPath, "utf-8");
      expect(content).toBe("@AGENTS.md\n");
    });

    it("should delete .claude/CLAUDE.md after consolidation", async () => {
      const dotClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      await fs.mkdir(path.join(tempDir, ".claude"), { recursive: true });
      await fs.writeFile(dotClaudeMdPath, "# My CLAUDE.md\nSome content", "utf-8");

      const result = await consolidateClaudeMd(tempDir, true);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.deletedDotClaudeClaudeMd).toBe(true);

      // .claude/CLAUDE.md should be deleted
      const dotClaudeExists = await fs
        .access(dotClaudeMdPath)
        .then(() => true)
        .catch(() => false);
      expect(dotClaudeExists).toBe(false);

      // Root CLAUDE.md should have reference
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      const content = await fs.readFile(rootClaudeMdPath, "utf-8");
      expect(content).toBe("@AGENTS.md\n");
    });

    it("should create root CLAUDE.md when only .claude/CLAUDE.md existed", async () => {
      await fs.mkdir(path.join(tempDir, ".claude"), { recursive: true });
      const dotClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      await fs.writeFile(dotClaudeMdPath, "# My CLAUDE.md\nSome content", "utf-8");

      const result = await consolidateClaudeMd(tempDir, true);

      expect(result.created).toBe(true);
      expect(result.deletedDotClaudeClaudeMd).toBe(true);

      // Root CLAUDE.md should be created with reference
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      const content = await fs.readFile(rootClaudeMdPath, "utf-8");
      expect(content).toBe("@AGENTS.md\n");
    });

    it("should update root CLAUDE.md with reference if missing", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      await fs.writeFile(rootClaudeMdPath, "# My CLAUDE.md\nSome content", "utf-8");

      const result = await consolidateClaudeMd(tempDir, false);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(true);
      expect(result.deletedDotClaudeClaudeMd).toBe(false);

      const content = await fs.readFile(rootClaudeMdPath, "utf-8");
      expect(content).toBe("@AGENTS.md\n");
    });

    it("should not modify root CLAUDE.md if reference already exists", async () => {
      const rootClaudeMdPath = path.join(tempDir, "CLAUDE.md");
      await fs.writeFile(rootClaudeMdPath, "@AGENTS.md\n\nSome content", "utf-8");

      const result = await consolidateClaudeMd(tempDir, false);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
      expect(result.deletedDotClaudeClaudeMd).toBe(false);

      // Content should remain unchanged since reference already exists
      const content = await fs.readFile(rootClaudeMdPath, "utf-8");
      expect(content).toBe("@AGENTS.md\n\nSome content");
    });

    it("should handle ENOENT gracefully when .claude/CLAUDE.md was already deleted", async () => {
      // hadDotClaudeClaudeMd is true but file doesn't exist
      const result = await consolidateClaudeMd(tempDir, true);

      // Should not throw, should report no deletion
      expect(result.deletedDotClaudeClaudeMd).toBe(false);
      expect(result.created).toBe(true);
    });

    it("should always attempt to delete .claude/CLAUDE.md for migration", async () => {
      // Even when hadDotClaudeClaudeMd is false, if .claude/CLAUDE.md exists it should be deleted
      await fs.mkdir(path.join(tempDir, ".claude"), { recursive: true });
      const dotClaudeMdPath = path.join(tempDir, ".claude", "CLAUDE.md");
      await fs.writeFile(dotClaudeMdPath, "@../AGENTS.md\n", "utf-8");

      const result = await consolidateClaudeMd(tempDir, false);

      expect(result.created).toBe(true);
      expect(result.deletedDotClaudeClaudeMd).toBe(true);

      // .claude/CLAUDE.md should be gone
      const dotClaudeExists = await fs
        .access(dotClaudeMdPath)
        .then(() => true)
        .catch(() => false);
      expect(dotClaudeExists).toBe(false);
    });
  });

  describe("custom marker prefix", () => {
    const CUSTOM_PREFIX = "fbagents";

    describe("mergeAgentsMd with custom prefix", () => {
      it("should use custom prefix in generated markers", async () => {
        const result = await mergeAgentsMd(tempDir, "# Global Standards", testSource, {
          override: false,
          markerPrefix: CUSTOM_PREFIX,
        });

        expect(result.content).toContain(`<!-- ${CUSTOM_PREFIX}:global:start -->`);
        expect(result.content).toContain(`<!-- ${CUSTOM_PREFIX}:global:end -->`);
        expect(result.content).toContain(`<!-- ${CUSTOM_PREFIX}:repo:start -->`);
        expect(result.content).toContain(`<!-- ${CUSTOM_PREFIX}:repo:end -->`);
        expect(result.content).not.toContain("agconf:global");
        expect(result.content).not.toContain("agconf:repo");
      });

      it("should preserve repo block content from files with custom prefix markers", async () => {
        const existingContent = `<!-- ${CUSTOM_PREFIX}:global:start -->
Old global content
<!-- ${CUSTOM_PREFIX}:global:end -->

<!-- ${CUSTOM_PREFIX}:repo:start -->
# My Repo Specific
Keep this content
<!-- ${CUSTOM_PREFIX}:repo:end -->
`;
        const agentsMdPath = path.join(tempDir, "AGENTS.md");
        await fs.writeFile(agentsMdPath, existingContent, "utf-8");

        const result = await mergeAgentsMd(tempDir, "# New Global Standards", testSource, {
          override: false,
          markerPrefix: CUSTOM_PREFIX,
        });

        expect(result.merged).toBe(true);
        expect(result.preservedRepoContent).toBe(true);
        expect(result.content).toContain("# New Global Standards");
        expect(result.content).not.toContain("Old global content");
        expect(result.content).toContain("Keep this content");
      });

      it("should not parse default-prefix markers when using custom prefix", async () => {
        // Existing file has default prefix, but we're syncing with custom prefix
        const existingContent = `${GLOBAL_START_MARKER}
Old global content
${GLOBAL_END_MARKER}

${REPO_START_MARKER}
# Repo content with default markers
${REPO_END_MARKER}
`;
        const agentsMdPath = path.join(tempDir, "AGENTS.md");
        await fs.writeFile(agentsMdPath, existingContent, "utf-8");

        const result = await mergeAgentsMd(tempDir, "# New Global Standards", testSource, {
          override: false,
          markerPrefix: CUSTOM_PREFIX,
        });

        // Should treat entire existing content as repo-specific (no markers found)
        // since we're looking for custom prefix markers, not default ones
        expect(result.content).toContain(`<!-- ${CUSTOM_PREFIX}:global:start -->`);
        // The old content should end up in repo block since markers weren't recognized
        expect(result.preservedRepoContent).toBe(true);
      });
    });
  });
});
