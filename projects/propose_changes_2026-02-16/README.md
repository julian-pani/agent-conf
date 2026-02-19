# Project: Smooth Downstream-to-Canonical Workflow

**Created:** 2026-02-16
**Branch:** `feat/propose`
**Worktree:** `.worktrees/feat-propose`
**Status:** Implementation complete (Phase 1 + Phase 2)

## Problem Statement

When working in a downstream repo, you often want to iterate on global skills, rules, or AGENTS.md content locally before pushing changes to the canonical repo. Today this workflow is painful:

1. **Pre-commit hook blocks every commit.** The hook runs `agconf check`, which fails if any managed file has been modified. You must pass `--no-verify` on every commit, which is error-prone and annoying.

2. **Proposing changes back to canonical is fully manual.** Once you've landed on good changes, you must: open the canonical repo, find the right files, copy-paste content, create a branch, open a PR. This is tedious and discourages contributing improvements back upstream.

## Goals

- Allow iterating on managed content in feature branches without friction
- Provide a single command to propose downstream changes back to the canonical repo
- Maintain the safety guarantee that `master`/`main` stays in sync with canonical

## Proposed Changes

### 1. Smart Pre-commit Hook: Skip on Feature Branches

**Change:** Modify the generated pre-commit hook to only run `agconf check` when committing to the default branch (typically `master` or `main`).

**Rationale:** The purpose of the hook is to prevent accidental drift on the main branch. Feature branches are, by definition, experimental — you should be free to modify anything. The check still runs on the default branch, preserving the safety net.

**Implementation:**
- Update `generateHookSection()` in `cli/src/core/hooks.ts` to add a branch check
- The hook should detect the current branch (`git symbolic-ref --short HEAD`)
- Skip the check if the branch is not `master` or `main`
- Existing hooks get updated on next `agconf sync`

**Hook behavior (new):**
```bash
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
# Only check on protected branches
case "$current_branch" in
  master|main) ;; # proceed with check
  *) return 0 ;;  # skip on feature branches
esac
```

Hardcode `master` and `main` as protected branches. This covers the vast majority of cases. Configurable protected branches can be added later if needed — keeping it simple for v1.

### 2. New Command: `agconf propose`

**Purpose:** Propose local changes to managed content back to the canonical repository. Creates a branch and opens a PR in the canonical repo.

**User flow:**
```
$ agconf propose
  Detecting changes to managed content...

  Modified files:
    .claude/skills/code-review/SKILL.md (skill)
    .claude/rules/security/api-auth.md (rule)

  Canonical source: github:myorg/agconf-config@abc1234

  ✓ Cloned canonical repo
  ✓ Applied changes to canonical
  ✓ Created branch: propose/code-review-api-auth-20260216
  ✓ Pushed branch
  ✓ Opened PR: https://github.com/myorg/agconf-config/pull/42

  PR title: "Propose changes from downstream: code-review skill, api-auth rule"
```

**Implementation details:**

#### Detecting changes
- Run the same logic as `agconf check` to find modified managed files
- For each modified file, compute a diff against the original (using stored hash or re-fetching from canonical)
- Support all managed content types: skills, rules, agents, AGENTS.md global block

#### Mapping downstream → canonical paths
- Skills: `.claude/skills/<name>/SKILL.md` → `skills/<name>/SKILL.md` (strip agconf metadata from frontmatter)
- Rules: `.claude/rules/<path>` → `rules/<path>` (strip agconf metadata)
- Agents: `.claude/agents/<name>.md` → `agents/<name>.md` (strip agconf metadata)
- AGENTS.md global block: extract content between global markers → `instructions/AGENTS.md`

#### Creating the PR
- Clone the canonical repo to a temp directory (reuse `resolveGithubSource` / `resolveLocalSource`)
- Create a new branch (auto-generated name based on changed content + date)
- Apply the reverse-mapped changes
- Commit and push
- Open PR using `gh pr create` (require `gh` CLI for GitHub sources)
- For local sources, just create the branch and show the path

#### Graceful failure with manual commands
If `git push` or `gh pr create` fails, print the exact commands the user can run to complete the operation manually. The temp clone directory is preserved (not cleaned up) so the user can `cd` into it. Example output on push failure:
```
  ✗ Failed to push branch. You can complete this manually:

    cd /tmp/agconf-propose-abc123
    git push -u origin propose/code-review-20260216

    Then create a PR:
    gh pr create --repo myorg/agconf-config --head propose/code-review-20260216 \
      --title "Propose changes: code-review skill" \
      --body "Proposed from downstream repo my-project"
```

**Options:**
- `--dry-run`: Show what would be proposed without creating anything
- `--title <title>`: Custom PR title
- `--body <body>`: Custom PR body
- `--branch <name>`: Custom branch name
- `--files <glob>`: Only propose specific files (instead of all changes)

### 3. Enhanced `agconf check` Output

**Change:** When `agconf check` detects modifications, mention the `agconf propose` command in the output as a way to upstream the changes.

**Before:**
```
Modified managed files:
  .claude/skills/code-review/SKILL.md
```

**After:**
```
Modified managed files:
  .claude/skills/code-review/SKILL.md

To propose these changes to canonical: agconf propose
To restore original content: agconf sync
```

### 4. Updated Hook Error Message

**Change:** Add `agconf propose` as an option in the pre-commit hook error message.

Currently the hook lists 5 options when blocking a commit. Add a 6th:
```
  6. Propose changes upstream: agconf propose
```

## Architecture Decisions

### Why branch-based skip (not a flag or mode)?
- A persistent "edit mode" flag adds state and complexity
- Branch detection is simple, reliable, and matches existing Git workflows
- No new config or state management needed
- The mental model is natural: "main is canonical, branches are for experimentation"

### Why `gh` CLI for PR creation?
- Already used in the codebase for cloning (`source.ts`)
- Handles authentication automatically
- Well-supported, reliable, works in CI
- Avoids implementing GitHub API auth from scratch

### Why strip metadata before proposing?
- Metadata (`agconf_managed`, `agconf_content_hash`, etc.) is downstream-only
- Canonical files don't have this metadata — it gets added during sync
- Proposing should produce a clean diff in the canonical repo

## Implementation Plan

### Phase 1: Smart Hook (small, high-impact)
1. Update `generateHookSection()` to add branch detection (hardcode `master`/`main`)
2. Update tests for hook generation
3. Update hook error message to mention `agconf propose`

### Phase 2: `agconf propose` Command
1. Create `cli/src/commands/propose.ts`
2. Add change detection logic (reuse from check)
3. Add path mapping (downstream → canonical)
4. Add metadata stripping logic
5. Add canonical repo cloning and branch creation
6. Add PR creation (GitHub) or local branch display (local)
7. Register command in CLI entry point
8. Add shell completions
9. Write tests

### Phase 3: Polish
1. Update `check` command output to mention `propose`
2. Update documentation
3. Edge cases: partial proposals, conflict handling, no-changes detection

## Edge Cases to Handle

- **No changes detected:** Exit cleanly with message
- **Canonical is local path:** Create branch but don't try `gh pr create`; show instructions
- **`git push` fails:** Preserve temp directory, print exact `git push` and `gh pr create` commands for manual completion
- **`gh pr create` fails:** Branch is already pushed; print the `gh pr create` command to retry
- **No `gh` CLI available:** Fall back to creating branch + push, show manual PR URL
- **Lockfile missing:** Error with helpful message
- **Source has moved on:** Canonical may have newer commits than what was synced. The propose should base off the current canonical HEAD, not the pinned version. If the files being changed don't exist in canonical HEAD, warn.
- **Multiple downstream repos proposing:** Each gets its own branch, PRs can be reviewed independently
- **Merge conflicts in canonical:** Let the PR show conflicts; don't try to auto-resolve

## Files to Modify/Create

### New files
- `cli/src/commands/propose.ts` — The new command
- `cli/src/core/propose.ts` — Core logic (change detection, path mapping, metadata stripping)
- `cli/tests/unit/propose.test.ts` — Tests for branch naming

### Modified files
- `cli/src/core/hooks.ts` — Branch-aware hook generation (hardcode `master`/`main`), propose mention in error
- `cli/tests/unit/hooks.test.ts` — Updated hook tests (3 new tests)
- `cli/src/commands/check.ts` — `propose` + `sync` hints in output
- `cli/src/commands/completion.ts` — `propose` command completions
- `cli/src/cli.ts` — Register new command with all options

## Open Questions

1. **Should `propose` auto-sync after PR merge?** Could add a `--sync-after` flag, but probably YAGNI for v1.
2. **Should we support proposing new files (not just modifications)?** e.g., creating a new skill from downstream. Probably yes for v2 but out of scope for v1.
3. **Branch naming convention?** `propose/<downstream-repo>/<content-summary>-<date>` seems reasonable.
4. **Should protected branches be configurable?** For v1, hardcode `master`/`main`. If users need custom branches (e.g., `release/*`), add config later.

## Progress Log

- **2026-02-16:** Project created. Initial analysis and design document.
- **2026-02-16:** Feedback round 1 — (1) Added graceful failure handling: print manual commands when push/PR creation fails, preserve temp dir. (2) Simplified hook config: hardcode `master`/`main` instead of configurable protected branches. Removed downstream config schema change from Phase 1.
- **2026-02-16:** Implementation complete. All phases implemented:
  - Phase 1: Smart hook skips on feature branches, mentions `agconf propose` in error
  - Phase 2: `agconf propose` command with full flow (detect → map → clone → branch → commit → push → PR)
  - Phase 3: `agconf check` output mentions both `propose` and `sync`
  - All checks pass: lint, typecheck, 648 tests (8 new)
