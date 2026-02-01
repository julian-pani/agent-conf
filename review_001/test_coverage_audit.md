# Test Coverage Audit Report

**Repository:** agent-conf CLI
**Date:** 2026-02-01
**Scope:** `/Users/julianpani/personal/code/agent-conf/cli`
**Analysis Method:** Static analysis of source and test files

> **Note:** Actual coverage metrics could not be obtained due to Bash permission restrictions. This report is based on comprehensive static analysis comparing source files against their corresponding test files.

---

## Summary

The agent-conf CLI has **moderate test coverage** with several critical gaps. While core modules like `merge.ts`, `markers.ts`, and `lockfile.ts` have dedicated unit tests, significant portions of the codebase lack testing coverage:

- **13 test files total**: 11 unit tests, 2 integration tests
- **Critical gaps**: `shared.ts` (643 lines), `source.ts` (259 lines) have NO dedicated tests
- **Partial coverage**: Many tested files only cover a subset of exported functions
- **Integration tests**: Only `init` and `canonical` commands have integration tests

---

## Coverage Metrics (Static Analysis)

### Test File Structure

```
cli/tests/
├── unit/
│   ├── check.test.ts
│   ├── completion.test.ts
│   ├── git.test.ts
│   ├── hooks.test.ts
│   ├── lockfile.test.ts
│   ├── markers.test.ts
│   ├── merge.test.ts
│   ├── skill-metadata.test.ts
│   ├── sync.test.ts
│   ├── version.test.ts
│   └── workflows.test.ts
└── integration/
    ├── canonical.test.ts
    └── init.test.ts
```

### Source-to-Test File Mapping

| Source File | Lines | Test File | Estimated Coverage |
|-------------|-------|-----------|-------------------|
| `core/sync.ts` | ~280 | `unit/sync.test.ts` | **Low** - Only orphan functions tested |
| `core/lockfile.ts` | ~150 | `unit/lockfile.test.ts` | **Partial** - Schema/hash tested, not read/write |
| `core/merge.ts` | ~200 | `unit/merge.test.ts` | **Good** - Main merge logic tested |
| `core/markers.ts` | ~180 | `unit/markers.test.ts` | **Good** - Marker functions well tested |
| `core/workflows.ts` | ~150 | `unit/workflows.test.ts` | **Good** - Workflow generation tested |
| `core/source.ts` | ~259 | **NONE** | **Zero** - No test file |
| `core/skill-metadata.ts` | ~80 | `unit/skill-metadata.test.ts` | **Good** |
| `core/hooks.ts` | ~100 | `unit/hooks.test.ts` | **Partial** |
| `commands/shared.ts` | ~643 | **NONE** | **Zero** - No test file |
| `commands/init.ts` | ~100 | `integration/init.test.ts` | **Good** - Integration tested |
| `commands/sync.ts` | ~150 | **NONE** | **Zero** - No direct tests |
| `commands/check.ts` | ~100 | `unit/check.test.ts` | **Partial** |
| `commands/status.ts` | ~80 | **NONE** | **Zero** |
| `commands/config.ts` | ~100 | **NONE** | **Zero** |
| `commands/upgrade-cli.ts` | ~80 | **NONE** | **Zero** |
| `commands/completion.ts` | ~150 | `unit/completion.test.ts` | **Partial** |
| `commands/canonical.ts` | ~794 | `integration/canonical.test.ts` | **Good** - Comprehensive |
| `utils/git.ts` | ~100 | `unit/git.test.ts` | **Partial** |
| `utils/fs.ts` | ~50 | **NONE** | **Zero** |
| `utils/logger.ts` | ~30 | **NONE** | **Zero** |
| `plugins/*` | ~300 | **NONE** | **Zero** - No plugin tests |
| `cli.ts` | ~249 | **NONE** | **Zero** - CLI setup not directly tested |

---

## Coverage Gaps (Critical)

### 1. `/cli/src/commands/shared.ts` - NO TEST FILE (643 lines)

**Severity:** CRITICAL

This file contains the core shared sync utilities used by both `init` and `sync` commands. All of the following functions are untested:

```typescript
// Untested functions in shared.ts:
- parseAndValidateTargets()     // Target validation
- resolveTargetDirectory()      // Directory resolution
- resolveVersion()              // Version resolution logic
- resolveSource()               // Source resolution (GitHub/local)
- promptMergeOrOverride()       // User interaction for merge strategy
- checkModifiedFilesBeforeSync() // Pre-sync file checks
- performSync()                 // THE MAIN SYNC ORCHESTRATION FUNCTION
```

**Impact:** The `performSync()` function is the core of the CLI's functionality. Without tests, any regression could break the entire tool.

**Recommendation:** Create `/cli/tests/unit/shared.test.ts` with comprehensive tests for each function. Focus especially on:
- Error handling paths in `resolveSource()`
- Edge cases in `performSync()` (empty skills, merge vs override, etc.)

### 2. `/cli/src/core/source.ts` - NO TEST FILE (259 lines)

**Severity:** CRITICAL

This module handles canonical repository resolution - fundamental to the CLI's operation:

```typescript
// Untested functions in source.ts:
- resolveLocalSource()      // Local path resolution
- resolveGithubSource()     // GitHub repo resolution
- cloneRepository()         // Git clone operations
- isGhAvailable()           // gh CLI detection
- findCanonicalRepo()       // Auto-discovery
- isCanonicalRepo()         // Validation
- validateCanonicalRepo()   // Schema validation
- formatSourceString()      // String formatting
- getDefaultRef()           // Default ref resolution
```

**Impact:** Bugs in source resolution would prevent all sync operations from working.

**Recommendation:** Create `/cli/tests/unit/source.test.ts` with mocked git/gh operations.

### 3. `/cli/src/core/sync.ts` - Partial Coverage

**Severity:** HIGH

The test file `sync.test.ts` only tests orphaned skill detection:

```typescript
// TESTED:
- findOrphanedSkills()
- deleteOrphanedSkills()

// NOT TESTED (main sync function):
- sync()  // The main sync function (~200 lines of complex logic)
```

**Impact:** The primary `sync()` function that orchestrates content syncing is completely untested.

### 4. `/cli/src/core/lockfile.ts` - Partial Coverage

**Severity:** MEDIUM

```typescript
// TESTED:
- LockfileSchema (Zod validation)
- hashContent()
- getCliVersion()

// NOT TESTED:
- readLockfile()
- writeLockfile()
- checkCliVersionMismatch()
```

---

## Coverage Gaps (Other)

### Commands Without Tests

| Command | File | Status |
|---------|------|--------|
| `status` | `commands/status.ts` | No tests |
| `config` | `commands/config.ts` | No tests |
| `upgrade-cli` | `commands/upgrade-cli.ts` | No tests |
| `sync` | `commands/sync.ts` | No direct tests (only via shared.ts) |

### Utilities Without Tests

| Utility | File | Status |
|---------|------|--------|
| `fs.ts` | `utils/fs.ts` | No tests |
| `logger.ts` | `utils/logger.ts` | No tests |

### Plugin System - No Tests

The entire plugin system lacks test coverage:
- `/cli/src/plugins/targets/` - No tests
- `/cli/src/plugins/providers/` - No tests

---

## Test Quality Assessment

### Positive Observations

1. **Well-structured integration tests**: `canonical.test.ts` and `init.test.ts` use proper temp directories and cleanup
2. **Schema validation tests**: `lockfile.test.ts` properly validates Zod schemas with valid/invalid cases
3. **Edge case handling**: `merge.test.ts` tests various merge scenarios (empty content, marker variations)
4. **Conditional test skipping**: Tests properly use `it.skipIf()` for environment-dependent tests

### Areas for Improvement

1. **Insufficient function coverage**: Many test files only test a subset of the module's functions
2. **Missing error path tests**: Happy path tested, but error conditions often skipped
3. **No tests for CLI command parsing**: `cli.ts` command definitions are untested
4. **Limited async error handling tests**: Functions with async operations lack error scenario tests

---

## Mock/Stub Quality

### Current Mocking Patterns

The codebase uses **vitest's native mocking** capabilities:

```typescript
// Example from tests (observed patterns):
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  // ...
}))
```

### Mock Quality Issues

1. **Inconsistent mocking**: Some tests mock fs operations, others use real filesystem with temp directories
2. **Missing git mocks**: No dedicated mocking for `simple-git` operations
3. **No mock for GitHub API calls**: Tests that involve GitHub operations need proper API mocking
4. **No mock utilities file**: Each test file creates its own mocks instead of sharing

### Recommendations

1. Create `/cli/tests/mocks/` directory with reusable mock factories:
   - `mockFs.ts` - File system mocking utilities
   - `mockGit.ts` - Git operation mocks
   - `mockGithub.ts` - GitHub API mocks

---

## Test Organization

### Naming Conventions

**Good:**
- Test files follow `<module>.test.ts` convention
- Test descriptions are clear and descriptive
- Uses `describe()` blocks to group related tests

**Issues:**
- Some test descriptions are too generic (e.g., "should work correctly")
- Integration vs unit distinction is clear from directory structure

### File Organization

**Structure:** Clean separation between unit and integration tests

```
tests/
├── unit/       # Fast, isolated tests
└── integration/ # Slower, filesystem-based tests
```

**Missing:**
- No `tests/fixtures/` directory for shared test data
- No `tests/helpers/` for shared test utilities
- No `tests/e2e/` for end-to-end CLI tests

---

## Potentially Flaky Tests

### Identified Risks

1. **`lockfile.test.ts` - built CLI test**
   ```typescript
   it.skipIf(!existsSync("./dist/index.js"))("built CLI should output version matching package.json", ...)
   ```
   - Uses `execSync` to run built CLI
   - Depends on build artifacts existing
   - Could fail if build is stale

2. **Integration tests using temp directories**
   - Rely on OS temp directory availability
   - Could fail under disk pressure
   - Cleanup may not occur on test failure

3. **Tests involving git operations**
   - May behave differently based on git configuration
   - Global git config could affect test outcomes

### Mitigation Recommendations

1. Use `beforeEach`/`afterEach` with proper cleanup
2. Mock git operations where possible instead of real git commands
3. Use `vi.useFakeTimers()` for time-dependent tests

---

## Test Execution Time

**Unable to measure** - Could not run tests due to permission restrictions.

**Expected observations based on code:**
- Integration tests will be slower (filesystem operations)
- Unit tests should be fast (in-memory operations)
- Tests using `execSync` for CLI verification will add latency

---

## Recommendations

### Immediate Priority (Critical Gaps)

1. **Create `/cli/tests/unit/shared.test.ts`**
   - Test all exported functions
   - Focus on `performSync()` with various scenarios
   - Mock filesystem and git operations

2. **Create `/cli/tests/unit/source.test.ts`**
   - Test local and GitHub source resolution
   - Mock `simple-git` and `gh` CLI calls
   - Test error handling paths

3. **Expand `/cli/tests/unit/sync.test.ts`**
   - Add tests for main `sync()` function
   - Test content merging scenarios
   - Test skill syncing

### Medium Priority

4. Add tests for commands: `status`, `config`, `upgrade-cli`, `sync`
5. Add tests for utilities: `fs.ts`, `logger.ts`
6. Expand `lockfile.test.ts` to cover `readLockfile`, `writeLockfile`

### Low Priority / Nice to Have

7. Create shared mock utilities in `/cli/tests/mocks/`
8. Add end-to-end tests for full CLI workflows
9. Add tests for plugin system

### Test Infrastructure Improvements

10. Add test fixtures directory with sample canonical repos
11. Consider using `msw` for HTTP mocking if GitHub API tests are added
12. Add coverage thresholds to CI pipeline

---

## Appendix: Vitest Configuration

```typescript
// cli/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});
```

**Configuration Notes:**
- Uses v8 provider for coverage (native, fast)
- Excludes `src/index.ts` from coverage (entry point only)
- No coverage thresholds configured
- No watch mode exclude patterns

---

## Estimated Coverage by Category

| Category | Est. Coverage | Priority |
|----------|---------------|----------|
| Core modules | ~50% | HIGH |
| Commands | ~30% | CRITICAL |
| Utilities | ~20% | MEDIUM |
| Plugins | 0% | LOW |
| CLI setup | 0% | LOW |

**Overall Estimated Coverage: ~35-40%**

This estimate is based on function-level static analysis. Actual line/branch coverage may differ.
