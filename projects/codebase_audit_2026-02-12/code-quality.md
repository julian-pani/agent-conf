# Code Quality Report

**Date:** 2026-02-12
**Scope:** All source files in `cli/src/` (commands, core, config, utils, schemas)
**Focus:** Architecture, type safety, duplication, complexity, error handling, async patterns

---

## Critical Issues

### 1. Incorrect fallback key prefix in check command

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/check.ts`, line 90

```typescript
const keyPrefix = markerPrefix ? `${markerPrefix.replace(/-/g, "_")}_` : "agent_conf_";
```

The fallback value `"agent_conf_"` does not match the default metadata prefix `"agconf"` used everywhere else in the codebase. When `markerPrefix` is undefined (e.g., lockfiles created before marker_prefix was tracked), the check command will look for metadata keys like `agent_conf_content_hash` instead of `agconf_content_hash`, causing check to silently skip all hash comparisons and never detect modifications.

The correct fallback should be `"agconf_"` (matching `DEFAULT_METADATA_PREFIX` in `managed-content.ts`).

### 2. Inconsistent prefix normalization between sync and check for rules/agents

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 493, 516
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts`, line 330
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/agents.ts`, line 193

During sync, `metadataPrefix` is set as `markerPrefix.replace(/-/g, "_")` (converting dashes to underscores). Then inside `addRuleMetadata` and `addAgentMetadata`, the prefix is converted back from underscores to dashes: `metadataPrefix.replace(/_/g, "-")`.

This round-trip conversion (dashes -> underscores -> dashes) works only if the original prefix contained only dashes and underscores. If a prefix contains both dashes and underscores (e.g., `"my_custom-prefix"`), the conversions are not reversible: `"my_custom-prefix"` -> `"my_custom_prefix"` -> `"my-custom-prefix"`. The hash would then be computed with the wrong prefix, causing check to always report modifications.

This should be addressed by passing the original `markerPrefix` through to `addRuleMetadata`/`addAgentMetadata` and having a single consistent normalization path.

---

## High Priority

### 3. Duplicated hash computation functions (5 locations)

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/lockfile.ts`, lines 106-109 (`hashContent`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/markers.ts`, lines 87-90 (`computeGlobalBlockHash`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/markers.ts`, lines 321-324 (`computeRulesSectionHash`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts`, lines 106-110 (`computeContentHash`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 111-118 (`computeRulesHash`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 222-229 (`computeAgentsHash`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts`, lines 229-231 (inline hash)

All of these follow the same pattern: `sha256:${createHash("sha256").update(content).digest("hex").slice(0, 12)}`. While AGENTS.md already notes to reuse existing hash functions, there are still 7 separate `createHash` call sites. A single shared utility (e.g., `computeSha256Hash(content: string): string`) would eliminate all duplication and the risk of future inconsistencies (such as one function trimming content and another not).

Note: `hashContent` in `lockfile.ts` does NOT trim, while `computeGlobalBlockHash` and `computeRulesSectionHash` in `markers.ts` DO trim. This is a subtle inconsistency that could lead to hash mismatches if inputs differ only in whitespace.

### 4. Duplicated "format list with truncation" pattern in shared.ts

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts`, lines 537-561, 609-633, 658-680, 714-738

There are four nearly identical inner functions: `formatSkillList`, `formatRuleList`, `formatCodexRuleList`, and `formatAgentList`. Each takes the same parameters `(items, icon, colorFn, label, mdLabel)` and performs the same truncation/display logic. The only variation is whether a file path is constructed (Claude rules/skills/agents) or just the name is shown (Codex rules).

These should be consolidated into a single parameterized helper function, with an optional `formatPath` callback for the target-specific path construction.

### 5. `syncWorkflows` function accepts a union type for backward compatibility

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts`, lines 408-421

```typescript
export async function syncWorkflows(
  repoRoot: string,
  versionRef: string,
  sourceRepo: string,
  options?: Partial<ResolvedConfig> | SyncWorkflowsOptions,
): Promise<WorkflowSyncResult> {
  const resolvedConfig =
    options && "resolvedConfig" in options
      ? options.resolvedConfig
      : (options as Partial<ResolvedConfig> | undefined);
  const workflowSettings =
    options && "workflowSettings" in options ? options.workflowSettings : undefined;
```

This function accepts two different option shapes via a union type and disambiguates at runtime using `"resolvedConfig" in options`. This is a code smell that complicates the API. Since this was introduced for backward compatibility, the old signature callers should be migrated to the new `SyncWorkflowsOptions` shape and the union removed.

### 6. `performSync` function is over 500 lines (complexity)

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts`, lines 338-841

The `performSync` function spans over 500 lines and handles sync execution, orphan detection/deletion, validation error display, workflow sync, hook installation, and summary generation (both console and markdown). This function has at least 8 distinct responsibilities and should be decomposed into smaller functions such as:
- `handleOrphanedSkills()`
- `displayValidationErrors()`
- `displaySyncSummary()`
- `writeSyncSummaryFile()`

---

## Medium Priority

### 7. Type assertion overuse for frontmatter metadata

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts`, lines 129, 174, 198, 221, 332
- `/Users/julianpani/personal/code/agent-conf/cli/src/commands/check.ts`, lines 119, 138, 155, 208
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts`, line 337
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/agents.ts`, line 200
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/frontmatter.ts`, lines 121, 214

`frontmatter.metadata` is repeatedly cast to `Record<string, string>` or `Record<string, string> | undefined` across the codebase. Since `parseFrontmatter` returns `Record<string, unknown>`, there is no runtime guarantee that metadata values are strings. A type-safe accessor function (e.g., `getMetadataRecord(frontmatter): Record<string, string> | null`) that validates the shape would eliminate these assertions.

### 8. Duplicated "read file if exists" pattern

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/merge.ts`, lines 32-41 (`readFileIfExists`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/hooks.ts`, lines 139-143 (inline try/catch)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts`, lines 436-439 (inline try/catch)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 163-167 (inline try/catch for skills)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 278-282 (inline try/catch for rules)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/sync.ts`, lines 665-670 (inline try/catch for copy)

The pattern `try { await fs.readFile(path, "utf-8") } catch { null }` is used in at least 6 locations. `merge.ts` already has `readFileIfExists` as a private utility. This should be promoted to `utils/fs.ts` and reused everywhere.

### 9. Duplicated "access check for directory exists" pattern

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/utils/fs.ts`, lines 18-25 (`directoryExists`)
- `/Users/julianpani/personal/code/agent-conf/cli/src/utils/git.ts`, lines 8-16 (`directoryExistsForGit`)

`directoryExistsForGit` in `git.ts` is a private function that does the exact same thing as `directoryExists` in `fs.ts`. The git utility should import and use `directoryExists` from `utils/fs.ts`.

### 10. Duplicated frontmatter parsing wrappers

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts`, lines 49-60 (`parseFrontmatter` wrapper)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/rules.ts`, lines 64-73 (`parseFrontmatter` wrapper)
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/agents.ts`, lines 79-88 (`parseFrontmatter` wrapper)

Three modules each create a private `parseFrontmatter` wrapper around the shared `frontmatter.ts` implementation. Each wrapper serves a slightly different purpose (type narrowing), but the pattern is repetitive. The shared `parseFrontmatter` could accept a generic type parameter or return a more specific type that reduces the need for these wrappers.

### 11. Unsafe type assertion in version.ts

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/version.ts`, lines 93-94, 100-108

```typescript
const data: unknown = await response.json();
return parseReleaseResponse(data as Record<string, unknown>);
```

And inside `parseReleaseResponse`:
```typescript
const tag = data.tag_name as string;
```

The API response is cast to `Record<string, unknown>` and then individual fields are cast to `string`. There is no validation that the response actually contains the expected fields. If GitHub changes their API response shape, this would produce silent bugs (undefined tag names, etc.). A Zod schema or runtime type guard would be more appropriate.

### 12. Unsafe type assertion in canonical.ts config building

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/canonical.ts`, line 68

```typescript
(config.meta as Record<string, unknown>).organization = options.organization;
```

This casts `config.meta` to mutate it. A cleaner approach is to build the meta object conditionally:
```typescript
const meta: Record<string, unknown> = { name: options.name };
if (options.organization) meta.organization = options.organization;
```

### 13. `DEFAULT_CLI_NAME` constant duplicated

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/hooks.ts`, line 6
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts`, line 47

Both define `const DEFAULT_CLI_NAME = "agconf"` independently. This constant should be defined once in a shared location (e.g., `config/schema.ts` or a constants file).

### 14. `_source` parameter unused in `mergeAgentsMd`

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/merge.ts`, line 67

```typescript
export async function mergeAgentsMd(
  targetDir: string,
  globalContent: string,
  _source: Source,
  options: MergeOptions = { override: false },
```

The `_source` parameter (of type `Source`) is prefixed with underscore indicating it is unused. If it is no longer needed, it should be removed from the function signature and all call sites updated. If it is planned for future use, this should be tracked as technical debt.

---

## Low Priority

### 15. Inconsistent error handling style across modules

**Files:** Various across `cli/src/core/` and `cli/src/commands/`

Some functions throw exceptions (e.g., `validateCanonicalRepo` in `source.ts`), some return null (e.g., `readLockfile` in `lockfile.ts`), and some call `process.exit(1)` directly (e.g., `parseAndValidateTargets` in `shared.ts`). Within core modules, `process.exit()` should be avoided in favor of throwing errors that command-level code can handle.

Specific instances of `process.exit()` in non-command code:
- None currently in `core/` (this is good), but some command-level functions in `shared.ts` that act as reusable logic (e.g., `resolveTargetDirectory`, `resolveSource`) call `process.exit()` directly, making them difficult to test in isolation.

### 16. String literal "agconf" repeated as default across many modules

**Files:**
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/markers.ts`, line 5: `"agconf"`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/managed-content.ts`, line 18: `"agconf"`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/hooks.ts`, lines 6-8: `"agconf"`, `".agconf"`, `"lockfile.json"`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/workflows.ts`, line 47: `"agconf"`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/source.ts`, line 60: `"agconf"`
- `/Users/julianpani/personal/code/agent-conf/cli/src/core/lockfile.ts`, lines 15-16: `".agconf"`, `"lockfile.json"`

The string `"agconf"` appears as a default value in at least 6 different modules. While each module defines its own constant, a single source of truth for CLI-wide defaults would reduce the chance of inconsistency.

### 17. Completion `COMMANDS` object options missing `--pinned` and `--summary-file` for sync

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/completion.ts`, lines 19-20

The `sync` command in the `COMMANDS` object lists these options:
```typescript
options: ["-s", "--source", "--local", "-y", "--yes", "--override", "--ref", "-t", "--target"],
```

Missing from completions for the `sync` command: `--pinned`, `--summary-file`, `--expand-changes`. These are defined in `cli.ts` but not reflected in the completion definitions.

### 18. Unused `_commandName` parameter in `resolveVersion`

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/commands/shared.ts`, line 93

```typescript
export async function resolveVersion(
  options: SharedSyncOptions,
  status: SyncStatus,
  _commandName: "init" | "sync",
  repo?: string,
```

The `_commandName` parameter is explicitly marked as unused with the underscore prefix. Per the function's doc comment, it was intended for different behavior between init and sync, but both now follow the same path. This parameter should be removed.

### 19. `parseSimpleYaml` does not handle multi-line string values

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/frontmatter.ts`, lines 89-177

The custom YAML parser only handles simple `key: value` pairs, nested objects one level deep, and arrays. It does not support:
- Multi-line strings (pipe `|` or fold `>` style)
- Quoted strings with newlines
- Deeply nested objects (beyond 2 levels)

While this is a known limitation (a "simple" parser), the module is used for all frontmatter parsing including agent and rule files where users may include complex YAML. Edge cases could silently produce incorrect parse results.

### 20. `compareVersions` does not validate input format

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/version.ts`, lines 141-168

The `compareVersions` function splits on `.` and calls `Number()` without validating that the input strings are valid semver. Passing malformed strings (e.g., `"abc"`, `""`) produces `NaN` comparisons, which silently return 0 (equal). A guard clause or validation would make this more robust.

### 21. `checkCliVersionMismatch` reads lockfile redundantly

**File:** `/Users/julianpani/personal/code/agent-conf/cli/src/core/lockfile.ts`, lines 128-162

This function reads and parses the lockfile just to check the CLI version. In `cli.ts` it is called in `warnIfCliOutdated` during the `preAction` hook, while many commands also call `readLockfile` or `getSyncStatus` later. The lockfile ends up being read and parsed twice per command invocation.

---

## Summary

- **Total issues:** 21
- **Critical:** 2 | **High:** 4 | **Medium:** 8 | **Low:** 7

### Key themes:
1. **Hash function proliferation** -- Seven separate hash computation call sites with subtle differences (trimming vs. not trimming). A single utility would eliminate the risk class entirely.
2. **Prefix normalization fragility** -- The dash/underscore conversion between `markerPrefix` and `metadataPrefix` is scattered across modules with no single normalization function, creating a high-risk surface for bugs (Critical #2).
3. **Type assertion overuse** -- Frontmatter metadata is cast to `Record<string, string>` in 12+ locations without runtime validation.
4. **Display logic duplication** -- The `performSync` summary display has four nearly identical list-formatting closures that should be a single helper.
5. **Good practices observed** -- Core modules avoid `process.exit()`; error types are properly narrowed in most catch blocks; the codebase uses `exactOptionalPropertyTypes`; Zod schemas are used for config/lockfile validation; hash format is consistent (`sha256:` + 12 hex chars).
