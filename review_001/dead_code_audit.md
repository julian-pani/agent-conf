# Dead Code & Legacy Audit Report

**Generated:** 2026-02-01
**Codebase:** `/Users/julianpani/personal/code/agent-conf/cli`

---

## Summary

This audit examined the agent-conf CLI codebase for dead code, unused exports, technical debt, and cleanup opportunities. The codebase is relatively clean but contains several unused functions, a complete plugin architecture that is not utilized, and some duplicated patterns.

**Key Findings:**
- **22 unused/dead code items** identified
- **Plugin system** entirely unused (providers and targets registries)
- **Duplicate `directoryExists`** function patterns
- **Duplicate `formatSourceString`** function in two files
- **0 TODO/FIXME/HACK comments** found (good!)
- **All dependencies in package.json** appear to be used

---

## Dead Code Found

### 1. Unused Exported Functions

| File | Function | Line | Notes |
|------|----------|------|-------|
| `/cli/src/utils/logger.ts` | `formatDuration` | 57 | Exported but never imported anywhere |
| `/cli/src/core/version.ts` | `getCliTarballUrl` | 240 | Exported but never used |
| `/cli/src/core/version.ts` | `getLatestCliTarballUrl` | 248 | Exported but never used |
| `/cli/src/core/version.ts` | `listReleases` | 123 | Exported but never used |
| `/cli/src/core/version.ts` | `isBranchRef` | 181 | Exported but never used |
| `/cli/src/core/version.ts` | `resolveRef` | 191 | Exported but never used |
| `/cli/src/utils/git.ts` | `getGitInfo` | 24 | Exported but never imported |
| `/cli/src/utils/git.ts` | `getGitConfig` | 124 | Exported but never imported |
| `/cli/src/utils/git.ts` | `isGitRepo` | 58 | Exported but only used in types (GitInfo.isGitRepo) |
| `/cli/src/core/hooks.ts` | `isPreCommitHookInstalled` | 173 | Exported but never used externally |
| `/cli/src/core/hooks.ts` | `generatePreCommitHook` | 28 | Only used internally, should be private |
| `/cli/src/core/hooks.ts` | `getHookConfig` | 85 | Only used internally, should be private |

### 2. Unused Legacy Marker Exports

**File:** `/cli/src/core/markers.ts` (lines 26-29)

```typescript
// Legacy exports for backwards compatibility (default prefix)
export const GLOBAL_START_MARKER = `<!-- ${DEFAULT_MARKER_PREFIX}:global:start -->`;
export const GLOBAL_END_MARKER = `<!-- ${DEFAULT_MARKER_PREFIX}:global:end -->`;
export const REPO_START_MARKER = `<!-- ${DEFAULT_MARKER_PREFIX}:repo:start -->`;
export const REPO_END_MARKER = `<!-- ${DEFAULT_MARKER_PREFIX}:repo:end -->`;
```

These are marked as "Legacy exports for backwards compatibility" but are never imported anywhere in the codebase. The `getMarkers()` function is used instead.

### 3. Unused Global Config Module

**File:** `/cli/src/core/global-config.ts`

The entire module is never used:
- `readGlobalConfig()` - never imported
- `writeGlobalConfig()` - never imported
- `updateGlobalConfig()` - never imported

The `config` command exists but shows "No configuration options available" - the infrastructure exists but nothing uses it.

### 4. Unused Plugin System

The plugin system is fully implemented but completely unused:

**Provider Registry (never imported outside its own module):**
- `/cli/src/plugins/providers/registry.ts`:
  - `createProviderRegistry()`
  - `getDefaultProviderRegistry()`
  - `resetDefaultProviderRegistry()`
- `/cli/src/plugins/providers/github.ts`:
  - `GitHubProvider` class
  - `resolveGitHubSource()` (conflicts with `/cli/src/core/source.ts`)
  - `createGitHubProvider()`
- `/cli/src/plugins/providers/local.ts`:
  - `LocalProvider` class
  - `resolveLocalSource()` (conflicts with `/cli/src/core/source.ts`)
  - `createLocalProvider()`

**Target Registry (never imported outside its own module):**
- `/cli/src/plugins/targets/registry.ts`:
  - `createTargetRegistry()`
  - `getDefaultTargetRegistry()`
  - `resetDefaultTargetRegistry()`
  - `parseTargetNames()`
- `/cli/src/plugins/targets/claude.ts`:
  - `claudeTarget`
  - `createClaudeTarget()`
- `/cli/src/plugins/targets/codex.ts`:
  - `codexTarget`
  - `createCodexTarget()`

**The actual code uses:**
- `/cli/src/core/source.ts` - for source resolution (not the plugin providers)
- `/cli/src/core/targets.ts` - for target config (not the plugin targets)

### 5. Unused Config Loader Functions

**File:** `/cli/src/config/loader.ts`

These functions are never used:
- `loadConfig()` - line 49
- `loadDownstreamConfig()` - line 103
- `detectLegacySetup()` - line 123
- `resolveConfig()` - line 137
- `getLockfilePath()` - line 172 (conflicts with `/cli/src/core/lockfile.ts`)
- `getConfigDirPath()` - line 179
- `ensureConfigDir()` - line 186

Only `loadCanonicalRepoConfig()` is used from this file.

---

## Unused Dependencies

All dependencies appear to be in use:

| Dependency | Used In |
|------------|---------|
| `@clack/prompts` | Commands (init, sync, check, config, etc.) |
| `commander` | CLI framework |
| `fast-glob` | Skills discovery |
| `ora` | Spinner in logger |
| `picocolors` | Terminal colors |
| `simple-git` | Git operations |
| `tabtab` | Shell completions |
| `yaml` | Config file parsing |
| `zod` | Schema validation |

---

## Technical Debt Inventory

### 1. Duplicate Function: `formatSourceString`

Two identical implementations exist:
- `/cli/src/core/source.ts:245`
- `/cli/src/plugins/providers/types.ts:106`

The commands import from `/cli/src/core/source.ts`. The plugin version is dead code.

### 2. Duplicate Function: `directoryExists` Patterns

Multiple files have similar directory existence check patterns:
- `/cli/src/utils/fs.ts:18` - `directoryExists()`
- `/cli/src/utils/git.ts:8` - `directoryExistsForGit()` (private)
- `/cli/src/plugins/providers/local.ts:115-118` - inline check

These could be consolidated to use `directoryExists` from fs.ts.

### 3. Duplicate ENOENT Error Handling Pattern

The pattern `(error as NodeJS.ErrnoException).code === "ENOENT"` appears in:
- `/cli/src/core/lockfile.ts:24`
- `/cli/src/core/merge.ts:35`

While `/cli/src/config/loader.ts` uses a helper `isNodeError()`. Consider consolidating.

### 4. Plugin Architecture Not Connected

The plugin system (`/cli/src/plugins/`) was designed for extensibility but:
- The provider registry is not used (code uses `/cli/src/core/source.ts` directly)
- The target registry is not used (code uses `/cli/src/core/targets.ts` directly)
- The index files re-export everything but nothing imports from them

This is architectural dead code - the structure exists but was never integrated.

### 5. Config Command Placeholder

**File:** `/cli/src/commands/config.ts`

The command exists but:
- Always returns "No configuration options available"
- The global config infrastructure exists but is unused
- This is a stub waiting for future implementation

### 6. TypeScript Error

**File:** `/cli/src/commands/completion.ts:150`

```
error TS2532: Object is possibly 'undefined'.
```

This is an actual type error that should be fixed.

---

## TODO/FIXME/HACK Comments

**None found.** The codebase is clean of TODO markers.

---

## Code Duplication

### Pattern 1: File Existence Checks

The following pattern appears multiple times:
```typescript
fs.access(path).then(() => true).catch(() => false)
```

Found in:
- `/cli/src/core/sync.ts:254-261`
- `/cli/src/core/source.ts:185-194`
- `/cli/src/plugins/providers/local.ts:127-136`

Consider using `fileExists` from `/cli/src/utils/fs.ts` consistently.

### Pattern 2: Source Resolution

Two parallel implementations exist:
1. **Core source module** (`/cli/src/core/source.ts`):
   - `resolveLocalSource()`
   - `resolveGithubSource()`
   - Used by the actual commands

2. **Plugin providers** (`/cli/src/plugins/providers/`):
   - `LocalProvider.resolve()`
   - `GitHubProvider.resolve()`
   - Never used

### Pattern 3: Target Configuration

Two parallel implementations exist:
1. **Core targets module** (`/cli/src/core/targets.ts`):
   - `TARGET_CONFIGS`, `getTargetConfig()`, `parseTargets()`
   - Used by the actual commands

2. **Plugin targets** (`/cli/src/plugins/targets/`):
   - `TargetAgent`, `TargetRegistry`, etc.
   - Never used

---

## Cleanup Recommendations

### Priority 1: Remove Dead Code (High Impact)

1. **Remove unused exports from `/cli/src/core/version.ts`:**
   - `getCliTarballUrl`
   - `getLatestCliTarballUrl`
   - `listReleases`
   - `isBranchRef`
   - `resolveRef`

2. **Remove unused exports from `/cli/src/utils/logger.ts`:**
   - `formatDuration`

3. **Remove legacy marker constants from `/cli/src/core/markers.ts`:**
   - `GLOBAL_START_MARKER`
   - `GLOBAL_END_MARKER`
   - `REPO_START_MARKER`
   - `REPO_END_MARKER`

4. **Remove or internalize exports from `/cli/src/utils/git.ts`:**
   - Remove `getGitInfo` (unused)
   - Remove `getGitConfig` (unused)
   - Consider if `isGitRepo` is needed

5. **Remove unused exports from `/cli/src/core/hooks.ts`:**
   - `isPreCommitHookInstalled` (never called externally)
   - Make `generatePreCommitHook` and `getHookConfig` private

### Priority 2: Remove Unused Plugin System (Medium Impact)

Consider removing the entire plugin system if there are no plans to use it:

**Files to remove:**
- `/cli/src/plugins/index.ts`
- `/cli/src/plugins/providers/index.ts`
- `/cli/src/plugins/providers/registry.ts`
- `/cli/src/plugins/providers/github.ts`
- `/cli/src/plugins/providers/local.ts`
- `/cli/src/plugins/providers/types.ts`
- `/cli/src/plugins/targets/index.ts`
- `/cli/src/plugins/targets/registry.ts`
- `/cli/src/plugins/targets/claude.ts`
- `/cli/src/plugins/targets/codex.ts`
- `/cli/src/plugins/targets/types.ts`

**Alternative:** If the plugin system is planned for future use, add a comment explaining this and possibly move it to a separate branch until needed.

### Priority 3: Consolidate Duplicates (Low Impact)

1. **Consolidate `formatSourceString`:**
   - Remove from `/cli/src/plugins/providers/types.ts`
   - Keep only in `/cli/src/core/source.ts`

2. **Consolidate directory existence checks:**
   - Use `directoryExists` from `/cli/src/utils/fs.ts` everywhere
   - Remove `directoryExistsForGit` from `/cli/src/utils/git.ts`

3. **Consolidate ENOENT error handling:**
   - Create a shared `isEnoentError()` helper
   - Use consistently across codebase

### Priority 4: Remove Unused Config Infrastructure (Low Impact)

1. **Remove `/cli/src/core/global-config.ts`** entirely (not used)

2. **Remove unused functions from `/cli/src/config/loader.ts`:**
   - `loadConfig`
   - `loadDownstreamConfig`
   - `detectLegacySetup`
   - `resolveConfig`
   - `getLockfilePath`
   - `getConfigDirPath`
   - `ensureConfigDir`

   Keep only `loadCanonicalRepoConfig` which is actually used.

### Priority 5: Fix TypeScript Error

**File:** `/cli/src/commands/completion.ts:150`

Add null check for the undefined object access.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Unused exported functions | 12 |
| Unused constants | 4 |
| Unused modules (can be removed) | 11 files |
| Duplicate function implementations | 2 |
| Duplicate code patterns | 3 |
| TypeScript errors | 1 |
| TODO/FIXME comments | 0 |
| Unused dependencies | 0 |

**Estimated cleanup effort:** 2-4 hours for Priority 1 & 2 items.
