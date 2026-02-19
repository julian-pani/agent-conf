# Module Organization Report

**Date:** 2026-02-12
**Scope:** `cli/src/` -- all TypeScript source modules
**Previous audit:** 2026-02-06

---

## Executive Summary

The recent refactoring (renaming `skill-metadata.ts` to `managed-content.ts` and extracting `frontmatter.ts`) has significantly improved the codebase. The module structure is largely well-organized. This audit identifies 5 naming issues, 4 misplaced utilities, 2 SRP violations, and maps high fan-in modules to guide future refactoring.

---

## Naming Issues

| File | Problem | Recommendation |
|------|---------|----------------|
| `cli/src/core/managed-content.ts` | Name is accurate for the shared functions (`computeContentHash`, `isManaged`, `addManagedMetadata`) but the module still contains **skill-specific** logic: `SkillValidationError` (line 65), `validateSkillFrontmatter` (line 75), `checkSkillFiles` (line 244), `SkillFileCheckResult` (line 229). These are not "managed content" in general -- they are skill-specific. | Extract `validateSkillFrontmatter`, `SkillValidationError`, and `checkSkillFiles` into the sync pipeline (where skill sync already lives in `sync.ts`), or create a dedicated `cli/src/core/skills.ts` module to parallel `rules.ts` and `agents.ts`. |
| `cli/src/core/schema.ts` | Named generically "schema" but contains **only** schema versioning/compatibility logic (`checkSchemaCompatibility`, `SUPPORTED_SCHEMA_VERSION`). Naming collision risk with `cli/src/config/schema.ts` and `cli/src/schemas/lockfile.ts`. | Rename to `cli/src/core/schema-compat.ts` or `cli/src/core/schema-version.ts` to disambiguate from the config schema module. |
| `cli/src/config/schema.ts` | Contains both Zod schemas **and** utility functions (`getMarkers` at line 173, `getMetadataKeys` at line 186). The helper functions are not schemas; they are runtime helpers derived from config values. | Either (a) move `getMarkers` and `getMetadataKeys` into `cli/src/core/markers.ts` and `cli/src/core/managed-content.ts` respectively where they are consumed, or (b) extract to a `cli/src/config/helpers.ts` module. |
| `cli/src/commands/shared.ts` | Name "shared" is vague. The module specifically provides the **sync workflow orchestration** shared between `init` and `sync` commands: version resolution, source resolution, merge prompting, and the `performSync` output rendering. | Rename to `cli/src/commands/sync-shared.ts` or `cli/src/commands/sync-orchestration.ts` to clarify its purpose. |
| `cli/src/core/lockfile.ts` | Contains both lockfile I/O (`readLockfile`, `writeLockfile`) **and** CLI version utilities (`getCliVersion` at line 111, `checkCliVersionMismatch` at line 128, `hashContent` at line 106). `getCliVersion` is imported by `cli.ts` and `upgrade-cli.ts` -- it is not a lockfile concern. | Move `getCliVersion` and `checkCliVersionMismatch` to `cli/src/core/version.ts` (which already handles version logic) or a dedicated `cli/src/utils/cli-version.ts`. Move `hashContent` closer to its consumers or into a hashing utility. |

---

## Misplaced Utilities

| Function | Current Location | Recommended Location | Importers |
|----------|------------------|----------------------|-----------|
| `getMarkers(prefix)` | `cli/src/config/schema.ts` line 173 | `cli/src/core/markers.ts` (already re-exports it as `getMarkers` at line 21 via alias `getMarkersFromConfig`) | `cli/src/core/markers.ts` (sole consumer) |
| `getMetadataKeys(prefix)` | `cli/src/config/schema.ts` line 186 | `cli/src/core/managed-content.ts` (already wraps it as `getMetadataKeyNames` at line 31) | `cli/src/core/managed-content.ts` (sole consumer) |
| `getCliVersion()` | `cli/src/core/lockfile.ts` line 111 | `cli/src/core/version.ts` or `cli/src/utils/cli-version.ts` | `cli/src/cli.ts` line 10, `cli/src/commands/upgrade-cli.ts` line 4, `cli/src/core/lockfile.ts` (internal at line 97) |
| `hashContent(content)` | `cli/src/core/lockfile.ts` line 106 | `cli/src/core/managed-content.ts` or a shared `cli/src/utils/hash.ts` | `cli/src/core/lockfile.ts` (internal only, used at line 88) |

---

## SRP Violations

### 1. `cli/src/core/managed-content.ts` (621 lines) -- Multiple Content Type Responsibilities

This module handles **four distinct content types** despite its generic name:

| Responsibility | Lines | Functions |
|---------------|-------|-----------|
| Generic managed metadata (hash, strip, add, check) | 106-224 | `computeContentHash`, `stripManagedMetadata`, `addManagedMetadata`, `hasManualChanges`, `isManaged` |
| Skill-specific validation and checking | 64-100, 229-291 | `SkillValidationError`, `validateSkillFrontmatter`, `SkillFileCheckResult`, `checkSkillFiles` |
| Rule-specific checking | 297-349, 379-388 | `RuleFileCheckResult`, `checkRuleFiles` |
| Agent-specific checking | 393-452 | `AgentFileCheckResult`, `checkAgentFiles` |
| AGENTS.md checking (global block + rules section) | 457-608 | `checkAgentsMd`, `checkAgentsMdRulesSection`, `checkAllManagedFiles`, `getModifiedManagedFiles` |
| Frontmatter wrapper for backward compat | 48-60 | `parseFrontmatter` (wraps shared `parseFrontmatterShared`) |

**Recommendation:** The content-type-specific file checking functions (`checkSkillFiles`, `checkRuleFiles`, `checkAgentFiles`) are the check-command counterparts to the sync functions in `sync.ts`, `rules.ts`, and `agents.ts` respectively. Consider one of:
- (a) Colocate check logic with sync logic (add `checkRuleFiles` to `rules.ts`, etc.)
- (b) Keep `managed-content.ts` but rename check functions to make the orchestration role clearer

The skill validation (`validateSkillFrontmatter`) should be extracted since `rules.ts` and `agents.ts` each own their own validation.

### 2. `cli/src/commands/shared.ts` (842 lines) -- Orchestration + UI Rendering

This module combines:

| Responsibility | Lines | Functions |
|---------------|-------|-----------|
| Version resolution logic | 90-176 | `resolveVersion` |
| Source resolution logic | 178-229 | `resolveSource` |
| Interactive prompting | 231-319 | `promptMergeOrOverride`, `checkModifiedFilesBeforeSync` |
| Target validation | 49-60 | `parseAndValidateTargets` |
| Target directory resolution | 62-80 | `resolveTargetDirectory` |
| Full sync execution + console output rendering (460+ lines) | 338-841 | `performSync` |

The `performSync` function alone is 500+ lines and handles sync execution, orphan detection/prompting, validation error display, workflow sync, hook install, and summary output with detailed per-target rendering.

**Recommendation:** Extract the summary/output rendering into a `cli/src/commands/sync-output.ts` module. The `performSync` function would call a `renderSyncSummary(result)` function, reducing its size by roughly 400 lines.

---

## Dependency Analysis

### High Fan-In Modules (imported by 3+ other modules)

| Module | Importer Count | Importers |
|--------|---------------|-----------|
| `cli/src/utils/logger.ts` | 6 | `commands/shared.ts`, `commands/init.ts`, `commands/sync.ts`, `commands/config.ts`, `commands/upgrade-cli.ts`, `commands/canonical.ts` |
| `cli/src/config/schema.ts` | 5 | `config/loader.ts` (re-export via `config/index.ts`), `core/markers.ts`, `core/managed-content.ts`, `core/hooks.ts`, `core/workflows.ts`, `commands/canonical.ts` |
| `cli/src/core/lockfile.ts` | 4 | `cli.ts`, `commands/shared.ts`, `commands/check.ts`, `commands/upgrade-cli.ts`, `core/sync.ts` |
| `cli/src/core/managed-content.ts` | 3 | `commands/shared.ts`, `commands/check.ts`, `core/sync.ts`, `core/rules.ts`, `core/agents.ts` |
| `cli/src/core/frontmatter.ts` | 3 | `core/managed-content.ts`, `core/rules.ts`, `core/agents.ts` |
| `cli/src/core/markers.ts` | 3 | `commands/check.ts`, `core/managed-content.ts`, `core/merge.ts` |
| `cli/src/core/version.ts` | 3 | `commands/shared.ts`, `commands/sync.ts`, `commands/upgrade-cli.ts` |
| `cli/src/core/sync.ts` | 3 | `commands/shared.ts`, `commands/init.ts`, `commands/sync.ts` |
| `cli/src/utils/git.ts` | 3 | `cli.ts`, `commands/shared.ts`, `commands/canonical.ts` |
| `cli/src/core/targets.ts` | 2 | `commands/shared.ts`, `core/sync.ts` |
| `cli/src/schemas/lockfile.ts` | 3 | `core/lockfile.ts`, `core/sync.ts`, `core/merge.ts`, `core/source.ts` |

**Analysis:** The dependency graph is healthy. `utils/logger.ts` and `config/schema.ts` are appropriately high fan-in since they provide foundational utilities. The recently extracted `frontmatter.ts` has clean, appropriate usage by its three consumers.

### Import Alias Patterns

| Alias | File | Reason | Assessment |
|-------|------|--------|------------|
| `parseFrontmatter as parseFrontmatterShared` | `core/managed-content.ts` line 6, `core/rules.ts` line 2, `core/agents.ts` line 1 | Each module wraps the shared parser with a type-specific local `parseFrontmatter` | **Naming friction.** Three modules alias the same import the same way. The local wrappers in `rules.ts` and `agents.ts` add type casting only. Consider either (a) using the shared function directly with type assertions at call sites, or (b) renaming the shared function to `parseRawFrontmatter` to avoid collision. |
| `getMarkers as getMarkersFromConfig` | `core/markers.ts` line 2 | Re-exports the schema helper under the module's own `getMarkers` name | **Indirection smell.** `getMarkers` in `config/schema.ts` is only used by `markers.ts`. Move the implementation to `markers.ts` directly and remove the indirection. |

---

## Structural Assessment

### Directory Organization

| Directory | Purpose | Assessment |
|-----------|---------|------------|
| `commands/` | CLI command handlers | **Good.** Each command has its own file. `shared.ts` could be renamed. |
| `core/` | Business logic modules | **Good.** Well-factored after frontmatter extraction. Could benefit from a `skills.ts` to complete the content-type symmetry (rules.ts, agents.ts, skills.ts). |
| `config/` | Configuration schemas and loading | **Good.** Clean separation of schema definitions and loaders. Misplaced helpers (`getMarkers`, `getMetadataKeys`) should be relocated. |
| `utils/` | General-purpose utilities | **Good.** Each file has a clear domain (fs, git, logger, package-manager). |
| `schemas/` | Zod schemas for serialized data | **Adequate** but only contains `lockfile.ts`. Consider whether it should be merged into `config/` since `config/schema.ts` also defines Zod schemas. |

### Content Type Symmetry

The project manages three content types (skills, rules, agents). Currently:

| Content Type | Parsing/Metadata | Sync Logic | Check Logic |
|-------------|-----------------|------------|-------------|
| **Skills** | `managed-content.ts` (validate, addManagedMetadata) | `sync.ts` (syncSkillsToTarget, copySkillDirectory) | `managed-content.ts` (checkSkillFiles) |
| **Rules** | `rules.ts` (parseRule, addRuleMetadata) | `sync.ts` (syncRules, discoverRules) | `managed-content.ts` (checkRuleFiles) |
| **Agents** | `agents.ts` (parseAgent, addAgentMetadata) | `sync.ts` (syncAgents, discoverAgents) | `managed-content.ts` (checkAgentFiles) |

The asymmetry is that skills lack a dedicated module while rules and agents each have one. The check logic for all three is centralized in `managed-content.ts`.

---

## Refactoring Plan

### Priority 1: Low-Risk Naming Fixes

**Step 1: Rename `core/schema.ts` to `core/schema-compat.ts`**
- Rename file: `cli/src/core/schema.ts` -> `cli/src/core/schema-compat.ts`
- Update imports in:
  - `cli/src/core/lockfile.ts` line 10

**Step 2: Rename `commands/shared.ts` to `commands/sync-shared.ts`**
- Rename file: `cli/src/commands/shared.ts` -> `cli/src/commands/sync-shared.ts`
- Update imports in:
  - `cli/src/commands/init.ts` lines 6-15
  - `cli/src/commands/sync.ts` lines 6-15

### Priority 2: Relocate Misplaced Utilities

**Step 3: Move `getMarkers` from `config/schema.ts` to `core/markers.ts`**
- Move the `getMarkers` function body (lines 173-180) from `cli/src/config/schema.ts` to `cli/src/core/markers.ts`
- Remove the aliased import in `cli/src/core/markers.ts` line 2
- Remove `getMarkers` export from `cli/src/config/schema.ts`
- No other files import `getMarkers` from config/schema directly

**Step 4: Move `getMetadataKeys` from `config/schema.ts` to `core/managed-content.ts`**
- Move the `getMetadataKeys` function body (lines 186-193) from `cli/src/config/schema.ts` to `cli/src/core/managed-content.ts`
- Remove the import in `cli/src/core/managed-content.ts` line 5
- Inline the call in `getMetadataKeyNames` or merge the two functions
- Remove `getMetadataKeys` export from `cli/src/config/schema.ts`
- No other files import `getMetadataKeys` from config/schema directly

**Step 5: Move `getCliVersion` from `core/lockfile.ts` to `core/version.ts`**
- Move `getCliVersion` (line 111-113) and the `__BUILD_VERSION__` declare (line 13) to `cli/src/core/version.ts`
- Update imports in:
  - `cli/src/cli.ts` line 10 (change from `./core/lockfile.js` to `./core/version.js`)
  - `cli/src/commands/upgrade-cli.ts` line 4 (change from `../core/lockfile.js` to `../core/version.js`)
  - `cli/src/core/lockfile.ts` (add internal import from `./version.js`)

### Priority 3: SRP Improvements (Larger Changes)

**Step 6: Create `core/skills.ts` for skill-specific logic**
- Extract from `cli/src/core/managed-content.ts`:
  - `SkillValidationError` interface (line 65)
  - `validateSkillFrontmatter` function (line 75)
  - `SkillFileCheckResult` interface (line 229)
  - `checkSkillFiles` function (line 244)
- New file: `cli/src/core/skills.ts`
- Update imports in:
  - `cli/src/core/sync.ts` lines 18-19 (import from `./skills.js` instead of `./managed-content.js`)
  - `cli/src/core/managed-content.ts` (import `checkSkillFiles` from `./skills.js` to use in `checkAllManagedFiles`)

**Step 7: Resolve `parseFrontmatter` aliasing**
- Rename `parseFrontmatter` in `cli/src/core/frontmatter.ts` to `parseRawFrontmatter`
- The local wrapper functions in `managed-content.ts`, `rules.ts`, and `agents.ts` can then be named `parseFrontmatter` without aliasing
- Update imports in all three files (remove `as parseFrontmatterShared` alias)

**Step 8: Extract sync output rendering from `commands/shared.ts`**
- Create `cli/src/commands/sync-output.ts` with a `renderSyncSummary()` function
- Move lines ~454-831 of `performSync` (all the console.log rendering) into this new module
- `performSync` would call `renderSyncSummary(result, options)` and return
- This reduces `commands/shared.ts` from 842 lines to ~450 lines

### Priority 4: Nice-to-Have Cleanup

**Step 9: Consolidate `schemas/` into `config/`**
- Move `cli/src/schemas/lockfile.ts` to `cli/src/config/lockfile-schema.ts`
- Remove the `schemas/` directory
- Update imports in:
  - `cli/src/core/lockfile.ts` line 4-9
  - `cli/src/core/sync.ts` line 5
  - `cli/src/core/merge.ts` line 3
  - `cli/src/core/source.ts` line 7

---

## Positive Observations

1. **`frontmatter.ts` extraction was well-executed.** The shared parsing module is cleanly consumed by three modules with consistent patterns.

2. **`managed-content.ts` rename was appropriate.** The generic managed content operations (hash computation, metadata stripping, managed check) are correctly domain-neutral.

3. **`rules.ts` and `agents.ts` are well-structured.** Each owns parsing, validation, metadata addition, and section generation for their content type. They follow an identical structural pattern.

4. **Utility placement is mostly correct.** `utils/fs.ts`, `utils/git.ts`, `utils/logger.ts`, and `utils/package-manager.ts` each have a clear, single domain.

5. **No circular dependencies detected.** The dependency graph flows cleanly: `commands/ -> core/ -> config/schemas/`, with `utils/` as a leaf dependency.

6. **The `config/index.ts` barrel export** keeps the public API clean for config consumers.

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total source files | 32 |
| Total lines of code (approx) | ~5,800 |
| Naming issues found | 5 |
| Misplaced utilities | 4 |
| SRP violations | 2 |
| Modules with 3+ importers | 11 |
| Aliased imports suggesting friction | 4 |
| Circular dependencies | 0 |
| Largest file | `commands/shared.ts` (842 lines) |
| Second largest file | `core/managed-content.ts` (621 lines) |
