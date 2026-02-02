# Rules Sync Feature - Task Tracker

## Development Approach: TDD

For each feature:
1. **Write tests first** - Define expected behavior
2. **Run tests** - Verify they fail (red)
3. **Write implementation** - Minimal code to pass tests
4. **Run tests** - Verify they pass (green)
5. **Refactor** - Clean up while keeping tests green

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [-] Blocked

---

## Phase 1: Core Infrastructure

### 1.1 Configuration Schema Updates
- [x] Add `rules_dir` to `CanonicalPathsSchema` in `cli/src/config/schema.ts`
- [x] Add `rulesDir` to `ResolvedConfigSchema`
- [x] Add `getRulesMarkers()` helper function
- [x] Tests: 19 tests in `cli/tests/unit/rules-schema.test.ts`

### 1.2 Lockfile Schema Updates
- [x] Add `RulesContentSchema` in `cli/src/schemas/lockfile.ts`
- [x] Add `rules` field to `ContentSchema`
- [x] Export `RulesContent` type
- [x] Backward compatibility verified

### 1.3 Source Resolution Updates
- [x] Add `rulesPath` to `ResolvedSource` interface in `cli/src/core/source.ts`
- [x] Update `resolveLocalSource()` to resolve rules path
- [x] Update `resolveGithubSource()` to resolve rules path
- [x] Rules path is null when not configured (backward compat)

---

## Phase 2: Rules Core Module

### 2.1 Core Rules Module
- [x] Create `cli/src/core/rules.ts`
- [x] Define interfaces: `Rule`, `RuleFrontmatter`

### 2.2 Core Functions Implemented
- [x] `adjustHeadingLevels()` - Adjust markdown headings by increment
- [x] `parseRule()` - Parse markdown into Rule object
- [x] `generatePathsComment()` - Generate paths HTML comment
- [x] `generateRulesSection()` - Concatenate rules for Codex
- [x] `updateAgentsMdWithRules()` - Insert/replace rules in AGENTS.md
- [x] `addRuleMetadata()` - Add metadata for Claude target
- [x] Tests: 37 tests in `cli/tests/unit/rules.test.ts`

---

## Phase 3: Integration

### 3.1 Sync Integration
- [x] Add `discoverRules()` helper to `cli/src/core/sync.ts`
- [x] Add `computeRulesHash()` for lockfile tracking
- [x] Add `syncRules()` main function
- [x] Integrate into main sync flow
- [x] Tests: 11 tests in `cli/tests/unit/sync.test.ts`

### 3.2 Check Command Updates
- [x] Add `RuleFileCheckResult` interface
- [x] Add `checkRuleFiles()` function
- [x] Add `getModifiedRuleFiles()` function
- [x] Update `checkAllManagedFiles()` to include rules
- [x] Update check command output for rules
- [x] Tests: 5 tests in `cli/tests/unit/check.test.ts`

---

## Phase 4: CLI & UX

### 4.1 Output Formatting
- [x] Rules shown in check command output
- [x] Rules section in sync summary output

### 4.2 Shell Completions
- [x] Review if any new options needed - **None needed** (rules are auto-synced when canonical has them)

---

## Phase 5: Testing

### 5.1 Unit Tests - COMPLETE
- [x] rules-schema.test.ts: 19 tests
- [x] rules.test.ts: 37 tests
- [x] sync.test.ts: 11 new tests
- [x] check.test.ts: 5 new tests

**Total new tests: 72**
**All tests passing: 330/330**

---

## Phase 6: Documentation

### 6.1 Update README
- [x] Document `rules_dir` configuration
- [x] Document target-specific behavior
- [x] Add usage examples

### 6.2 Update Project AGENTS.md
- [x] Document rules feature for contributors

---

## Summary

### Files Created
- `cli/src/core/rules.ts` - Core rules module
- `cli/tests/unit/rules.test.ts` - Rules unit tests
- `cli/tests/unit/rules-schema.test.ts` - Schema tests

### Files Modified
- `cli/src/config/schema.ts` - Added rules_dir, getRulesMarkers()
- `cli/src/schemas/lockfile.ts` - Added RulesContentSchema
- `cli/src/core/source.ts` - Added rulesPath to ResolvedSource
- `cli/src/core/sync.ts` - Added syncRules() and integration
- `cli/src/core/lockfile.ts` - Added rules to lockfile write
- `cli/src/core/skill-metadata.ts` - Added rule file checking
- `cli/src/commands/check.ts` - Added rules to check output
- `cli/src/commands/shared.ts` - Added rules to sync output
- `cli/tests/unit/sync.test.ts` - Added rules integration tests
- `cli/tests/unit/check.test.ts` - Added rules checking tests

### Remaining Work
- [x] Documentation updates (README, AGENTS.md)

### Additional Enhancements
- [x] `canonical init` prompts for rules directory
- [x] `--rules-dir` CLI flag for non-interactive mode
- [x] Commented-out `# rules_dir: rules` in generated config when rules not selected
- [x] Shell completions updated

### Feature Complete ✅
All implementation and documentation is complete.
