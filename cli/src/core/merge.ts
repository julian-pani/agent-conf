import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Source } from "../schemas/lockfile.js";
import { buildAgentsMd, extractRepoBlockContent, parseAgentsMd } from "./markers.js";

export interface MergeOptions {
  override: boolean;
  /** Marker prefix to use for managed content (default: "agconf") */
  markerPrefix?: string;
}

export interface MergeResult {
  content: string;
  merged: boolean;
  preservedRepoContent: boolean;
}

export interface ConsolidateClaudeMdResult {
  created: boolean;
  updated: boolean;
  deletedRootClaudeMd: boolean;
}

interface ExistingContent {
  agentsMd: string | null;
  rootClaudeMd: string | null;
  dotClaudeClaudeMd: string | null;
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function gatherExistingContent(targetDir: string): Promise<ExistingContent> {
  const [agentsMd, rootClaudeMd, dotClaudeClaudeMd] = await Promise.all([
    readFileIfExists(path.join(targetDir, "AGENTS.md")),
    readFileIfExists(path.join(targetDir, "CLAUDE.md")),
    readFileIfExists(path.join(targetDir, ".claude", "CLAUDE.md")),
  ]);
  return { agentsMd, rootClaudeMd, dotClaudeClaudeMd };
}

function stripAgentsReference(content: string): string {
  // Remove @AGENTS.md, @../AGENTS.md, or @.claude/AGENTS.md references
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.match(/^@(\.\.\/|\.claude\/)?AGENTS\.md$/);
    })
    .join("\n")
    .trim();
}

export async function mergeAgentsMd(
  targetDir: string,
  globalContent: string,
  _source: Source,
  options: MergeOptions = { override: false },
): Promise<
  MergeResult & {
    mergedClaudeMdContent: string | null;
    hadRootClaudeMd: boolean;
    hadDotClaudeClaudeMd: boolean;
  }
> {
  const existing = await gatherExistingContent(targetDir);
  const markerOptions = options.markerPrefix ? { prefix: options.markerPrefix } : undefined;

  // Collect content to merge into repo block
  const contentToMerge: string[] = [];

  // Handle existing AGENTS.md
  if (existing.agentsMd !== null && !options.override) {
    const parsed = parseAgentsMd(existing.agentsMd, markerOptions);
    if (parsed.hasMarkers) {
      // Has markers - preserve repo block content
      const repoContent = extractRepoBlockContent(parsed);
      if (repoContent) {
        contentToMerge.push(repoContent);
      }
    } else {
      // No markers - treat entire content as repo-specific
      contentToMerge.push(existing.agentsMd.trim());
    }
  }

  // Handle existing CLAUDE.md content (merge into repo block)
  // Collect content from both locations, deduplicating identical content
  const claudeMdContents: string[] = [];

  // Process root CLAUDE.md
  if (existing.rootClaudeMd !== null && !options.override) {
    const stripped = stripAgentsReference(existing.rootClaudeMd);
    if (stripped) {
      claudeMdContents.push(stripped);
    }
  }

  // Process .claude/CLAUDE.md (deduplicate if same content)
  if (existing.dotClaudeClaudeMd !== null && !options.override) {
    const stripped = stripAgentsReference(existing.dotClaudeClaudeMd);
    if (stripped && !claudeMdContents.includes(stripped)) {
      claudeMdContents.push(stripped);
    }
  }

  // Add CLAUDE.md contents to merge
  for (const content of claudeMdContents) {
    contentToMerge.push(content);
  }

  // Build final repo content
  const repoContent = contentToMerge.length > 0 ? contentToMerge.join("\n\n") : null;
  const content = buildAgentsMd(globalContent, repoContent, {}, markerOptions);

  const hadRootClaudeMd = existing.rootClaudeMd !== null;
  const hadDotClaudeClaudeMd = existing.dotClaudeClaudeMd !== null;
  const merged =
    !options.override && (existing.agentsMd !== null || hadRootClaudeMd || hadDotClaudeClaudeMd);
  const preservedRepoContent = contentToMerge.length > 0;

  return {
    content,
    merged,
    preservedRepoContent,
    mergedClaudeMdContent: claudeMdContents.length > 0 ? claudeMdContents.join("\n\n") : null,
    hadRootClaudeMd,
    hadDotClaudeClaudeMd,
  };
}

export async function writeAgentsMd(targetDir: string, content: string): Promise<void> {
  const agentsMdPath = path.join(targetDir, "AGENTS.md");
  await fs.writeFile(agentsMdPath, content, "utf-8");
}

/**
 * Consolidate CLAUDE.md files to a single .claude/CLAUDE.md with @../AGENTS.md reference.
 * Content from any existing CLAUDE.md files should already be merged into AGENTS.md.
 * This function:
 * 1. Creates/updates .claude/CLAUDE.md with @../AGENTS.md reference
 * 2. Deletes root CLAUDE.md if it existed
 */
export async function consolidateClaudeMd(
  targetDir: string,
  hadRootClaudeMd: boolean,
): Promise<ConsolidateClaudeMdResult> {
  const rootPath = path.join(targetDir, "CLAUDE.md");
  const dotClaudePath = path.join(targetDir, ".claude", "CLAUDE.md");
  const reference = "@../AGENTS.md";

  // Ensure .claude directory exists
  await fs.mkdir(path.dirname(dotClaudePath), { recursive: true });

  // Create or update .claude/CLAUDE.md
  const existing = await readFileIfExists(dotClaudePath);
  let created = false;
  let updated = false;

  if (existing === null) {
    await fs.writeFile(dotClaudePath, `${reference}\n`, "utf-8");
    created = true;
  } else if (!existing.includes(reference)) {
    await fs.writeFile(dotClaudePath, `${reference}\n`, "utf-8");
    updated = true;
  }

  // Delete root CLAUDE.md if it existed
  let deletedRootClaudeMd = false;
  if (hadRootClaudeMd) {
    try {
      await fs.unlink(rootPath);
      deletedRootClaudeMd = true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  return { created, updated, deletedRootClaudeMd };
}
