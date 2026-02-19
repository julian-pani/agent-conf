import * as prompts from "@clack/prompts";
import pc from "picocolors";
import {
  type ApplyOptions,
  type ApplyResult,
  applyProposedChanges,
  detectProposedChanges,
  type ProposeResult,
} from "../core/propose.js";
import { formatSourceString } from "../core/source.js";

export interface ProposeCommandOptions {
  dryRun?: boolean | undefined;
  title?: string | undefined;
  message?: string | undefined;
  files?: string[] | undefined;
  yes?: boolean | undefined;
  cwd?: string | undefined;
}

export async function proposeCommand(options: ProposeCommandOptions = {}): Promise<void> {
  const targetDir = options.cwd ?? process.cwd();

  console.log();
  prompts.intro(pc.bold("agconf propose"));

  // Detect changes
  const spinner = prompts.spinner();
  spinner.start("Detecting changes to managed content...");

  let result: ProposeResult;
  try {
    result = await detectProposedChanges({
      cwd: targetDir,
      files: options.files,
    });
  } catch (error) {
    spinner.stop("Failed to detect changes");
    prompts.log.error(String(error));
    prompts.outro("Propose cancelled");
    process.exit(1);
  }

  if (result.changes.length === 0) {
    spinner.stop("No changes detected");
    prompts.log.info("No modified managed files found. Nothing to propose.");
    prompts.outro("Done");
    return;
  }

  spinner.stop(`Found ${result.changes.length} modified file(s)`);

  // Show changes
  prompts.log.info("Modified files:");
  for (const change of result.changes) {
    console.log(`  ${change.downstreamPath} ${pc.dim(`→ ${change.canonicalPath}`)}`);
  }

  console.log();
  prompts.log.info(`Canonical source: ${pc.cyan(formatSourceString(result.source))}`);

  if (options.dryRun) {
    prompts.outro("Dry run complete — no changes were made");
    return;
  }

  // Prompt for proposal title if not provided
  let title = options.title;
  if (!title && !options.yes) {
    const titleInput = await prompts.text({
      message: "Proposal title:",
      placeholder: "e.g. Update code review skill with new guidelines",
      validate: (value) => {
        if (!value.trim()) return "Title is required";
        return undefined;
      },
    });
    if (prompts.isCancel(titleInput)) {
      prompts.outro("Propose cancelled");
      return;
    }
    title = titleInput;
  }
  if (!title) {
    prompts.log.error("Title is required. Use --title or run interactively.");
    prompts.outro("Propose cancelled");
    process.exit(1);
  }

  // Prompt for message if not provided
  let message = options.message;
  if (!message && !options.yes) {
    const messageInput = await prompts.text({
      message: "Description (optional):",
      placeholder: "What changed and why?",
    });
    if (prompts.isCancel(messageInput)) {
      prompts.outro("Propose cancelled");
      return;
    }
    message = messageInput || undefined;
  }

  // Apply changes
  const applyOptions: ApplyOptions = {
    title,
    message,
  };

  spinner.start("Cloning canonical repository...");

  let applyResult: ApplyResult;
  try {
    applyResult = await applyProposedChanges(result, applyOptions);
  } catch (error) {
    spinner.stop("Failed");
    prompts.log.error(`Failed to apply changes: ${error}`);
    prompts.outro("Propose failed");
    process.exit(1);
  }

  if (!applyResult.pushed) {
    spinner.stop("Branch created locally");
    prompts.log.warn("Failed to push branch to remote.");
    console.log();
    console.log(pc.yellow("Run these commands manually to complete:"));
    console.log();
    console.log(pc.dim(applyResult.manualCommands));
    console.log();
    prompts.outro(`Branch: ${pc.cyan(applyResult.branch)}`);
    return;
  }

  if (applyResult.prUrl) {
    spinner.stop("PR created");
    prompts.log.success(`Branch: ${pc.cyan(applyResult.branch)}`);
    prompts.log.success(`PR: ${pc.cyan(applyResult.prUrl)}`);
    prompts.outro("Done!");
  } else if (applyResult.manualCommands) {
    spinner.stop("Branch pushed");
    prompts.log.success(`Branch: ${pc.cyan(applyResult.branch)}`);
    prompts.log.warn("Could not create PR automatically.");
    console.log();
    console.log(pc.yellow("Run this command to create the PR:"));
    console.log();
    console.log(pc.dim(applyResult.manualCommands));
    console.log();
    prompts.outro("Branch pushed successfully");
  } else {
    // Local source — no PR
    spinner.stop("Branch created");
    prompts.log.success(`Branch: ${pc.cyan(applyResult.branch)}`);
    prompts.log.info(`Clone directory: ${pc.dim(applyResult.cloneDir)}`);
    prompts.outro("Changes applied to canonical clone");
  }
}
