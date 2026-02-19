# Audit Consolidated Plan

**Date:** 2026-02-12
**Previous audit:** 2026-02-06
**Period covered:** Commits since 2026-02-06 (~40 commits)

---

## Executive Summary

The agconf codebase is in **good health** overall. The previous audit remediation (commit 6acf9a8) successfully eliminated major dead code and test gaps. Since then, new features (GitHub App auth, pre-commit hook improvements) were added cleanly. However, this audit reveals:

- **2 critical code quality issues** (check command fallback prefix bug, non-reversible prefix normalization)
- **1 critical documentation issue** (phantom `canonical update` command documented but not implemented)
- **Significant duplication** (7 hash computation sites, 4 identical list-formatting closures, scattered prefix conversions)
- **Dead code** (1 fully dead function + 7 over-exported functions in workflows.ts)
- **Test gaps** in command orchestration (sync.ts, upgrade-cli.ts untested)
- **Module naming issues** that are mostly cosmetic but would improve discoverability

### Issue Counts by Audit Dimension

| Audit | Critical | High | Medium | Low |
|-------|----------|------|--------|-----|
| Code Quality | 2 | 4 | 8 | 7 |
| Dead Code / Tech Debt | 0 | 1 | 4 | 6 |
| Test Coverage | 0 | 3 | 3 | 2 |
| Documentation | 1 | 4 | 4 | 3 |
| Module Organization | 0 | 2 | 3 | 4 |

---

## Critical Issues (Fix Immediately)

### 1. Incorrect fallback key prefix in check command
**Source:** Code Quality #1
**File:** `cli/src/commands/check.ts:90`
**Impact:** When `markerPrefix` is undefined in the lockfile, the check command uses `"agent_conf_"` as the fallback instead of `"agconf_"`, causing it to silently skip hash verification and never detect modifications to managed files.
**Fix:** Change `"agent_conf_"` to `"agconf_"`.

### 2. Phantom `canonical update` command in documentation
**Source:** Documentation #1
**Files:** README.md, cli/README.md, AGENTS.md, cli/docs/CANONICAL_REPOSITORY_SETUP.md
**Impact:** Users will expect a command that doesn't exist. The `--cli-version` option documented for `canonical init` also doesn't exist.
**Fix:** Remove all references to `canonical update` and `--cli-version` from documentation, or implement the command.

### 3. Non-reversible prefix normalization between sync and check
**Source:** Code Quality #2
**Files:** `cli/src/core/sync.ts`, `cli/src/core/rules.ts:330`, `cli/src/core/agents.ts:193`
**Impact:** For prefixes containing both dashes and underscores (e.g., `"my_custom-prefix"`), the round-trip conversion `dashes->underscores->dashes` produces incorrect results, causing hash mismatches.
**Fix:** Create shared `toDashPrefix()`/`toUnderscorePrefix()` utilities and pass the original `markerPrefix` directly where possible.

---

## High Priority (This Sprint)

### 4. Shell completions missing options for sync command
**Source:** Documentation #3, Dead Code (completions)
**File:** `cli/src/commands/completion.ts`
**Fix:** Add `--pinned`, `--summary-file`, `--expand-changes` to `COMMANDS.sync.options`.

### 5. Remove dead `updateWorkflowVersion` function
**Source:** Dead Code #1
**File:** `cli/src/core/workflows.ts:354`
**Fix:** Delete the function and remove its export.

### 6. Remove unnecessary exports from workflows.ts
**Source:** Dead Code #2-6
**File:** `cli/src/core/workflows.ts`
**Fix:** Remove `export` from `ensureWorkflowsDir`, `generateSyncWorkflow`, `generateCheckWorkflow`, `extractWorkflowRef`, `updateWorkflowRef` (keep them as internal functions).

### 7. Consolidate 4 identical list-formatting closures in shared.ts
**Source:** Code Quality #4, Dead Code (duplication)
**File:** `cli/src/commands/shared.ts:537-738`
**Fix:** Extract a single `formatChangeList()` helper that accepts a path formatter callback. Reduces ~120 lines of duplication.

### 8. Create shared prefix conversion utilities
**Source:** Code Quality #2, Dead Code (deprecated pattern)
**Files:** 8+ locations across sync.ts, rules.ts, agents.ts, managed-content.ts, check.ts, config/schema.ts
**Fix:** Create `toDashPrefix(prefix: string)` and `toUnderscorePrefix(prefix: string)` in a shared location and use everywhere.

### 9. Install @vitest/coverage-v8 for line-level metrics
**Source:** Test Coverage
**Fix:** `pnpm add -D @vitest/coverage-v8`

### 10. Add unit tests for `commands/upgrade-cli.ts`
**Source:** Test Coverage #2
**File:** New test file `cli/tests/unit/upgrade-cli.test.ts`
**Fix:** Mock `fetch` and `execSync` to test upgrade flow (network error, already up-to-date, successful upgrade).

### 11. Document `check --debug` and `upgrade-cli --package-manager` options
**Source:** Documentation #4, #5
**Files:** README.md, cli/docs/CHECK_FILE_INTEGRITY.md
**Fix:** Add missing CLI option descriptions.

---

## Medium Priority (Backlog)

### 12. Eliminate `directoryExistsForGit` duplication
**Source:** Code Quality #9, Dead Code (duplication)
**Files:** `cli/src/utils/git.ts`, `cli/src/utils/fs.ts`
**Fix:** Import `directoryExists` from `utils/fs.ts` in `git.ts`.

### 13. Remove unnecessary exports from config/schema.ts
**Source:** Dead Code #10-12
**File:** `cli/src/config/schema.ts`
**Fix:** Remove `export` from `CanonicalMetaSchema`, `MarkersConfigSchema`, `MergeConfigSchema`.

### 14. Remove unnecessary exports from merge.ts and source.ts
**Source:** Dead Code #13-17
**Files:** `cli/src/core/merge.ts`, `cli/src/core/source.ts`
**Fix:** Remove `export` from `MergeOptions`, `MergeResult`, `ConsolidateClaudeMdResult`, `LocalSourceOptions`, `GithubSourceOptions`.

### 15. Move `getMarkers` from config/schema.ts to core/markers.ts
**Source:** Module Organization #3
**Fix:** Move function body, remove aliased import.

### 16. Move `getMetadataKeys` from config/schema.ts to core/managed-content.ts
**Source:** Module Organization #4
**Fix:** Move function body, inline into `getMetadataKeyNames`.

### 17. Move `getCliVersion` from core/lockfile.ts to core/version.ts
**Source:** Module Organization #5
**Fix:** Relocate function + `__BUILD_VERSION__` declare, update 3 import sites.

### 18. Rename `parseFrontmatter` to `parseRawFrontmatter` in frontmatter.ts
**Source:** Module Organization (aliasing)
**Fix:** Eliminates 3 `as parseFrontmatterShared` import aliases across managed-content.ts, rules.ts, agents.ts.

### 19. Rename `core/schema.ts` to `core/schema-compat.ts`
**Source:** Module Organization #2
**Fix:** Disambiguates from `config/schema.ts`. Update 1 import in lockfile.ts.

### 20. Add unit tests for `commands/sync.ts` flag validation
**Source:** Test Coverage #1
**Fix:** Test `--pinned` + `--ref` conflict, lockfile target fallback, schema error handling.

### 21. Add tests for `core/schema.ts` compatibility edge cases
**Source:** Test Coverage #4
**Fix:** Extract from lockfile.test.ts, add major version mismatch, malformed versions.

### 22. Fix CLI version pinning inconsistency in CANONICAL_REPOSITORY_SETUP.md
**Source:** Documentation #6
**Fix:** Line 344 shows pinned `agconf@1.2.0` but actual code generates unpinned.

### 23. Promote `readFileIfExists` from merge.ts to utils/fs.ts
**Source:** Code Quality #8
**Fix:** Pattern appears in 6+ locations. Promote the existing utility and reuse.

---

## Low Priority (Future)

### 24. Remove unused `_source` parameter from `mergeAgentsMd`
**Source:** Code Quality #14
**File:** `cli/src/core/merge.ts:67`

### 25. Remove unused `_commandName` parameter from `resolveVersion`
**Source:** Code Quality #18
**File:** `cli/src/commands/shared.ts:93`

### 26. Clean up `syncWorkflows` union type API
**Source:** Code Quality #5
**File:** `cli/src/core/workflows.ts:408-421`

### 27. Add type-safe frontmatter metadata accessor
**Source:** Code Quality #7
**Fix:** Create `getMetadataRecord(frontmatter)` to replace 12+ unsafe casts.

### 28. Rename `commands/shared.ts` to `commands/sync-shared.ts`
**Source:** Module Organization #4

### 29. Create `core/skills.ts` for skill-specific logic
**Source:** Module Organization (SRP)
**Fix:** Extract `validateSkillFrontmatter`, `SkillValidationError`, `checkSkillFiles` from managed-content.ts.

### 30. Rename confusing `generateSyncWorkflow`/`generateCheckWorkflow` in canonical.ts
**Source:** Dead Code (duplication/naming)
**Fix:** Rename to `generateReusableSyncWorkflow`/`generateReusableCheckWorkflow`.

### 31. Remove `config/index.ts` barrel file
**Source:** Dead Code #9
**Fix:** No source file imports from it.

### 32. Update AGENTS.md Core Modules list
**Source:** Documentation #9
**Fix:** Add frontmatter.ts, agents.ts, schema.ts, version.ts, managed-content.ts.

### 33. Add hash format consistency test
**Source:** Test Coverage #8
**Fix:** Assert all hash functions return `sha256:` + 12 hex chars.

### 34. Create consolidated troubleshooting guide
**Source:** Documentation #13
**Fix:** Gather scattered troubleshooting sections into `cli/docs/TROUBLESHOOTING.md`.

---

## Prevention Recommendations

Based on root cause analysis of all audit findings (see `prevention-analysis.md` for full details).

### Instructions Already Existed But Weren't Followed

| Finding | Existing Instruction | Root Cause | Fix |
|---------|---------------------|------------|-----|
| Shell completions missing options (#4) | AGENTS.md "CLI Command Changes" guideline | Instruction is in "Guidelines" section, far from where commands are documented; easy to forget | Add Stop hook + `.claude/rules/cli-commands.md` |
| 7 hash computation sites (#3 high) | AGENTS.md "Content Hash Consistency" section | Instruction prevents new duplication but existing duplication predates it | Strengthen instruction + `.claude/rules/hash-and-prefix.md` |
| Phantom `canonical update` (#2) | AGENTS.md itself lists the phantom command | AGENTS.md became stale when the command was removed | Add "Documentation Synchronization" guideline |

### New Agent Context Needed

| Category | Change | Addresses |
|----------|--------|-----------|
| `.claude/rules/cli-commands.md` | CLI modification checklist (completions, docs, tests) scoped to `cli/src/cli.ts` and `cli/src/commands/*.ts` | #4, #2 documentation |
| `.claude/rules/hash-and-prefix.md` | Hash format and prefix conversion rules scoped to `cli/src/core/*.ts` | #1 critical, #3 critical, #8 high |
| `.claude/rules/testing.md` | Testing requirements scoped to command and core files | #10, #20, test coverage gaps |
| AGENTS.md: Default prefix | Document `"agconf"` as canonical default, never `"agent_conf"` | #1 critical |
| AGENTS.md: Prefix normalization | Require shared `toMarkerPrefix()`/`toMetadataPrefix()` utilities | #3 critical, #8 high |
| AGENTS.md: Export hygiene | Only export symbols imported by other modules | #5, #6, #13, #14 dead code |
| AGENTS.md: Utility reuse | Check `cli/src/utils/` before writing helpers | #12, #23 duplication |
| AGENTS.md: Function complexity | Keep functions under ~200 lines | #6 high (performSync) |
| AGENTS.md: Testing requirements | Require command-level test files, not just integration | Test coverage gaps |
| AGENTS.md: Documentation sync | Update all doc references when changing commands | #2 documentation |
| AGENTS.md: Strengthen hash consistency | Single hash utility, no inline `createHash` calls | #3 high code quality |
| AGENTS.md: Frontmatter type safety | No direct `Record<string, string>` casts on metadata | #7 medium |

### Automated Enforcement (Hook)

| Hook | Type | Purpose |
|------|------|---------|
| `Stop` prompt hook | Checks if CLI options changed in session and completions were updated | Catches the exact failure that caused Finding #4 |

---

## Recommended Order of Operations

1. Fix critical check command prefix bug (#1) -- 5 min
2. Remove phantom `canonical update` documentation (#2) -- 15 min
3. Create shared prefix conversion utilities (#8, fixes #3) -- 30 min
4. Add missing shell completion options (#4) -- 5 min
5. Remove dead code and unnecessary exports (#5, #6, #13, #14, #31) -- 20 min
6. Consolidate list-formatting closures (#7) -- 30 min
7. Install coverage tool (#9) -- 5 min
8. Relocate misplaced utilities (#12, #15, #16, #17) -- 30 min
9. Document missing CLI options (#11) -- 10 min
10. Add tests for upgrade-cli and sync flag validation (#10, #20) -- 1-2 hours
11. **Apply prevention recommendations** -- 30 min
    - Create `.claude/rules/cli-commands.md`, `hash-and-prefix.md`, `testing.md`
    - Update AGENTS.md with new guidelines (see prevention-analysis.md for exact text)
    - Add Stop hook for completions drift detection to `.claude/settings.json`
12. Address remaining medium/low items as time permits
