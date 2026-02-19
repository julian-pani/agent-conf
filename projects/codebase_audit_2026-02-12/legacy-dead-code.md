# Technical Debt Report

**Date**: 2026-02-12
**Scope**: `cli/src/` (all TypeScript source files)
**Previous audit**: 2026-02-06 (remediation commit 6acf9a8)

---

## Dead Code

### Unused Exported Functions (not imported by any source file)

1. **`updateWorkflowVersion`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:354`
   - Exported but never imported or called by any source file or test.
   - The `syncWorkflows` function has fully replaced its use; it handles both creation and updating of workflow files in a single pass.
   - **Action**: Remove the function or mark as `@internal` if kept for future use.

2. **`ensureWorkflowsDir`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:330`
   - Exported but only called internally by `writeWorkflow` in the same file.
   - Not imported by any test file.
   - **Action**: Remove the `export` keyword (make private/internal).

3. **`generateSyncWorkflow`** (in workflows.ts) -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:192`
   - Exported but only called internally by `generateWorkflow` in the same file.
   - Not imported by any external source file. (Note: `canonical.ts` has its own local `generateSyncWorkflow` function with a different signature.)
   - **Action**: Remove the `export` keyword.

4. **`generateCheckWorkflow`** (in workflows.ts) -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:272`
   - Same situation as `generateSyncWorkflow` -- exported but only called internally by `generateWorkflow`.
   - **Action**: Remove the `export` keyword.

5. **`extractWorkflowRef`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:161`
   - Exported but only called internally within `workflows.ts` (by `getWorkflowStatus` and `updateWorkflowVersion`).
   - **Action**: Remove the `export` keyword.

6. **`updateWorkflowRef`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:176`
   - Exported but only called internally within `workflows.ts` (by `updateWorkflowVersion`).
   - **Action**: Remove the `export` keyword.

7. **`buildGlobalBlock`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/markers.ts:95`
   - Exported but only called internally by `buildAgentsMd` in the same file.
   - Imported only by test files.
   - **Action**: Could remove the `export` keyword if tests are refactored to test through `buildAgentsMd`.

8. **`buildRepoBlock`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/markers.ts:121`
   - Exported but only called internally by `buildAgentsMd` in the same file.
   - Imported only by test files.
   - **Action**: Same as `buildGlobalBlock`.

### Unused Barrel File

9. **`config/index.ts`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/config/index.ts`
   - This barrel file re-exports everything from `./loader.js` and `./schema.js`, but no source file imports from `../config/index.js` or `../config`. All consumers import directly from `../config/loader.js` or `../config/schema.js`.
   - **Action**: Remove the barrel file entirely, or start importing from it consistently.

### Exported Schemas Only Used Internally

10. **`CanonicalMetaSchema`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/config/schema.ts:21`
    - Exported but never imported outside the file. Only used within `CanonicalRepoConfigSchema` in the same file.
    - **Action**: Remove the `export` keyword.

11. **`MarkersConfigSchema`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/config/schema.ts:41`
    - Exported but never imported outside the file.
    - **Action**: Remove the `export` keyword.

12. **`MergeConfigSchema`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/config/schema.ts:50`
    - Exported but never imported outside the file.
    - **Action**: Remove the `export` keyword.

### Exported Types Only Used Locally

13. **`LocalSourceOptions`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/source.ts:24`
    - Exported but only used as a parameter type for `resolveLocalSource` in the same file.
    - **Action**: Remove the `export` keyword.

14. **`GithubSourceOptions`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/source.ts:28`
    - Exported but only used as a parameter type for `resolveGithubSource` in the same file.
    - **Action**: Remove the `export` keyword.

15. **`MergeOptions`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/merge.ts:6`
    - Exported but only used as a parameter type for `mergeAgentsMd` in the same file.
    - **Action**: Remove the `export` keyword.

16. **`MergeResult`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/merge.ts:12`
    - Exported but only used as a return type for `mergeAgentsMd` in the same file.
    - **Action**: Remove the `export` keyword.

17. **`ConsolidateClaudeMdResult`** -- `/Users/julianpani/personal/code/agent-conf/cli/src/core/merge.ts:20`
    - Exported but only used as a return type for `consolidateClaudeMd` in the same file.
    - **Action**: Remove the `export` keyword.

---

## Deprecated Patterns

### 1. Inconsistent Error Handling for File-Not-Found

Two patterns are used interchangeably for detecting ENOENT:

**Pattern A** (type guard):
```typescript
// cli/src/config/loader.ts:59
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
```

**Pattern B** (direct cast):
```typescript
// cli/src/core/lockfile.ts:48
if ((error as NodeJS.ErrnoException).code === "ENOENT") {
```

**Pattern C** (empty catch with comment):
```typescript
// cli/src/core/sync.ts:83-86
try { await fs.access(rulesDir); }
catch { return []; }
```

The codebase mixes all three patterns. Pattern A (type guard) is the safest and most idiomatic.

**Action**: Standardize on Pattern A or create a shared `isFileNotFoundError` utility.

### 2. `WorkflowConfig` Type Name Collision

`/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:10` imports `WorkflowConfig` from schema and aliases it to `WorkflowConfigSchema`, then defines its own `WorkflowConfig` interface at line 53. This creates confusion.

**Action**: Rename one of the types. For example, rename `WorkflowConfig` in `workflows.ts` to `WorkflowGenerationConfig` to differentiate from the Zod schema type.

### 3. Metadata Prefix Conversion Pattern

The dash-to-underscore and underscore-to-dash conversions for metadata prefixes are scattered across files without a shared utility:

- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts:493` -- `markerPrefix.replace(/-/g, "_")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts:516` -- `markerPrefix.replace(/-/g, "_")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts:330` -- `metadataPrefix.replace(/_/g, "-")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/agents.ts:193` -- `metadataPrefix.replace(/_/g, "-")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts:125` -- `metadataPrefix.replace(/-/g, "_")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts:333` -- `(options.metadataPrefix || "agconf").replace(/-/g, "_")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/check.ts:90` -- `markerPrefix.replace(/-/g, "_")`
- `/Users/julianpani/personal/code/agent-conf/cli/src/config/schema.ts:188` -- `prefix.replace(/-/g, "_")`

**Action**: Create a shared `toDashPrefix(prefix)` / `toUnderscorePrefix(prefix)` utility and use it everywhere.

---

## Duplicated Code

### 1. `directoryExists` Duplicated Between `utils/fs.ts` and `utils/git.ts`

- `/Users/julianpani/personal/code/agent-conf/cli/src/utils/fs.ts:18-25` -- `directoryExists(dirPath)`
- `/Users/julianpani/personal/code/agent-conf/cli/src/utils/git.ts:8-16` -- `directoryExistsForGit(dir)` (private, same logic)

Both functions check `fs.stat(dir).isDirectory()`. The git module creates its own private copy rather than importing from `utils/fs.ts`.

**Action**: Have `utils/git.ts` import `directoryExists` from `utils/fs.ts` instead of defining its own `directoryExistsForGit`.

### 2. Four Identical List Formatting Functions in `shared.ts`

- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts:537` -- `formatSkillList`
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts:609` -- `formatRuleList`
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts:658` -- `formatCodexRuleList`
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts:714` -- `formatAgentList`

All four are locally-scoped closures with identical logic: loop over items, apply truncation via `MAX_ITEMS_DEFAULT`/`expandChanges`, output console + summary lines. `formatCodexRuleList` has a minor variation (no file path). The others differ only in path construction.

**Action**: Extract a single generic `formatChangeList` helper that accepts a path formatter function.

### 3. Duplicated Workflow Generation in `canonical.ts` vs `workflows.ts`

- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/canonical.ts:163` -- local `generateSyncWorkflow(repoFullName, prefix)`
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/canonical.ts:412` -- local `generateCheckWorkflow(repoFullName, prefix)`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:192` -- exported `generateSyncWorkflow(versionRef, config, settings)`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts:272` -- exported `generateCheckWorkflow(versionRef, config)`

The `canonical.ts` versions generate *reusable* workflow templates (called by downstream repos), while the `workflows.ts` versions generate *caller* workflow files (for downstream repos). The naming overlap is confusing.

**Action**: Rename the `canonical.ts` functions to `generateReusableSyncWorkflow` / `generateReusableCheckWorkflow` to disambiguate.

### 4. Frontmatter Parsing Wrappers

Three files define nearly identical `parseFrontmatter` wrappers around the shared implementation:

- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts:49-60` -- returns `{ frontmatter: Record<string, unknown>, body, raw }`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts:64-73` -- returns `{ frontmatter: RuleFrontmatter | null, body }`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/agents.ts:79-88` -- returns `{ frontmatter: AgentFrontmatter | null, body }`

Each just casts the shared result to a different type. The `managed-content.ts` wrapper also coerces `null` to `{}`.

**Action**: Minor issue. Consider using the shared `parseFrontmatter` directly with type assertions at call sites instead of per-module wrappers.

---

## Unused Dependencies

All runtime dependencies in `package.json` are actively used:

| Dependency | Used In |
|---|---|
| `@clack/prompts` | 7 command files |
| `commander` | `cli.ts` |
| `fast-glob` | `sync.ts`, `managed-content.ts` |
| `ora` | `logger.ts` |
| `picocolors` | 10 files |
| `simple-git` | `git.ts`, `source.ts` |
| `tabtab` | `completion.ts` |
| `yaml` | `canonical.ts`, `loader.ts` |
| `zod` | `schema.ts`, `lockfile.ts` |

**No unused runtime dependencies found.**

All devDependencies are standard toolchain packages (biome, vitest, typescript, semantic-release, etc.) and are actively used by the build/test/release pipeline.

---

## Code Comments Inventory

### TODOs

**None found.** No `TODO` comments exist in `cli/src/`.

### FIXMEs

**None found.** No `FIXME` comments exist in `cli/src/`.

### HACKs

**None found.** No `HACK`, `XXX`, `TEMP`, or `WORKAROUND` comments exist in `cli/src/`.

---

## Shell Completions Missing Options

The `completion.ts` command definitions are stale for the `sync` command:

**File**: `/Users/julianpani/personal/code/agent-conf/cli/src/commands/completion.ts:18-20`

Missing options for the `sync` command:
- `--pinned` (added in a previous release)
- `--summary-file` (for CI usage)
- `--expand-changes` (for CI usage)

The `init` command completions are also missing the `--ref` option handling (it's listed but these sync-specific ones are not).

**Action**: Add the missing flags to the `COMMANDS.sync.options` array in `completion.ts`.

---

## Cleanup Recommendations

Prioritized by impact and effort:

### Priority 1 -- Quick Wins (Low effort, reduces surface area)

1. **Remove `updateWorkflowVersion`** from `workflows.ts` -- Dead code, fully superseded by `syncWorkflows`.
2. **Remove `config/index.ts`** barrel file -- Unused, creates the illusion of a module boundary that doesn't exist.
3. **Remove `export` from 7 functions** in `workflows.ts` that are only used internally (`ensureWorkflowsDir`, `generateSyncWorkflow`, `generateCheckWorkflow`, `extractWorkflowRef`, `updateWorkflowRef`).
4. **Remove `export` from 3 schema objects** in `config/schema.ts` (`CanonicalMetaSchema`, `MarkersConfigSchema`, `MergeConfigSchema`) -- only used within the same file.
5. **Remove `export` from 5 types** in `merge.ts` and `source.ts` (`MergeOptions`, `MergeResult`, `ConsolidateClaudeMdResult`, `LocalSourceOptions`, `GithubSourceOptions`) -- only used within their own files.
6. **Add missing shell completion flags** for `--pinned`, `--summary-file`, `--expand-changes` on the `sync` command.

### Priority 2 -- Moderate Effort Refactors

7. **Extract `formatChangeList` helper** in `shared.ts` to consolidate the 4 identical list-formatting closures (~120 lines of duplication).
8. **Create shared prefix conversion utilities** (`toDashPrefix`/`toUnderscorePrefix`) to replace the 8+ scattered `replace(/-/g, "_")` / `replace(/_/g, "-")` calls.
9. **Eliminate `directoryExistsForGit`** in `utils/git.ts` by importing `directoryExists` from `utils/fs.ts`.

### Priority 3 -- Naming and Clarity

10. **Rename `generateSyncWorkflow` / `generateCheckWorkflow`** in `canonical.ts` to `generateReusableSyncWorkflow` / `generateReusableCheckWorkflow` to disambiguate from the identically-named functions in `workflows.ts`.
11. **Rename `WorkflowConfig`** in `workflows.ts` (line 53) to `WorkflowGenerationConfig` to avoid the collision with the Zod schema type alias.
12. **Standardize ENOENT handling** on the type guard pattern from `config/loader.ts` (create a shared `isFileNotFoundError` utility).
