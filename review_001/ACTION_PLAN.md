# Consolidated Action Plan

**Generated:** 2026-02-01
**Based on:** Code Quality, Dead Code, Test Coverage, and Documentation Audits

---

## Executive Summary

| Audit | Key Finding |
|-------|-------------|
| Code Quality | 31+ empty catch blocks, 2 large functions (305/249 lines) |
| Dead Code | 22 dead items, entire plugin system (11 files) unused |
| Test Coverage | ~35-40% coverage, critical gaps in shared.ts and source.ts |
| Documentation | 2 critical gaps, 5 medium gaps - docs out of sync with implementation |

---

## Priority 1: Critical (Do First)

### 1.1 Remove Unused Plugin System
**Impact:** High (removes 11 files, ~800 lines of dead code)
**Effort:** Low
**Status: DONE**
**Files to delete:**
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

### 1.2 Remove Unused Functions from Core Modules
**Impact:** Medium
**Effort:** Low
**Status: DONE**
**Actions:**
- `/cli/src/core/version.ts`: Remove `getCliTarballUrl`, `getLatestCliTarballUrl`, `listReleases`, `isBranchRef`, `resolveRef`
- `/cli/src/utils/logger.ts`: Remove `formatDuration`
- `/cli/src/utils/git.ts`: Remove `getGitInfo`, `getGitConfig`, consider `isGitRepo`
- `/cli/src/core/markers.ts`: Remove legacy constants `GLOBAL_START_MARKER`, `GLOBAL_END_MARKER`, `REPO_START_MARKER`, `REPO_END_MARKER`
- `/cli/src/core/hooks.ts`: Remove `isPreCommitHookInstalled` export

### 1.3 Remove Unused Config Infrastructure
**Impact:** Medium
**Effort:** Low
**Status: DONE**
**Actions:**
- Delete `/cli/src/core/global-config.ts` entirely
- Remove from `/cli/src/config/loader.ts`: `loadConfig`, `loadDownstreamConfig`, `detectLegacySetup`, `resolveConfig`, `getLockfilePath`, `getConfigDirPath`, `ensureConfigDir`

---

## Priority 2: High (Do Soon)

### 2.1 Fix Critical Documentation Gaps
**Impact:** High (incorrect docs mislead users)
**Effort:** Low
**Status: DONE**
**Actions:**
- **README.md lines 188-198**: Remove non-existent `--repo` flag from `upgrade-cli` docs
- **README.md**: Document new `--summary-file` and `--expand-changes` sync options
- **cli/README.md**: Add missing commands (upgrade-cli, config, completion)
- **cli/docs/CHECK_FILE_INTEGRITY.md**: Remove obsolete `secrets: token` from workflow example
- **cli/docs/CANONICAL_REPOSITORY_SETUP.md**: Update workflow secrets guidance

### 2.2 Add Error Logging to Empty Catch Blocks
**Impact:** High (debugging/maintainability)
**Effort:** Medium
**Status: DONE**
**Files affected:**
- `/cli/src/utils/git.ts` (7 locations)
- `/cli/src/core/source.ts` (5 locations)
- `/cli/src/core/sync.ts` (3 locations)
- `/cli/src/core/skill-metadata.ts` (2 locations)
- `/cli/src/core/workflows.ts` (3 locations)
- `/cli/src/core/version.ts` (1 location)
- `/cli/src/core/hooks.ts` (2 locations)
- `/cli/src/config/loader.ts` (1 location)

**Action:** Add debug-level logging or comments explaining why errors are silently caught.

### 2.2 Create Tests for Critical Gaps
**Impact:** High (prevents regressions)
**Effort:** High
**Actions:**
- Create `/cli/tests/unit/shared.test.ts` for `performSync()` and related functions
- Create `/cli/tests/unit/source.test.ts` for source resolution
- Expand `/cli/tests/unit/sync.test.ts` to cover main `sync()` function

---

## Priority 3: Medium (Do Later)

### 3.1 Refactor Large Functions
**Impact:** Medium (maintainability)
**Effort:** Medium
**Actions:**
- `/cli/src/commands/shared.ts`: Split `performSync()` (305 lines) into:
  - `syncContent()` - Core sync logic
  - `handleOrphanedSkills()` - Orphan detection
  - `displaySyncSummary()` - Console output
  - `writeSummaryFile()` - File output
- `/cli/src/commands/canonical.ts`: Split `canonicalInitCommand()` (249 lines) into:
  - `gatherInitOptions()` - Interactive prompts
  - `createCanonicalStructure()` - File creation
  - `displayInitSummary()` - Output

### 3.2 Remove Unused Parameters
**Impact:** Low
**Effort:** Low
**Actions:**
- `/cli/src/core/merge.ts:78`: Remove `_source` parameter from `mergeAgentsMd`
- `/cli/src/commands/shared.ts:92`: Remove `_commandName` parameter from `resolveVersion`

### 3.3 Consolidate Duplicate Code
**Impact:** Low
**Effort:** Low
**Actions:**
- Use `directoryExists` from `/cli/src/utils/fs.ts` everywhere (remove duplicates in git.ts, source.ts)
- Create shared `isEnoentError()` helper for consistent error handling

### 3.4 Add Runtime Validation for API Responses
**Impact:** Medium (type safety)
**Effort:** Medium
**Actions:**
- `/cli/src/core/version.ts`: Add Zod schemas for GitHub API responses instead of type assertions

---

## Priority 4: Low (Nice to Have)

### 4.1 Fix TypeScript Error
**File:** `/cli/src/commands/completion.ts:150`
**Issue:** `Object is possibly 'undefined'`
**Action:** Add null check

### 4.2 Additional Test Coverage
- Add tests for commands: `status`, `config`, `upgrade-cli`, `sync`
- Add tests for utilities: `fs.ts`, `logger.ts`
- Create `/cli/tests/mocks/` directory with reusable mock factories

### 4.3 Extract Helper for Frontmatter Metadata
**File:** `/cli/src/core/skill-metadata.ts`
**Action:** Create type guard to replace repeated `frontmatter.metadata as Record<string, string>` pattern

### 4.4 Remove/Fix Config Command
**File:** `/cli/src/commands/config.ts`
**Issue:** Stub that always returns "No configuration options available"
**Action:** Either implement or remove the command

---

## Suggested Agent Assignments

| Task | Agent Type | Scope |
|------|------------|-------|
| 1.1 Remove plugins | Bash | Delete files |
| 1.2 Remove unused functions | Edit | Targeted edits |
| 1.3 Remove unused config | Edit | Targeted edits |
| 2.1 Fix documentation | Edit | Multi-file doc updates |
| 2.2 Add error logging | Edit | Multi-file edits |
| 2.3 Create tests | Write | New test files |
| 3.1 Refactor functions | Edit | Complex refactoring |

---

## Metrics After Cleanup

**Expected improvements:**
- Lines of code: -800 (plugin system removal)
- Dead exports: -22 → 0
- Test coverage: ~35% → ~60% (with new tests)
- Empty catch blocks: 31 → 0 (with logging added)

---

## Files Summary

| Category | Count | Action |
|----------|-------|--------|
| Files to delete | 12 | Remove entirely |
| Functions to remove | 17 | Delete exports |
| Functions to refactor | 2 | Split into smaller pieces |
| Test files to create | 2 | New coverage |
| Test files to expand | 1 | Additional cases |
| Doc files to update | 6 | Fix gaps and outdated info |
