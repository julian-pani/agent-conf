import { execSync } from "node:child_process";
import fs from "node:fs";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface DetectionResult {
  name: PackageManager;
  installCommand: string;
  detectedVia: string;
}

/**
 * Build the global install command for a given package manager and package.
 */
export function buildInstallCommand(pm: PackageManager, packageName: string): string {
  switch (pm) {
    case "npm":
      return `npm install -g ${packageName}@latest`;
    case "pnpm":
      return `pnpm add -g ${packageName}@latest`;
    case "yarn":
      return `yarn global add ${packageName}@latest`;
    case "bun":
      return `bun install -g ${packageName}@latest`;
  }
}

/**
 * Tier 1: Check process.env.npm_config_user_agent.
 * Set when running via `npx`, `pnpm exec`, `yarn dlx`, etc.
 */
export function detectFromUserAgent(): PackageManager | null {
  const ua = process.env.npm_config_user_agent;
  if (!ua) return null;

  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("npm/")) return "npm";

  return null;
}

/**
 * Tier 2: Resolve the binary's real path and pattern-match.
 * Global installs leave distinctive path segments per PM.
 */
export function detectFromBinaryPath(): PackageManager | null {
  try {
    const binPath = process.argv[1];
    if (!binPath) return null;

    const realPath = fs.realpathSync(binPath);

    if (realPath.includes("/.pnpm-global/") || realPath.includes("/node_modules/.pnpm/")) {
      return "pnpm";
    }
    if (realPath.includes("/.bun/")) {
      return "bun";
    }
    if (realPath.includes("/.yarn/") || realPath.includes("/yarn/global/")) {
      return "yarn";
    }
  } catch {
    // realpathSync can fail if symlink is broken
  }

  return null;
}

/**
 * Tier 3: Compare binary path against `npm prefix -g` output.
 * This is slower (~100ms subprocess) so it's a last resort.
 */
export function detectFromNpmPrefix(): PackageManager | null {
  try {
    const binPath = process.argv[1];
    if (!binPath) return null;

    const realPath = fs.realpathSync(binPath);
    const npmPrefix = execSync("npm prefix -g", { encoding: "utf-8", stdio: "pipe" }).trim();

    if (realPath.startsWith(npmPrefix)) {
      return "npm";
    }
  } catch {
    // npm might not be installed or prefix command might fail
  }

  return null;
}

/**
 * Detect which package manager installed a globally-installed package.
 *
 * Tiered detection (fast to slow):
 * 1. process.env.npm_config_user_agent (free — covers npx/pnpm exec edge case)
 * 2. Pattern-match the resolved binary path (one syscall)
 * 3. Compare against `npm prefix -g` output (one subprocess)
 * 4. Default to npm as fallback
 */
export function detectPackageManager(packageName: string): DetectionResult {
  // Tier 1: env var
  const fromEnv = detectFromUserAgent();
  if (fromEnv) {
    return {
      name: fromEnv,
      installCommand: buildInstallCommand(fromEnv, packageName),
      detectedVia: "npm_config_user_agent",
    };
  }

  // Tier 2: binary path
  const fromPath = detectFromBinaryPath();
  if (fromPath) {
    return {
      name: fromPath,
      installCommand: buildInstallCommand(fromPath, packageName),
      detectedVia: "binary path",
    };
  }

  // Tier 3: npm prefix
  const fromPrefix = detectFromNpmPrefix();
  if (fromPrefix) {
    return {
      name: fromPrefix,
      installCommand: buildInstallCommand(fromPrefix, packageName),
      detectedVia: "npm global prefix",
    };
  }

  // Tier 4: fallback
  return {
    name: "npm",
    installCommand: buildInstallCommand("npm", packageName),
    detectedVia: "default",
  };
}
