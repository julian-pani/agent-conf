# Documentation vs Implementation Audit

**Date:** 2026-02-01
**Auditor:** Claude Opus 4.5
**Scope:** agent-conf CLI codebase

---

## Summary

This audit compares documentation files against the actual implementation in the agent-conf CLI. Several gaps were identified ranging from critical (incorrect command documentation) to minor (stale references). The recent commits on 2026-02-01 introduced new features (custom marker prefix, sync summary files) and changed version handling, some of which are not fully documented.

**Key Findings:**
- 2 Critical gaps (outdated command documentation)
- 5 Medium gaps (missing documentation for new features, outdated paths)
- 4 Minor gaps (stale info, inconsistencies)

---

## Critical Gaps

### 1. AGENTS.md lists wrong command count

**File:** `/Users/julianpani/personal/code/agent-conf/AGENTS.md`
**Line:** 57

**Documentation says:**
```
Commands: init, sync, status, check, upgrade-cli, canonical (init, update), config, completion
```

**But the old comment said (line 56-57 in older version):**
```
### Commands (`cli/src/commands/`)
10 commands: init, sync, status, check, update, upgrade-cli, init-canonical-repo, config, completion, shared
```

**Actual implementation (`cli/src/cli.ts`):**
- `init`
- `sync`
- `status`
- `check`
- `upgrade-cli`
- `config` (with subcommands: show, get, set)
- `completion` (with subcommands: install, uninstall)
- `canonical` (with subcommands: init, update)

**Issue:** The documentation lists 8 commands but references old command names. The `update` command was removed and merged into `sync` (per CHANGELOG). The `init-canonical-repo` command was renamed to `canonical init`.

**Recommendation:** Update AGENTS.md line 57 to accurately reflect the current command structure.

---

### 2. README documents `--repo` option for `upgrade-cli` that does not exist

**File:** `/Users/julianpani/personal/code/agent-conf/README.md`
**Lines:** 188-198

**Documentation says:**
```bash
# First time: specify the CLI repository
agent-conf upgrade-cli --repo your-org/agent-conf

# Subsequent times: uses saved config
agent-conf upgrade-cli
```

**Actual implementation (`cli/src/commands/upgrade-cli.ts`):**
```typescript
export interface UpgradeCliOptions {
  yes?: boolean;
}
```

The `upgrade-cli` command ONLY accepts `--yes` option. There is NO `--repo` flag. The command now fetches from npm registry directly:
```typescript
const NPM_PACKAGE_NAME = "agent-conf";
async function getLatestNpmVersion(): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`);
  // ...
}
```

**Recommendation:** Remove the `--repo` documentation from README.md lines 188-198. Update to:
```bash
# Upgrade to latest from npm
agent-conf upgrade-cli

# Non-interactive mode
agent-conf upgrade-cli --yes
```

---

## Medium Gaps

### 1. New `--summary-file` and `--expand-changes` options not documented

**Files affected:**
- `/Users/julianpani/personal/code/agent-conf/README.md`
- `/Users/julianpani/personal/code/agent-conf/cli/docs/VERSIONING.md`

**Implementation (`cli/src/cli.ts` lines 95-96):**
```typescript
.option("--summary-file <path>", "Write sync summary to file (markdown, for CI)")
.option("--expand-changes", "Show all items in output (default: first 5)")
```

**Commit:** `5562f9a feat(sync): add detailed sync summary for workflow PR descriptions`

**Issue:** These new options for the `sync` command are not documented anywhere. The `--summary-file` option is particularly important for CI workflows as it generates markdown for PR descriptions.

**Recommendation:** Add to README.md under the `agent-conf sync` section:
```bash
# Write sync summary to file (for CI PR descriptions)
agent-conf sync --summary-file /tmp/summary.md

# Show all changed items (default truncates to first 5)
agent-conf sync --expand-changes
```

---

### 2. Custom marker prefix feature not fully documented for downstream usage

**Files affected:**
- `/Users/julianpani/personal/code/agent-conf/README.md`
- `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md`

**Implementation:** The `--marker-prefix` option is documented for `canonical init` but there's no documentation explaining:
1. How the marker prefix flows from canonical repo to downstream repos (stored in lockfile)
2. How downstream repos know which prefix to use during `check` command
3. The relationship between `agent-conf.yaml`'s `markers.prefix` and the resulting HTML comments

**Commit:** `3c7b76b feat(markers): wire custom marker prefix through entire sync pipeline`

**Actual behavior (`cli/src/core/lockfile.ts` lines 47-62):**
- The marker prefix is stored in `lockfile.json` under `content.marker_prefix`
- The sync and check commands read this from the lockfile

**Recommendation:** Add a section to CANONICAL_REPOSITORY_SETUP.md explaining:
- How marker prefix propagates to downstream repos
- Example of custom marker prefix in AGENTS.md (`<!-- my-org:global:start -->`)
- When/why to use a custom prefix

---

### 3. Version handling documentation is outdated

**File:** `/Users/julianpani/personal/code/agent-conf/cli/docs/VERSIONING.md`
**Lines:** 228-232

**Documentation says:**
```json
{
  // ...
  "cli_version": "1.2.0"
}
```

**Actual implementation (`cli/src/core/lockfile.ts` line 75-76):**
```typescript
export function getCliVersion(): string {
  return typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "0.0.0";
}
```

**Commit:** `9b308e0 fix(lockfile): inject CLI version from package.json at build time`

**Issue:** The documentation doesn't explain that CLI version is injected at build time via tsup's `define` option. This is relevant for developers who might be confused why `getCliVersion()` returns "0.0.0" during development (when running with tsx).

**Recommendation:** Add a note explaining the build-time injection mechanism in VERSIONING.md.

---

### 4. cli/README.md missing `upgrade-cli` and `config` commands

**File:** `/Users/julianpani/personal/code/agent-conf/cli/README.md`
**Lines:** 22-30

**Documentation shows:**
| Command | Description |
|---------|-------------|
| `init` | Initialize repo from a canonical source |
| `sync` | Sync content from canonical repo (fetches latest by default) |
| `status` | Show current sync status |
| `check` | Verify managed files are unchanged |
| `canonical init` | Scaffold a new canonical repository |
| `canonical update` | Update CLI version in workflow files |

**Missing commands:**
- `upgrade-cli` - Upgrade the CLI to the latest version
- `config` - Manage global CLI configuration
- `completion` - Shell completion management

**Recommendation:** Update the table to include all commands for consistency with main README.md.

---

### 5. CHECK_FILE_INTEGRITY.md shows old workflow format

**File:** `/Users/julianpani/personal/code/agent-conf/cli/docs/CHECK_FILE_INTEGRITY.md`
**Lines:** 163-169

**Documentation shows:**
```yaml
jobs:
  check:
    uses: your-org/your-content-repo/.github/workflows/check-reusable.yml@v1.0.0
    secrets:
      token: ${{ secrets.GITHUB_TOKEN }}
```

**Actual generated workflow (`cli/src/commands/canonical.ts` lines 377-406):**
```yaml
on:
  workflow_call:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      # ... no secrets.token required
```

**Commit:** `7f9a7f7 fix(workflows): remove token requirement from check workflow`

**Issue:** The documentation still shows `secrets: token: ...` but the check workflow no longer requires a token parameter.

**Recommendation:** Update CHECK_FILE_INTEGRITY.md to remove the `secrets` block from the workflow example.

---

## Minor Gaps

### 1. CHANGELOG.md has duplicate [Unreleased] sections

**File:** `/Users/julianpani/personal/code/agent-conf/cli/CHANGELOG.md`
**Lines:** 88-103 and 156-165

The CHANGELOG has duplicate content and formatting issues:
- Lines 88-92 have Jekyll frontmatter mixed in with changelog entries
- Two `[Unreleased]` sections (line 94 and line 156)
- Duplicate content about the `update` command removal

**Recommendation:** Clean up the CHANGELOG to have a single [Unreleased] section and proper formatting.

---

### 2. README.md config key documentation is incomplete

**File:** `/Users/julianpani/personal/code/agent-conf/README.md`
**Lines:** 267-268

**Documentation says:**
```
**Available config keys:**
- `cli-repo` - The repository where the CLI is hosted (used by `upgrade-cli`)
```

**Issue:** The `cli-repo` config key is documented but `upgrade-cli` no longer uses it (it fetches from npm). This config key may be orphaned/unused.

**Recommendation:** Verify if `cli-repo` is still used anywhere. If not, remove it from documentation.

---

### 3. CANONICAL_REPOSITORY_SETUP.md outdated workflow secrets reference

**File:** `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md`
**Line:** 368

**Documentation says:**
```
The default workflow files use `secrets.AGENT_CONF_TOKEN`. No changes needed if you used that secret name.
```

**Actual implementation:** The check workflow no longer requires tokens. The sync workflow uses `secrets.token` as a generic name, not `AGENT_CONF_TOKEN`.

**Recommendation:** Update the secret naming guidance to reflect actual workflow parameters.

---

### 4. Plugin system documentation mentions "GitHub Copilot" but only "codex" is implemented

**File:** `/Users/julianpani/personal/code/agent-conf/AGENTS.md`
**Lines:** 52-54

**Documentation says:**
```
### Plugin System (`cli/src/plugins/`)
- `targets/` - Agent implementations (Claude Code, GitHub Copilot)
```

**Actual implementation (`cli/src/core/targets.ts`):**
- Supported targets are `claude` and `codex`
- There's no "GitHub Copilot" target, though "codex" might be intended for that

**Recommendation:** Clarify what "codex" target represents or update the documentation to say "Codex" instead of "GitHub Copilot".

---

## Recommendations Summary

### Priority 1 (Critical - Fix Immediately)
1. Remove `--repo` flag documentation from `upgrade-cli` in README.md
2. Update command list in AGENTS.md

### Priority 2 (Medium - Should Fix Soon)
3. Document `--summary-file` and `--expand-changes` options
4. Add marker prefix propagation documentation
5. Update workflow examples to remove obsolete token requirements
6. Add missing commands to cli/README.md

### Priority 3 (Minor - Fix When Convenient)
7. Clean up duplicate CHANGELOG sections
8. Review and update `cli-repo` config documentation
9. Clarify plugin target naming (Copilot vs Codex)
10. Add note about build-time version injection

---

## Files Reviewed

| File | Status |
|------|--------|
| `/Users/julianpani/personal/code/agent-conf/README.md` | Needs updates |
| `/Users/julianpani/personal/code/agent-conf/AGENTS.md` | Needs updates |
| `/Users/julianpani/personal/code/agent-conf/cli/README.md` | Needs updates |
| `/Users/julianpani/personal/code/agent-conf/cli/CONTRIBUTING.md` | OK |
| `/Users/julianpani/personal/code/agent-conf/cli/CHANGELOG.md` | Has formatting issues |
| `/Users/julianpani/personal/code/agent-conf/cli/docs/VERSIONING.md` | Minor updates needed |
| `/Users/julianpani/personal/code/agent-conf/cli/docs/CANONICAL_REPOSITORY_SETUP.md` | Needs updates |
| `/Users/julianpani/personal/code/agent-conf/cli/docs/CHECK_FILE_INTEGRITY.md` | Needs updates |

---

## Implementation Files Verified

| File | Purpose |
|------|---------|
| `cli/src/cli.ts` | Command registration |
| `cli/src/commands/upgrade-cli.ts` | Upgrade command (no --repo flag) |
| `cli/src/commands/sync.ts` | Sync command with new options |
| `cli/src/commands/shared.ts` | Shared sync logic |
| `cli/src/commands/canonical.ts` | Canonical init/update |
| `cli/src/core/lockfile.ts` | Version handling, marker prefix storage |
| `cli/src/core/markers.ts` | Marker prefix handling |
| `cli/src/config/schema.ts` | Configuration schemas |
| `cli/tsup.config.ts` | Build-time version injection |
| `.github/workflows/release.yml` | Release workflow |
