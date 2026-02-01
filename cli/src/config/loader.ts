import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import { type CanonicalRepoConfig, CanonicalRepoConfigSchema } from "./schema.js";

// Config file names
const CANONICAL_REPO_CONFIG = "agent-conf.yaml";

/**
 * Load canonical repository config (agent-conf.yaml).
 * Returns undefined if file doesn't exist.
 */
export async function loadCanonicalRepoConfig(
  basePath: string,
): Promise<CanonicalRepoConfig | undefined> {
  const configPath = path.join(basePath, CANONICAL_REPO_CONFIG);

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parseYaml(content);
    return CanonicalRepoConfigSchema.parse(parsed);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw new Error(`Failed to load ${CANONICAL_REPO_CONFIG}: ${error}`);
  }
}

// Type guard for Node.js errors with code property
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
