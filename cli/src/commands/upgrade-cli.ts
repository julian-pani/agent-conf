import { execSync } from "node:child_process";
import fs from "node:fs";
import * as prompts from "@clack/prompts";
import pc from "picocolors";
import { getCliVersion } from "../core/lockfile.js";
import { compareVersions } from "../core/version.js";
import { createLogger } from "../utils/logger.js";
import {
  buildInstallCommand,
  detectPackageManager,
  type PackageManager,
} from "../utils/package-manager.js";

const NPM_PACKAGE_NAME = "agconf";

export interface UpgradeCliOptions {
  yes?: boolean;
  packageManager?: string;
}

/**
 * Fetches the latest version from the npm registry.
 */
async function getLatestNpmVersion(): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`);

  if (!response.ok) {
    throw new Error(`Failed to fetch package info: ${response.statusText}`);
  }

  const data = (await response.json()) as { version: string };
  return data.version;
}

export async function upgradeCliCommand(options: UpgradeCliOptions): Promise<void> {
  const logger = createLogger();
  const currentVersion = getCliVersion();

  console.log();
  prompts.intro(pc.bold("agconf upgrade-cli"));

  // Check for updates
  const spinner = logger.spinner("Checking for CLI updates...");
  spinner.start();

  let latestVersion: string;
  try {
    latestVersion = await getLatestNpmVersion();
    spinner.stop();
  } catch (error) {
    spinner.fail("Failed to check for CLI updates");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Display version info
  console.log();
  console.log(`Current version: ${pc.cyan(currentVersion)}`);
  console.log(`Latest version:  ${pc.cyan(latestVersion)}`);

  // Check if update is needed
  const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;

  if (!needsUpdate) {
    console.log();
    prompts.outro(pc.green("CLI is already up to date!"));
    return;
  }

  console.log();
  console.log(`${pc.yellow("→")} Update available: ${currentVersion} → ${latestVersion}`);

  // Detect package manager
  const validPms: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];
  let pm: ReturnType<typeof detectPackageManager>;

  if (options.packageManager) {
    const pmName = options.packageManager as PackageManager;
    if (!validPms.includes(pmName)) {
      logger.error(`Invalid package manager: ${options.packageManager}`);
      logger.info(`Valid options: ${validPms.join(", ")}`);
      process.exit(1);
    }
    pm = {
      name: pmName,
      installCommand: buildInstallCommand(pmName, NPM_PACKAGE_NAME),
      detectedVia: "--package-manager flag",
    };
  } else {
    pm = detectPackageManager(NPM_PACKAGE_NAME);
  }

  console.log(`Package manager: ${pc.cyan(pm.name)} (${pm.detectedVia})`);
  console.log();

  // Confirm update
  if (!options.yes) {
    const shouldUpdate = await prompts.confirm({
      message: "Proceed with CLI upgrade?",
      initialValue: true,
    });

    if (prompts.isCancel(shouldUpdate) || !shouldUpdate) {
      prompts.cancel("Upgrade cancelled");
      process.exit(0);
    }
  }

  // Perform upgrade
  const installSpinner = logger.spinner("Upgrading CLI...");
  installSpinner.start();

  try {
    execSync(pm.installCommand, {
      stdio: "pipe",
    });
    installSpinner.succeed("CLI upgraded");
  } catch (error) {
    installSpinner.fail("Upgrade failed");
    logger.error(error instanceof Error ? error.message : String(error));
    logger.info(`\nYou can try manually: ${pm.installCommand}`);
    const otherPms = validPms.filter((p) => p !== pm.name);
    logger.info(
      `If ${pm.name} is not your package manager, try: agconf upgrade-cli --package-manager <${otherPms.join("|")}>`,
    );
    process.exit(1);
  }

  // Post-install verification: confirm the binary in $PATH is actually updated
  let installedVersion: string | null = null;
  try {
    installedVersion = execSync("agconf --version", { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    // If we can't run agconf --version, skip verification
  }

  if (installedVersion && installedVersion !== latestVersion) {
    console.log();
    logger.warn(
      `Version mismatch: installed ${latestVersion} but the agconf binary in $PATH is still ${installedVersion}`,
    );

    // Check if running under a tool manager like Volta
    const binPath = process.argv[1];
    let resolvedPath: string | null = null;
    try {
      resolvedPath = binPath ? fs.realpathSync(binPath) : null;
    } catch {
      // ignore
    }

    if (resolvedPath?.includes("/.volta/")) {
      logger.info(`Volta detected. Run: ${pc.cyan("volta install agconf@latest")}`);
    } else if (resolvedPath?.includes("/.asdf/")) {
      logger.info(`asdf detected. Run: ${pc.cyan("asdf reshim nodejs")}`);
    } else if (resolvedPath?.includes("/.mise/") || resolvedPath?.includes("/.local/share/mise/")) {
      logger.info(`mise detected. Run: ${pc.cyan("mise reshim")}`);
    } else {
      logger.info(
        "Your tool manager may be shimming the binary. Check its docs to update global packages.",
      );
    }

    console.log();
    prompts.outro(pc.yellow("Upgrade installed but not active in $PATH"));
  } else {
    console.log();
    prompts.outro(pc.green(`CLI upgraded to ${latestVersion}!`));
  }
}
