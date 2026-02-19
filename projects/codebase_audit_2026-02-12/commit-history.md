# Commit History Since Last Audit (2026-02-06)

## Summary
- **Period**: 2026-02-06 to 2026-02-12
- **Total commits**: ~40 (including releases and dependency bumps)
- **Key contributors**: Julian Pani, dependabot, semantic-release-bot

## Notable Changes

### Features
- `9d52614` feat(cli): append agconf hook to existing pre-commit hooks (#30)
- `bb76d70` feat: improve canonical init defaults and AGENTS.md handling
- `adf2f12` feat: support GitHub App authentication in sync workflows (#29)
- `53affe4` feat: add plan-review skill for pre-implementation plan review
- `e01f7d5` feat: add documentation standards skill and doc maintenance agents

### Bug Fixes
- `2881037` fix(cli): scope GitHub App token to canonical repository in sync workflow
- `4861781` fix(cli): skip pre-commit hook in sync workflow commits
- `a96a42b` fix: only show AGENTS.md as updated when content actually changed
- `7260791` fix: use step output instead of secrets context in reusable workflow if condition
- `1bb485f` fix: broaden check workflow path filters to cover all managed content
- `b346ede` fix: remove context:fork and fix doc-planner subagent invocation
- `b1d919d` fix: add worktrees to gitignore

### Refactoring & Code Quality
- `6acf9a8` refactor: codebase audit remediation - eliminate duplication, dead code, and test gaps
- `c98eb93` style: fix lint, format, and unused import/variable warnings

### Testing
- `8fab629` test: add e2e workflow tests for full sync + check lifecycle

### Dependencies
- Multiple dependabot bumps: biome, actions/setup-node, actions/checkout, ora, semantic-release/exec, commander, types/node, commitlint

### Files Most Frequently Modified
- `cli/src/commands/canonical.ts` (5 commits)
- `cli/src/commands/shared.ts` (3 commits)
- `cli/src/core/workflows.ts` (3 commits)
- `cli/src/core/hooks.ts` (1 commit)
- `cli/src/core/merge.ts` (1 commit)
- `cli/src/core/sync.ts` (2 commits)

## Raw Commit Log

```
529fcc5 chore(release): 0.11.2 [skip ci] (semantic-release-bot, 2026-02-10)
2881037 fix(cli): scope GitHub App token to canonical repository in sync workflow (Julian Pani, 2026-02-10)
8070789 chore(release): 0.11.1 [skip ci] (semantic-release-bot, 2026-02-10)
4861781 fix(cli): skip pre-commit hook in sync workflow commits (Julian Pani, 2026-02-09)
076dd5a chore(release): 0.11.0 [skip ci] (semantic-release-bot, 2026-02-09)
9d52614 feat(cli): append agconf hook to existing pre-commit hooks (#30) (JulianPani, 2026-02-09)
e72b31f chore(release): 0.10.2 [skip ci] (semantic-release-bot, 2026-02-09)
a96a42b fix: only show AGENTS.md as updated when content actually changed (Julian Pani, 2026-02-09)
8b3aff8 chore(release): 0.10.1 [skip ci] (semantic-release-bot, 2026-02-09)
7260791 fix: use step output instead of secrets context in reusable workflow if condition (Julian Pani, 2026-02-09)
d63c2c5 chore(release): 0.10.0 [skip ci] (semantic-release-bot, 2026-02-09)
bb76d70 feat: improve canonical init defaults and AGENTS.md handling (Julian Pani, 2026-02-09)
6911d69 chore(release): 0.9.0 [skip ci] (semantic-release-bot, 2026-02-09)
adf2f12 feat: support GitHub App authentication in sync workflows (#29) (JulianPani, 2026-02-09)
b77dac6 chore(deps-dev): bump @biomejs/biome (#18) (dependabot[bot], 2026-02-08)
6084e39 build(deps): Bump actions/setup-node from 4 to 6 (#1) (dependabot[bot], 2026-02-08)
8aa1660 build(deps): Bump actions/checkout from 4 to 6 (#2) (dependabot[bot], 2026-02-08)
f16783a chore(deps): bump actions/upload-pages-artifact from 3 to 4 (#17) (dependabot[bot], 2026-02-08)
e3f8d52 ci: ignore dependendabot commits (Julian Pani, 2026-02-08)
d2e879f chore(deps): bump ora from 8.2.0 to 9.3.0 in /cli (#19) (dependabot[bot], 2026-02-08)
9d77db1 chore(deps-dev): bump @semantic-release/exec from 6.0.3 to 7.1.0 in /cli (#20) (dependabot[bot], 2026-02-08)
85d1f1d chore(deps-dev): bump conventional-changelog-conventionalcommits in /cli (#21) (dependabot[bot], 2026-02-08)
e432582 chore(deps-dev): bump @types/node from 20.19.30 to 25.2.1 in /cli (#23) (dependabot[bot], 2026-02-08)
c9838c8 chore(deps): bump commander from 12.1.0 to 14.0.3 in /cli (#22) (dependabot[bot], 2026-02-08)
d0c3112 chore(deps-dev): bump @commitlint/config-conventional in /cli (#24) (dependabot[bot], 2026-02-08)
60785c5 ci: ignore dependendabot commits (Julian Pani, 2026-02-08)
952fb54 chore(release): 0.8.0 [skip ci] (semantic-release-bot, 2026-02-08)
b775e8d Merge pull request #28 (JulianPani, 2026-02-08)
50a34f1 Merge pull request #27 (JulianPani, 2026-02-08)
b346ede fix: remove context:fork and fix doc-planner subagent invocation (Julian Pani, 2026-02-08)
c98eb93 style: fix lint, format, and unused import/variable warnings (Julian Pani, 2026-02-08)
6acf9a8 refactor: codebase audit remediation (Julian Pani, 2026-02-08)
53affe4 feat: add plan-review skill for pre-implementation plan review (Julian Pani, 2026-02-08)
8fab629 test: add e2e workflow tests for full sync + check lifecycle (Julian Pani, 2026-02-08)
96e1b49 docs: add per-issue-type commit strategy to codebase-audit skill (Julian Pani, 2026-02-08)
1bb485f fix: broaden check workflow path filters to cover all managed content (Julian Pani, 2026-02-08)
ed37457 docs: improve CLI README and related documentation (Julian Pani, 2026-02-08)
7dfb7d9 Merge pull request #25 (JulianPani, 2026-02-08)
b1d919d fix: add worktrees to gitignore (Julian Pani, 2026-02-08)
e01f7d5 feat: add documentation standards skill and doc maintenance agents (Julian Pani, 2026-02-08)
8969a68 docs: fix cli readme (Julian Pani, 2026-02-08)
```
