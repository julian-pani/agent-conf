# Documentation Audit Report

**Audit date**: 2026-02-12
**Last audit**: 2026-02-06
**CLI version**: 0.11.2

---

## Code Documentation

### Well-Documented

The core modules have strong JSDoc/TSDoc coverage. Of ~141 exported symbols across `cli/src/core/`, there are ~208 JSDoc comment blocks -- exceeding a 1:1 ratio, meaning nearly every export and many internal functions are documented.

**Excellent JSDoc coverage:**

| File | JSDoc Blocks | Exports | Notes |
|------|-------------|---------|-------|
| `cli/src/core/markers.ts` | 24 | 23 | Comprehensive: every function and interface documented |
| `cli/src/core/managed-content.ts` | 47 | 19 | Thorough: every function, interface, and option documented |
| `cli/src/core/workflows.ts` | 37 | 22 | Module-level doc, all functions documented |
| `cli/src/core/rules.ts` | 16 | 8 | Strong: includes @param and @returns tags |
| `cli/src/core/agents.ts` | 17 | 6 | Strong: includes @param and @returns, interface fields documented |
| `cli/src/core/hooks.ts` | 10 | 6 | Good coverage with interface field docs |
| `cli/src/core/sync.ts` | 17 | 17 | Good: all exports documented |
| `cli/src/core/frontmatter.ts` | 10 | 3 | Excellent: module-level doc, @example tags, detailed parameter descriptions |
| `cli/src/core/version.ts` | 9 | 6 | Good: all exports documented, module-level doc |
| `cli/src/core/lockfile.ts` | 5 | 9 | Adequate but could add docs to `hashContent`, `getLockfilePath` |
| `cli/src/core/schema.ts` | 6 | 3 | Adequate |
| `cli/src/config/schema.ts` | 41 | 16 | Thorough: Zod schemas with inline comments |
| `cli/src/commands/completion.ts` | Multiple | Multiple | Good: all exported functions documented |

### Needs Documentation

**Utility files have poor JSDoc coverage:**

| File | JSDoc Blocks | Exports | Issue |
|------|-------------|---------|-------|
| `cli/src/utils/logger.ts` | 0 | 3 | No JSDoc on any exports (`createLogger`, `formatPath`, etc.) |
| `cli/src/utils/fs.ts` | 0 | 6 | No JSDoc on exports (`directoryExists`, `fileExists`, `ensureDir`, etc.) |
| `cli/src/utils/git.ts` | 4 | 4 | Has JSDoc but not on all exports |
| `cli/src/utils/package-manager.ts` | 5 | 7 | Partial coverage |

**Command files lack JSDoc:**

| File | Issue |
|------|-------|
| `cli/src/commands/init.ts` | Main `initCommand` function not documented |
| `cli/src/commands/sync.ts` | Main `syncCommand` function not documented |
| `cli/src/commands/check.ts` | Main `checkCommand` function not documented |
| `cli/src/commands/config.ts` | Config subcommands not documented |
| `cli/src/commands/canonical.ts` | Internal functions documented, but `canonicalInitCommand` export lacks JSDoc |
| `cli/src/commands/shared.ts` | Not inspected |

**`cli/src/core/targets.ts`**: Only 2 JSDoc blocks for 7 exports. `parseTargets`, `getTargetConfig`, `isValidTarget`, and the `TARGET_CONFIGS` constant lack documentation.

**`cli/src/core/merge.ts`**: Only 3 JSDoc blocks for 6 exports. `mergeAgentsMd`, `writeAgentsMd` lack documentation despite being critical functions.

---

## CLI Documentation

### Command/Option Coverage

Cross-referencing `cli/src/cli.ts` (the source of truth for commands) against documentation:

#### `canonical update` command: DOCUMENTED BUT DOES NOT EXIST IN CODE

**Critical finding.** The root `README.md` documents `canonical update` extensively (lines 219-232) with options like `--cli-version`, but:
- There is no `canonical update` subcommand registered in `cli/src/cli.ts`
- There is no `canonicalUpdateCommand` function anywhere in the codebase
- The `--cli-version` option referenced in docs for `canonical init` also does not exist in code
- `cli/README.md` commands table lists `canonical update` (line 27)
- `AGENTS.md` lists "canonical (init, update)" in the Commands section (line 54)
- `cli/docs/CANONICAL_REPOSITORY_SETUP.md` references `agconf canonical update` (lines 350-356)

**Affected files:**
- `/Users/julianpani/personal/code/agent-conf/README.md` (lines 219-232)
- `/Users/julianpani/personal/code/agent-conf/cli/README.md` (line 27)
- `/Users/julianpani/personal/code/agent-conf/AGENTS.md` (line 54)
- `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md` (lines 350-356)

#### Shell Completions Gaps

`cli/src/commands/completion.ts` completions are missing several options that exist in the actual CLI:

| Command | Missing from Completions |
|---------|------------------------|
| `sync` | `--pinned`, `--summary-file`, `--expand-changes` |
| `canonical` | `update` subcommand (listed in `CANONICAL_SUBCOMMANDS` as only `["init"]`) |

**Affected file:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/completion.ts` (line 64)

#### `check --debug` option

The `--debug` option exists in `cli/src/cli.ts` (line 117) but is not documented in:
- Root `README.md` (`agconf check` section, line 170-181) -- only mentions `--quiet`
- `cli/docs/CHECK_FILE_INTEGRITY.md` (line 59-69) -- only documents `--quiet`

**Affected files:**
- `/Users/julianpani/personal/code/agent-conf/README.md`
- `/Users/julianpani/personal/code/agent-conf/cli/docs/CHECK_FILE_INTEGRITY.md`

#### `upgrade-cli --package-manager` option

The `-p, --package-manager` option exists in `cli/src/cli.ts` (line 126-128) but is not documented in the root README's `agconf upgrade-cli` section (lines 183-193).

**Affected file:** `/Users/julianpani/personal/code/agent-conf/README.md`

#### Codex vs GitHub Copilot naming inconsistency

The codebase uses "codex" as the target name in code (`cli/src/core/targets.ts`: `SUPPORTED_TARGETS = ["claude", "codex"]`), but the CLI README refers to it as "GitHub Copilot" in user-facing text. The root README uses "Codex" (line 82 in the command table). This creates confusion about what "codex" means -- is it OpenAI's Codex or GitHub Copilot?

The AGENTS.md and root README use "Codex" consistently in the target context. The CLI README uses "GitHub Copilot" (lines 55, 59, 73). This discrepancy should be reconciled.

**Affected files:**
- `/Users/julianpani/personal/code/agent-conf/cli/README.md` (lines 55, 59, 73)
- `/Users/julianpani/personal/code/agent-conf/AGENTS.md` (uses "Codex" throughout)

#### Complete Command Option Audit

| Command | CLI Options | Documented in README | Missing |
|---------|------------|---------------------|---------|
| `init` | `-s`, `--local`, `-y`, `--override`, `--ref`, `-t` | All present | None |
| `sync` | `-s`, `--local`, `-y`, `--override`, `--ref`, `--pinned`, `-t`, `--summary-file`, `--expand-changes` | All present | None |
| `check` | `-q`, `--debug` | Only `-q` | `--debug` |
| `upgrade-cli` | `-y`, `-p` | Only `-y` | `-p, --package-manager` |
| `canonical init` | `-n`, `-o`, `-d`, `--marker-prefix`, `--no-examples`, `--rules-dir`, `-y` | All present except `--cli-version` is documented but does not exist | `--cli-version` documented but nonexistent |
| `canonical update` | DOES NOT EXIST | Documented | Entire command is phantom |
| `config` | `show`, `get`, `set` | Present | None |
| `completion` | `install`, `uninstall` | Present | None |

---

## User Documentation

### Existing Guides

| Guide | Location | Status |
|-------|----------|--------|
| Canonical Repository Setup | `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md` | Good; comprehensive with GitHub App auth section added since last audit. References phantom `canonical update` command. |
| Downstream Repository Configuration | `/Users/julianpani/personal/code/agent-conf/cli/docs/DOWNSTREAM_REPOSITORY_CONFIGURATION.md` | Good; complete coverage of downstream config options |
| Versioning | `/Users/julianpani/personal/code/agent-conf/cli/docs/VERSIONING.md` | Good; comprehensive versioning docs. Minor inconsistency: line 158 says "Workflow files are generated without CLI version pinning" and shows `npm install -g agconf` but the canonical init code actually generates `npm install -g agconf` (unpinned), which matches. However, earlier in the doc at line 344 of CANONICAL_REPOSITORY_SETUP.md, it shows `npm install -g agconf@1.2.0` (pinned), which contradicts the actual generated code. |
| File Integrity Checking | `/Users/julianpani/personal/code/agent-conf/cli/docs/CHECK_FILE_INTEGRITY.md` | Good; accurate. Missing `--debug` option. |
| Contributing | `/Users/julianpani/personal/code/agent-conf/cli/CONTRIBUTING.md` | Good; comprehensive |
| Security | `/Users/julianpani/personal/code/agent-conf/cli/SECURITY.md` | Adequate |

### Missing Guides

1. **Migration/Upgrade guide**: No documentation on how to migrate between CLI major versions or handle breaking changes. The VERSIONING.md mentions schema version bumps but does not provide a step-by-step migration guide.

2. **Troubleshooting guide (consolidated)**: Troubleshooting sections are scattered across CANONICAL_REPOSITORY_SETUP.md (line 631), CHECK_FILE_INTEGRITY.md (line 229), and VERSIONING.md (line 222). A consolidated troubleshooting guide or a dedicated `cli/docs/TROUBLESHOOTING.md` would help users find solutions faster.

3. **Agent (sub-agent) authoring guide**: The canonical repo setup doc covers agents briefly, but there is no guide for writing effective agents with tips on frontmatter fields beyond `name`/`description` (e.g., `tools`, `model`, `memory`, `skills`, `context`, `argument-hint`). The project's own `.claude/agents/` files demonstrate these fields but there is no user-facing documentation about them.

4. **Rules authoring guide**: Similar to agents -- the docs explain rules setup but not best practices for writing effective rules, structuring subdirectories, or using the `paths` frontmatter field effectively.

---

## Architecture Documentation

### AGENTS.md

**Location:** `/Users/julianpani/personal/code/agent-conf/AGENTS.md`

**Status:** Good overall, with one critical issue.

**Accurate sections:**
- Project Overview
- Repository Structure
- Development Commands
- Architecture (Core Modules, Commands, Configuration)
- Key Patterns (File markers, Lockfile pinning, Merge strategy, Target support, Downstream config)
- Rules Sync
- Agents Sync
- Commit Conventions
- CI/CD
- Important Guidelines (CLI Command Changes, Testing Requirements, Check Command Integrity, Content Hash Consistency, Parallel Worktrees)

**Issues found:**

1. **Phantom `canonical update` command** (line 54): Lists "canonical (init, update)" but `update` does not exist in code.

2. **Missing `frontmatter.ts` from Core Modules list** (line 42-51): The `frontmatter.ts` module is a shared utility used by skills, rules, and agents but is not listed in the Architecture section.

3. **Missing `agents.ts` from Core Modules list** (line 42-51): The `agents.ts` core module handles agent parsing, validation, and metadata but is not listed. (It IS documented in the "Agents Sync" subsection but not in the initial module list.)

4. **Missing `schema.ts` and `version.ts` from Core Modules list**: These provide schema compatibility checking and GitHub release version management respectively.

5. **`config/` section says "Zod schemas"** (line 57) but does not mention the `loader.ts` file which handles loading both canonical and downstream configs. The downstream config loader (`loadDownstreamConfig`) is mentioned in the Downstream Config subsection but not linked to `config/loader.ts` explicitly.

### CONTRIBUTING.md

**Location:** `/Users/julianpani/personal/code/agent-conf/cli/CONTRIBUTING.md`

**Status:** Good. Well-structured with development setup, code style, testing, commit conventions, releases, and PR process.

**Minor issues:**

1. **Code of Conduct link** (line 25): References `CODE_OF_CONDUCT.md` but this file does not exist in the repository.
2. **`pnpm lint` and `pnpm format` commands** (lines 88-90): Listed in CONTRIBUTING.md but these are not defined as separate scripts. Only `pnpm check` and `pnpm check:fix` exist. Should verify in `package.json`.

---

## README Assessment

### Root README (`/Users/julianpani/personal/code/agent-conf/README.md`)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Project name and description | PASS | Clear one-liner and badges |
| Quick start | PASS | 3-step process well-documented |
| Command summary table | PASS | All real commands listed (plus phantom `canonical update`) |
| Detailed command docs | PASS | Each command has options documented |
| Installation | PASS | npm, source (SSH), and gh CLI methods |
| Architecture diagram | PASS | ASCII diagram showing canonical/downstream flow |
| Versioning section | PASS | Clear table of version strategies |
| Files created section | PASS | Table of downstream files |
| AGENTS.md structure | PASS | Shows marker format |
| Git hook integration | PASS | Pre-commit hook documented |
| CI/CD integration | PASS | Reusable workflows explained |
| FAQ | PASS | Good comparison questions addressed |
| Development section | PASS | Basic dev commands |
| Requirements | PASS | Node 20+, Git, pnpm |
| License | PASS | MIT |
| Length | WARNING | ~451 lines -- borderline long per documentation-standards skill guidance. Some sections (e.g., the full `canonical init` directory structure at lines 237-253, the entire CI/CD prerequisites section, the full FAQ) could be moved to docs/ |

### CLI README (`/Users/julianpani/personal/code/agent-conf/cli/README.md`)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Project name and description | PASS | Concise |
| Documentation links | PASS | Links to all docs/ files |
| Command table | PASS | Brief with examples (lists phantom `canonical update`) |
| Quick start | PASS | 2-step process |
| CLAUDE.md handling | PASS | Well-explained |
| Rules section | PASS | Links to canonical setup doc |
| Agents section | PASS | Good coverage |
| Downstream config | PASS | Links to dedicated doc |
| Length | PASS | ~109 lines -- appropriately concise for a sub-package README |

---

## Stale Documentation

### Critical Staleness

1. **`canonical update` command documentation** -- Documented in 4 files but does not exist in code. Either the command was removed/never implemented, or it needs to be implemented. This is the most significant documentation-code mismatch.

   - Root README lines 219-232
   - CLI README line 27
   - AGENTS.md line 54
   - cli/docs/CANONICAL_REPOSITORY_SETUP.md lines 350-356

2. **`--cli-version` option for `canonical init`** -- Root README line 217 documents `--cli-version 1.2.0` as an option for `canonical init`, but this option does not exist in the code (`cli/src/cli.ts` lines 192-218). CANONICAL_REPOSITORY_SETUP.md line 344 also shows `npm install -g agconf@1.2.0` (pinned) but the generated workflow actually uses unpinned `npm install -g agconf`.

### Minor Staleness

3. **VERSIONING.md line 158 vs CANONICAL_REPOSITORY_SETUP.md line 344**: VERSIONING.md correctly shows unpinned installation (`npm install -g agconf`). CANONICAL_REPOSITORY_SETUP.md line 344 shows pinned installation (`npm install -g agconf@1.2.0`). The actual generated code (in `canonical.ts` line 279) uses unpinned: `npm install -g agconf`. The CANONICAL_REPOSITORY_SETUP.md is stale.

4. **VERSIONING.md lockfile example** (line 197): Shows `"version": "1.0.0"` which should be verified against the actual `CURRENT_LOCKFILE_VERSION` constant.

5. **Completion file `CANONICAL_SUBCOMMANDS`** (line 64): Only lists `["init"]` -- if `canonical update` is intended to exist, this needs updating. If it is not intended, the documentation needs cleaning.

---

## Skills and Agents Assessment

### Skills

| Skill | Location | Status |
|-------|----------|--------|
| code-review | `/Users/julianpani/personal/code/agent-conf/.claude/skills/code-review/SKILL.md` | Good; comprehensive review checklist |
| codebase-audit | `/Users/julianpani/personal/code/agent-conf/.claude/skills/codebase-audit/SKILL.md` | Excellent; detailed 5-step workflow with sub-agent specs |
| documentation-standards | `/Users/julianpani/personal/code/agent-conf/.claude/skills/documentation-standards/SKILL.md` | Excellent; new since last audit, comprehensive standards |
| plan-review | `/Users/julianpani/personal/code/agent-conf/.claude/skills/plan-review/SKILL.md` | Excellent; 3-dimension review with doc-planner integration |

### Agents

| Agent | Location | Status |
|-------|----------|--------|
| doc-planner | `/Users/julianpani/personal/code/agent-conf/.claude/agents/doc-planner.md` | Excellent; new since last audit, 7-step planning workflow with memory support |
| doc-reviewer | `/Users/julianpani/personal/code/agent-conf/.claude/agents/doc-reviewer.md` | Excellent; new since last audit, 7-step review workflow with memory support |

Both agents properly reference the `documentation-standards` skill in their frontmatter. The doc-planner and doc-reviewer complement each other well (planning vs execution). Both use `memory: project` for cross-session learning.

---

## Recommendations

### Priority 1: Critical (Fix immediately)

1. **Resolve `canonical update` phantom command**: Either implement the command or remove all references from documentation. Files to update:
   - `/Users/julianpani/personal/code/agent-conf/README.md`
   - `/Users/julianpani/personal/code/agent-conf/cli/README.md`
   - `/Users/julianpani/personal/code/agent-conf/AGENTS.md`
   - `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md`
   - `/Users/julianpani/personal/code/agent-conf/cli/src/commands/completion.ts`

2. **Remove `--cli-version` documentation**: This option does not exist for `canonical init`. Remove from:
   - `/Users/julianpani/personal/code/agent-conf/README.md` (line 217)

### Priority 2: High (This sprint)

3. **Fix shell completions**: Add missing options to `cli/src/commands/completion.ts`:
   - `sync` command: add `--pinned`, `--summary-file`, `--expand-changes`
   - Per AGENTS.md guidelines: "When adding or modifying CLI commands, always update the shell completions"

4. **Document `check --debug` option**: Add to:
   - `/Users/julianpani/personal/code/agent-conf/README.md` (agconf check section)
   - `/Users/julianpani/personal/code/agent-conf/cli/docs/CHECK_FILE_INTEGRITY.md`

5. **Document `upgrade-cli --package-manager` option**: Add to:
   - `/Users/julianpani/personal/code/agent-conf/README.md` (agconf upgrade-cli section)

6. **Fix CLI version pinning inconsistency in CANONICAL_REPOSITORY_SETUP.md**: Line 344 shows pinned `agconf@1.2.0` but the generated code uses unpinned. Update to match actual behavior.

### Priority 3: Medium (Backlog)

7. **Add JSDoc to utility modules**: `cli/src/utils/logger.ts`, `cli/src/utils/fs.ts` have zero JSDoc coverage. These are internal but still warrant basic documentation.

8. **Add JSDoc to command entry points**: Each command's main exported function (`initCommand`, `syncCommand`, `checkCommand`, etc.) should have JSDoc describing parameters and behavior.

9. **Update AGENTS.md Core Modules list**: Add `frontmatter.ts`, `agents.ts`, `schema.ts`, `version.ts`, and `managed-content.ts` to the module list.

10. **Reconcile Codex/Copilot naming**: Decide whether the target is called "Codex" or "GitHub Copilot" in user-facing docs and be consistent.

11. **Fix CODE_OF_CONDUCT.md reference**: CONTRIBUTING.md references a file that does not exist. Either create it or remove the reference.

12. **Verify `pnpm lint` and `pnpm format` commands**: CONTRIBUTING.md lists these as separate commands; verify they exist in package.json or remove from docs.

### Priority 4: Low (Future)

13. **Create consolidated troubleshooting guide**: Gather scattered troubleshooting sections into a single `cli/docs/TROUBLESHOOTING.md`.

14. **Create agent/rule authoring guide**: Document advanced frontmatter fields (`tools`, `model`, `memory`, `skills`, `context`, `argument-hint` for agents; `paths` for rules) with examples.

15. **Consider splitting root README**: At ~451 lines, the root README is comprehensive but long. Consider moving the FAQ, detailed CI/CD prerequisites, and full canonical structure to docs/ with links from README.

---

## Summary

| Category | Health | Notes |
|----------|--------|-------|
| Code documentation (core) | Good | Strong JSDoc coverage in core modules |
| Code documentation (utils) | Poor | Most utility files lack JSDoc |
| CLI documentation | Fair | One phantom command, multiple undocumented options |
| User documentation | Good | Comprehensive guides exist; minor gaps |
| Architecture documentation | Good | AGENTS.md is thorough but has stale references |
| READMEs | Good | Both well-structured; root README is long |
| Skills | Excellent | All 4 skills well-documented with clear structure |
| Agents | Excellent | Both agents well-documented with memory integration |
| Staleness | **Needs attention** | Phantom `canonical update` is the primary issue |

**Overall documentation health:** Good, with one critical issue (phantom `canonical update` command) that should be resolved immediately, and several medium-priority gaps in CLI option documentation and JSDoc coverage.
