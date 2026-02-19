# Test Coverage Report

**Date:** 2026-02-12
**Test Runner:** Vitest
**Coverage Tool:** @vitest/coverage-v8 (not installed -- line-level metrics unavailable)
**Test Results:** 640 passed, 1 failed (lockfile.test.ts -- stale build version mismatch), 1 skipped
**Test Files:** 22 passed, 1 failed (23 total)

---

## Coverage Metrics

> Note: @vitest/coverage-v8 is not installed. All assessments below are based on file-level
> mapping (source file to test file), test count, and qualitative review of test content.

### Source-to-Test Mapping

#### Commands (`cli/src/commands/`)

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `shared.ts` | `unit/shared.test.ts` | 44 | **Excellent** -- all exported functions tested with happy/error paths |
| `check.ts` | `unit/check.test.ts` | 28 | **Excellent** -- comprehensive: all content types, quiet mode, custom prefixes |
| `completion.ts` | `unit/completion.test.ts` | 33 | **Good** -- tab completion logic well covered |
| `canonical.ts` | `integration/canonical.test.ts` | 27 | **Good** -- `canonicalInitCommand` tested with structure/yaml/examples |
| `init.ts` | `integration/init.test.ts`, `integration/e2e-workflow.test.ts` | 8 + 10 | **Moderate** -- integration coverage via e2e; no direct unit tests for `initCommand` |
| `sync.ts` | `integration/e2e-workflow.test.ts` | 10 | **Low** -- only integration-level; no unit tests for flag validation, lockfile targets, schema errors |
| `config.ts` | **None** | 0 | **Not tested** |
| `upgrade-cli.ts` | **None** | 0 | **Not tested** |

#### Core (`cli/src/core/`)

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `agents.ts` | `unit/agents.test.ts` | 30 | **Excellent** -- parseAgent, addAgentMetadata, validateAgentFrontmatter, syncAgents, orphan handling |
| `frontmatter.ts` | `unit/frontmatter.test.ts` | 57 | **Excellent** -- exhaustive: simple/nested/boolean/array/edge cases, serialization |
| `hooks.ts` | `unit/hooks.test.ts` | 11 | **Good** -- install, append, update, migrate legacy hooks |
| `lockfile.ts` | `unit/lockfile.test.ts` | 17 | **Good** -- schema validation, hash, CLI version, schema compat |
| `managed-content.ts` | `unit/managed-content.test.ts` | 26 | **Good** -- isManaged, addMetadata, stripMetadata, hash, manual changes |
| `markers.ts` | `unit/markers.test.ts` | 30 | **Excellent** -- parse, build, hash, custom prefixes, rules section |
| `merge.ts` | `unit/merge.test.ts` | 20 | **Good** -- mergeAgentsMd, consolidateClaudeMd, various merge scenarios |
| `rules.ts` | `unit/rules.test.ts` | 40 | **Excellent** -- parseRule, adjustHeadingLevels, generateRulesSection, addRuleMetadata |
| `source.ts` | `unit/source.test.ts` | 36 | **Excellent** -- resolveLocalSource, formatSourceString, various configs |
| `sync.ts` | `unit/sync.test.ts`, `integration/init.test.ts` | 27 + 8 | **Good** -- findOrphanedSkills, deleteOrphanedSkills, syncRules; main `sync()` only via integration |
| `targets.ts` | `unit/targets.test.ts` | 42 | **Excellent** -- isValidTarget, parseTargets, getTargetConfig |
| `version.ts` | `unit/version.test.ts` | 19 | **Good** -- parseVersion, formatTag, isVersionRef, compareVersions |
| `workflows.ts` | `unit/workflows.test.ts` | 60 | **Excellent** -- generate, extract, status, sync workflows, settings |
| `schema.ts` | `unit/lockfile.test.ts` (partial) | ~3 | **Low** -- checkSchemaCompatibility tested but not exhaustively |

#### Config (`cli/src/config/`)

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `schema.ts` | `unit/downstream-config.test.ts`, `unit/rules-schema.test.ts` | 19 + 15 | **Good** -- DownstreamConfigSchema, CanonicalPathsSchema, ResolvedConfigSchema |
| `loader.ts` | `unit/downstream-config.test.ts` | ~5 | **Moderate** -- loadDownstreamConfig tested; loadCanonicalRepoConfig only via integration |
| `index.ts` | N/A (re-export barrel) | N/A | N/A -- barrel file, no logic to test |

#### Schemas (`cli/src/schemas/`)

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `lockfile.ts` | `unit/lockfile.test.ts`, `unit/rules-schema.test.ts` | 17 + 15 | **Good** -- LockfileSchema, ContentSchema, RulesContentSchema |

#### Utils (`cli/src/utils/`)

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `git.ts` | `unit/git.test.ts` | 19 | **Good** -- getGitRoot, isGitRoot, getGitProjectName, getGitOrganization |
| `package-manager.ts` | `unit/package-manager.test.ts` | 23 | **Good** -- detectPackageManager, buildInstallCommand |
| `fs.ts` | **None** | 0 | **Not tested** (but simple wrappers around node:fs) |
| `logger.ts` | **None** | 0 | **Not tested** (thin wrapper around ora/picocolors) |

#### Entry Points

| Source File | Test File(s) | Test Count | Assessment |
|---|---|---|---|
| `cli.ts` | **None** | 0 | **Not tested** (Commander program setup; tested indirectly via integration) |
| `index.ts` | **None** | 0 | **Not tested** (3-line entry point) |

---

## Coverage Gaps

### Untested Files (No Dedicated Tests)

1. **`cli/src/commands/config.ts`** -- 3 exported functions (`configShowCommand`, `configGetCommand`, `configSetCommand`). Currently a minimal stub but still untested.

2. **`cli/src/commands/upgrade-cli.ts`** -- `upgradeCliCommand` with npm registry fetch, version comparison, interactive upgrade. Contains non-trivial logic including network calls and `execSync`.

3. **`cli/src/utils/fs.ts`** -- `ensureDir`, `fileExists`, `directoryExists`, `createTempDir`, `removeTempDir`, `resolvePath`. Simple wrappers, low risk but some are used heavily in tests themselves.

4. **`cli/src/utils/logger.ts`** -- `createLogger` factory function. Thin wrapper, low risk.

5. **`cli/src/cli.ts`** -- Commander program definition with `createCli()` and `warnIfCliOutdated()`. The CLI dispatch logic and version warning are untested directly.

6. **`cli/src/index.ts`** -- 3-line entry point. No meaningful logic.

### Low-Coverage Files

1. **`cli/src/commands/sync.ts`** -- The `syncCommand` function orchestrates flag validation (--pinned vs --ref vs --local), lockfile target resolution, schema compatibility checks, and version comparison warnings. Only tested indirectly through `e2e-workflow.test.ts`, missing:
   - Mutually exclusive flag validation (`--pinned` + `--ref`, `--pinned` + `--local`)
   - Schema error/warning handling
   - Version comparison warning ("syncing older version" path)
   - Target resolution from lockfile

2. **`cli/src/commands/init.ts`** -- The `initCommand` function handles "already synced" prompts, completion install prompts, and schema checks. Only tested indirectly through integration tests, missing:
   - "Already synced" confirmation flow
   - Schema error/warning handling

3. **`cli/src/core/schema.ts`** -- `checkSchemaCompatibility` has only ~3 tests embedded in `lockfile.test.ts`. Missing explicit tests for:
   - Major version mismatch (e.g., schema "2.0.0" vs supported "1.0.0")
   - Minor version ahead warning
   - Exact version match

4. **`cli/src/config/loader.ts`** -- `loadCanonicalRepoConfig` only tested indirectly via `source.test.ts` integration. Error paths (invalid YAML, missing required fields, file read errors) lack dedicated tests.

---

## Missing Test Types

### 1. Command-Level Unit Tests for `sync.ts` and `init.ts`

Both `syncCommand` and `initCommand` contain non-trivial orchestration logic (flag validation, error handling, interactive prompts) that is only exercised through integration tests. Unit tests with mocked dependencies would provide faster feedback and better isolation.

### 2. Error Path Tests for `upgrade-cli.ts`

`upgradeCliCommand` handles:
- Network failure fetching npm registry
- Already up-to-date detection
- Package manager detection
- `execSync` failure during installation

None of these paths are tested.

### 3. CLI Smoke Tests

No test verifies that `createCli()` in `cli.ts` wires commands correctly (e.g., `agconf init --help` exits cleanly, unknown commands produce errors). A basic Commander parse test would catch registration bugs.

### 4. Schema Compatibility Edge Cases

`checkSchemaCompatibility` in `core/schema.ts` handles major/minor/patch version differences. Only a subset of cases appear tested via `lockfile.test.ts`.

---

## Test Quality Assessment

### Strengths

1. **Thorough check command testing** (`check.test.ts`, 28 tests): Covers every content type (AGENTS.md global block, skills, rules, agents, Codex rules section), custom marker prefixes, quiet mode, and the "no managed files found" error. Well-aligned with the CLAUDE.md requirement that check must verify ALL synced content.

2. **Excellent e2e workflow tests** (`e2e-workflow.test.ts`, 10 tests): Full lifecycle coverage -- init, sync, check, tampering detection, re-sync with updated content, repo-specific content preservation, skill addition/removal. Uses real git repos and actual commands.

3. **Strong frontmatter testing** (`frontmatter.test.ts`, 57 tests): Exhaustive coverage of the custom YAML parser including edge cases (nested objects, booleans, arrays, quoted values, empty strings, special characters). This is critical since the project uses a custom frontmatter parser rather than a standard library.

4. **Well-structured test organization**: Tests cleanly mirror the source structure. Each module's exported API is tested through its own dedicated file. Integration tests in a separate directory exercise cross-module interactions.

5. **Good use of real file system**: Tests that involve file operations (check, sync, hooks, merge, source) use real temp directories rather than mocking the file system, providing higher confidence.

6. **Consistent patterns**: All test files use the same patterns -- `beforeEach`/`afterEach` for setup/teardown, `vi.spyOn` for process.exit mocking, temp directory cleanup. Makes tests readable and maintainable.

### Weaknesses

1. **Mocking over-reliance in `shared.test.ts`**: While the 44 tests are comprehensive, `shared.test.ts` mocks 6 modules upfront (git, source, version, managed-content, fs, prompts). This creates tight coupling to implementation details and may miss integration bugs.

2. **No negative/boundary tests for workflows**: `workflows.test.ts` has 60 tests but they primarily test generation. Missing: invalid config inputs, malformed workflow files, concurrent workflow operations.

3. **Hash consistency only tested in check.test.ts**: The CLAUDE.md emphasizes that hash format (`sha256:` prefix + 12 hex chars) must be consistent across sync and check. While check tests verify this roundtrip, there are no dedicated unit tests asserting that `computeContentHash`, `computeGlobalBlockHash`, and `computeRulesSectionHash` all produce the same format.

4. **`lockfile.test.ts` build dependency**: The 1 failing test (`should match the version in package.json`) depends on the build artifact (`dist/package.json`). This is fragile -- it fails when tests are run without a prior build.

---

## Recommendations

### Priority 1: Fill Critical Gaps

1. **Add unit tests for `commands/sync.ts`** -- Test flag validation logic (`--pinned` + `--ref` conflict, `--pinned` + `--local` conflict), lockfile target fallback, and schema error handling. These are currently only tested through slow integration tests.

2. **Add tests for `commands/upgrade-cli.ts`** -- Mock `fetch` and `execSync` to test the upgrade flow: network error, already up-to-date, successful upgrade. This command touches production npm and shell execution.

3. **Install `@vitest/coverage-v8`** -- Run `pnpm add -D @vitest/coverage-v8` and configure Vitest to report line-level coverage. This will reveal exact coverage percentages and uncovered branches that file-level mapping cannot detect.

### Priority 2: Improve Existing Coverage

4. **Add dedicated `core/schema.ts` tests** -- Extract the schema compatibility tests from `lockfile.test.ts` into their own file and add edge cases (future major version, patch-only difference, malformed version strings).

5. **Add `config/loader.ts` unit tests** -- Test `loadCanonicalRepoConfig` directly with invalid YAML, missing required fields, and file permission errors.

6. **Fix the `lockfile.test.ts` build dependency** -- Either skip the version-matching test in CI when no build exists, or refactor it to read `package.json` directly instead of `dist/package.json`.

### Priority 3: Test Infrastructure

7. **Add a CLI smoke test** -- A single test that calls `createCli()` and verifies all commands are registered correctly, `--help` produces output, and unknown commands error.

8. **Add hash format consistency test** -- A single test that asserts `computeContentHash()`, `computeGlobalBlockHash()`, and `computeRulesSectionHash()` all return strings matching `/^sha256:[a-f0-9]{12}$/`. This guards against the hash length mismatch bug mentioned in CLAUDE.md.

---

## Summary

| Metric | Value |
|---|---|
| Total source files | 30 (excluding barrel `config/index.ts` and entry `index.ts`) |
| Files with dedicated tests | 22 (73%) |
| Files with no tests | 6 (20%) -- config.ts, upgrade-cli.ts, fs.ts, logger.ts, cli.ts, index.ts |
| Files with low coverage | 4 (13%) -- sync.ts (cmd), init.ts (cmd), schema.ts (core), loader.ts |
| Total test cases | ~641 across 23 files |
| Integration tests | 3 files, 45 tests |
| Unit tests | 20 files, ~596 tests |

The test suite is **strong overall** for a CLI project of this size. Core logic modules (frontmatter, markers, managed-content, rules, agents, targets) have excellent coverage. The main gaps are in command-level orchestration (`sync.ts`, `init.ts`, `upgrade-cli.ts`) where non-trivial logic exists but is only tested indirectly through integration tests or not at all. Installing the coverage tool should be the immediate next step to get precise metrics.
