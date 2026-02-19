# Prevention Analysis

## Summary

**Findings analyzed**: 21 code-quality issues, 17 legacy/dead-code items, 8 test-coverage gaps, 15 documentation issues, 5 naming + 4 misplaced + 2 SRP module-organization issues. Total: ~67 individual findings across 5 audit reports.

**Findings with prevention recommendations**: 18 (focusing on critical, high, and medium priority items that represent recurring issue classes).

**Breakdown by enforcement level**:

| Level | Count | Description |
|-------|-------|-------------|
| Instructional (AGENTS.md) | 8 | New or strengthened instructions in AGENTS.md |
| Instructional (`.claude/rules/`) | 3 | Path-specific rules for targeted enforcement |
| Automated check (Hook) | 2 | PostToolUse and Stop hooks for pattern detection |
| No action needed | 5 | One-off issues that don't represent recurring classes |

---

## Findings Where Instructions Already Exist But Weren't Followed

### 1. Shell completions missing `--pinned`, `--summary-file`, `--expand-changes`

- **Audit source**: Code Quality #17, Legacy/Dead Code "Shell Completions Missing Options", Documentation #3
- **Existing instruction**: AGENTS.md, "Important Guidelines > CLI Command Changes" section:
  > "When adding or modifying CLI commands, always update the shell completions in `cli/src/commands/completion.ts` accordingly. The completions provide tab-completion for commands, subcommands, and options."
- **Why it wasn't followed**: The instruction is clear but easily forgotten because it is a secondary concern when the primary task is implementing a new CLI option. The instruction is in a "Guidelines" section at the bottom of AGENTS.md, separated from the architecture section where CLI commands are discussed. There is no automated verification that completions match the actual CLI definition, so drift accumulates silently.
- **Recommendation**: Two-level approach: (1) strengthen the instruction by placing a reminder directly in the CLI Commands architecture section, and (2) add a `Stop` hook that checks for completion/CLI option drift when files in `cli/src/` are modified.
- **Implementation**:

  **AGENTS.md change** -- Add cross-reference in the Commands subsection:

  ```markdown
  ### Commands (`cli/src/commands/`)
  Commands: init, sync, check, upgrade-cli, canonical (init), config, completion

  > **Reminder**: When modifying command options in `cli/src/cli.ts`, you MUST also update `cli/src/commands/completion.ts`. See [CLI Command Changes](#cli-command-changes) for details.
  ```

  **Stop hook** -- Add to `.claude/settings.json`:

  ```json
  {
    "hooks": {
      "Stop": [
        {
          "hooks": [
            {
              "type": "prompt",
              "prompt": "Check whether any CLI command options were added or modified in this session. Look at the tool calls in the conversation for edits to cli/src/cli.ts. If CLI options were changed, check whether cli/src/commands/completion.ts was also updated to include the new options. Respond with {\"ok\": true} if completions are up to date or no CLI options were changed, or {\"ok\": false, \"reason\": \"You added/modified CLI options in cli.ts but did not update completion.ts to match. Update the COMMANDS object in completion.ts to include the new options.\"}"
            }
          ]
        }
      ]
    }
  }
  ```

### 2. Content hash consistency -- 7 separate hash computation sites despite AGENTS.md instruction

- **Audit source**: Code Quality #3 (duplicated hash computation functions, 7 locations)
- **Existing instruction**: AGENTS.md, "Important Guidelines > Content Hash Consistency" section:
  > "**Reuse existing hash functions - DO NOT create new ones:**
  > - `computeContentHash()` from `cli/src/core/managed-content.ts` - for skill/rule file frontmatter
  > - `computeGlobalBlockHash()` from `cli/src/core/markers.ts` - for AGENTS.md global block
  > - `computeRulesSectionHash()` from `cli/src/core/markers.ts` - for AGENTS.md rules section
  >
  > All these functions return `sha256:${hash.slice(0, 12)}` format. When adding new content types, import and use these existing functions rather than computing hashes inline."
- **Why it wasn't followed**: The instruction was added *after* the duplication already existed -- it prevents future duplication but does not address the existing instances. The instruction says "DO NOT create new ones" but the existing codebase still has 7 separate `createHash("sha256")` call sites with subtle differences (some trim input, some don't). This is a pre-existing condition that the instruction has not yet been enforced against retroactively.
- **Recommendation**: (1) The code fix is to consolidate hash functions (tracked as a code quality remediation). (2) Strengthen the instruction to explicitly state that a single `computeSha256Hash` utility should be used everywhere, not just for new content types. (3) Add a `.claude/rules/` file scoped to hash-related paths.
- **Implementation**:

  **AGENTS.md change** -- Update the Content Hash Consistency section:

  ```markdown
  ### Content Hash Consistency
  **Critical:** All content hashes MUST use the same format: `sha256:` prefix + 12 hex characters.

  **There MUST be a single hash utility function.** All hash computation in the codebase should flow through one shared function (e.g., `computeSha256Hash(content: string): string` in a shared utility). The current separate functions (`computeContentHash`, `computeGlobalBlockHash`, `computeRulesSectionHash`, `hashContent`) should all delegate to this single implementation.

  **DO NOT:**
  - Create new `createHash("sha256")` call sites anywhere in the codebase
  - Duplicate the hash pattern `sha256:${hash.slice(0, 12)}` inline

  **DO:**
  - Import and use the shared hash utility for all content hashing
  - If you need a new hash function for a specific domain, create a thin wrapper that calls the shared utility
  ```

### 3. Phantom `canonical update` command documented but not implemented

- **Audit source**: Documentation #1 (critical), referenced in 4 files
- **Existing instruction**: AGENTS.md line 54 itself lists "canonical (init, update)" -- the instruction file is *part of the problem*, not the solution.
- **Why it wasn't followed**: This is not a case of an instruction being ignored; rather, the documentation (including AGENTS.md) was written to describe planned functionality that was never implemented, or was removed without updating all references. AGENTS.md became stale.
- **Recommendation**: (1) Fix AGENTS.md to reflect reality (remove "update" from the commands list). (2) Add an instruction about keeping AGENTS.md synchronized with actual code. This is a documentation staleness issue, not a recurring code pattern, so instruction-level enforcement is sufficient.
- **Implementation**:

  **AGENTS.md change** -- In the Commands subsection, change:

  ```
  Commands: init, sync, check, upgrade-cli, canonical (init, update), config, completion
  ```

  to:

  ```
  Commands: init, sync, check, upgrade-cli, canonical (init), config, completion
  ```

  **AGENTS.md change** -- Add to Important Guidelines:

  ```markdown
  ### Documentation Synchronization
  When removing or renaming CLI commands, subcommands, or options, update ALL documentation references:
  - `AGENTS.md` (Commands list and any architecture references)
  - Root `README.md` (command tables and usage examples)
  - `cli/README.md`
  - `cli/docs/` guides that reference the command
  - `cli/src/commands/completion.ts` (shell completions)
  ```

---

## Findings Needing New Instructions

### 4. Incorrect fallback key prefix in check.ts (`"agent_conf_"` instead of `"agconf_"`)

- **Audit source**: Code Quality #1 (critical)
- **Root cause**: No instruction exists about what fallback values should be used when `markerPrefix` is undefined. The developer who wrote this line used `"agent_conf_"` (perhaps confusing the project name pattern) instead of `"agconf_"` which is the actual default. This is a correctness bug, not a process issue.
- **Recommendation**: This is primarily a code fix, but to prevent similar bugs in the future, add an instruction about the canonical default prefix value.
- **Implementation**:

  **AGENTS.md change** -- Add to Key Patterns section:

  ```markdown
  - **Default prefix**: The canonical default prefix is `"agconf"` (defined as `DEFAULT_MARKER_PREFIX` in `config/schema.ts` and `DEFAULT_METADATA_PREFIX` in `managed-content.ts`). When writing fallback values, always reference these constants rather than hardcoding the string. Never use `"agent_conf"` or other variations.
  ```

### 5. Non-reversible prefix normalization between sync and check

- **Audit source**: Code Quality #2 (critical), Legacy/Dead Code "Metadata Prefix Conversion Pattern" (8+ locations)
- **Root cause**: No instruction exists about prefix normalization. The dash-to-underscore and underscore-to-dash conversions are scattered across 8+ files without a shared utility, and the round-trip is not reversible for prefixes containing both dashes and underscores.
- **Recommendation**: Add an instruction requiring a single normalization utility, and document the constraint that prefixes must use only dashes (never underscores) in user-facing config, with underscore conversion handled by a single utility.
- **Implementation**:

  **AGENTS.md change** -- Add to Key Patterns section:

  ```markdown
  - **Prefix normalization**: Marker prefixes (used in HTML comments) use dashes (e.g., `my-prefix`). Metadata prefixes (used in YAML frontmatter keys) use underscores (e.g., `my_prefix`). Conversion between these forms MUST use the shared utility functions `toMarkerPrefix(prefix)` and `toMetadataPrefix(prefix)` (to be created in `cli/src/utils/prefix.ts`). DO NOT use inline `.replace(/-/g, "_")` or `.replace(/_/g, "-")` calls scattered across files. The original `markerPrefix` should be passed through to functions that need it, rather than converting back and forth.
  ```

### 6. Over-exported functions (7 in workflows.ts, types in merge.ts/source.ts, schemas in config/schema.ts)

- **Audit source**: Legacy/Dead Code #2-8 (unused exports in workflows.ts), #10-17 (unused exported types/schemas)
- **Root cause**: No instruction exists about export hygiene. Functions are exported "just in case" during initial development and never cleaned up.
- **Recommendation**: Add an instruction about minimal exports.
- **Implementation**:

  **AGENTS.md change** -- Add to Important Guidelines:

  ```markdown
  ### Export Hygiene
  Only export functions, types, and constants that are imported by other modules. If a symbol is only used within its own file (or only by tests), do not export it. Periodically check for unused exports -- a function that was once needed externally may no longer be after refactoring. Test files can access non-exported functions by testing through the module's public API.
  ```

### 7. Duplicated utility patterns (readFileIfExists, directoryExists, list formatting)

- **Audit source**: Code Quality #8 (readFileIfExists, 6 locations), #9 (directoryExists, 2 locations), #4 (formatList, 4 locations)
- **Root cause**: No instruction about checking for existing utilities before creating new ones. Each module independently implements the same pattern.
- **Recommendation**: Add an instruction about utility reuse.
- **Implementation**:

  **AGENTS.md change** -- Add to Important Guidelines:

  ```markdown
  ### Utility Reuse
  Before writing a helper function for file I/O, hashing, prefix conversion, or other common patterns, check `cli/src/utils/` and existing core modules for an existing implementation. Common utilities that MUST be reused:
  - **File existence checks**: `fileExists()`, `directoryExists()` from `cli/src/utils/fs.ts`
  - **Read file if exists**: `readFileIfExists()` (to be promoted from `merge.ts` to `cli/src/utils/fs.ts`)
  - **Hash computation**: Single shared hash utility (see Content Hash Consistency)
  - **Prefix conversion**: `toMarkerPrefix()` / `toMetadataPrefix()` (see Prefix Normalization)

  If a utility does not exist yet but the pattern appears in 2+ locations, extract it to `cli/src/utils/` before duplicating.
  ```

### 8. Type assertion overuse for frontmatter metadata (12+ locations)

- **Audit source**: Code Quality #7 (12+ `as Record<string, string>` casts)
- **Root cause**: No instruction about avoiding type assertions for data from external sources (parsed YAML frontmatter).
- **Recommendation**: Add a targeted instruction. This is a code-quality concern that instruction alone can address since it is a style/pattern issue.
- **Implementation**:

  **AGENTS.md change** -- Add to Key Patterns section under a new sub-heading:

  ```markdown
  - **Frontmatter type safety**: Do not cast `frontmatter.metadata` to `Record<string, string>` directly. Use the type-safe accessor (e.g., `getStringMetadata(frontmatter, key): string | undefined`) that validates values are strings at runtime. This prevents silent bugs if metadata contains non-string values.
  ```

### 9. `performSync` function exceeds 500 lines

- **Audit source**: Code Quality #6 (500+ lines, 8 responsibilities), Module Organization SRP #2 (842-line shared.ts)
- **Root cause**: No instruction about function size limits. The function grew incrementally as features were added.
- **Recommendation**: Add a guideline about function complexity. This is instructional -- the agent would decompose if told to.
- **Implementation**:

  **AGENTS.md change** -- Add to Important Guidelines:

  ```markdown
  ### Function Complexity
  Keep functions under ~200 lines. When a function exceeds this threshold, decompose it into smaller functions with clear single responsibilities. In particular, separate business logic from UI/output rendering. For example, sync execution logic should be separate from summary display logic.
  ```

### 10. Untested command files (config.ts, upgrade-cli.ts, sync.ts orchestration)

- **Audit source**: Test Coverage gaps #1-#3, missing test types #1-#3
- **Root cause**: No instruction requiring tests for command-level orchestration. The existing testing instruction says "Write comprehensive unit and integration tests" but does not specifically call out command files.
- **Recommendation**: Strengthen the testing instruction to explicitly require command-level tests.
- **Implementation**:

  **AGENTS.md change** -- Update Testing Requirements:

  ```markdown
  ### Testing Requirements
  **No manual tests.** All tests must be runnable programmatically via `pnpm test`. When implementing new features:
  - Write comprehensive unit and integration tests
  - **Every command file in `cli/src/commands/` must have a corresponding test file** that covers flag validation, error paths, and orchestration logic -- not just integration-level coverage
  - Avoid any verification steps that require manual execution
  - Use temp directories and mocks for file system and external dependencies
  - For commands that use `process.cwd()`, add a `cwd` option for testability
  ```

---

## Findings Needing Automated Enforcement

### 11. Shell completions drift detection (Stop hook)

- **Audit source**: Code Quality #17, Documentation #3
- **Why instructions alone aren't sufficient**: An instruction already exists in AGENTS.md and was not followed. The completions were missed across multiple PRs adding `--pinned`, `--summary-file`, and `--expand-changes`. This is the textbook case of "instruction exists but easily forgotten" -- the completion update is a secondary action that's easy to overlook when the primary focus is implementing the feature.
- **Mechanism**: `Stop` hook with `type: "prompt"` that checks whether CLI options were modified without corresponding completion updates.
- **Implementation**: Add to `.claude/settings.json`:

  ```json
  {
    "hooks": {
      "Stop": [
        {
          "hooks": [
            {
              "type": "prompt",
              "prompt": "Review the conversation to determine if any CLI command options were added, removed, or modified in cli/src/cli.ts during this session. If so, verify that cli/src/commands/completion.ts was also updated to include/remove those options in the COMMANDS object. Respond with {\"ok\": true} if (a) no CLI options were changed, or (b) completion.ts was updated accordingly. Respond with {\"ok\": false, \"reason\": \"CLI options were modified in cli.ts but completion.ts was not updated. The following options need to be added/updated in the COMMANDS object in completion.ts: [list them].\"} if completions are out of sync."
            }
          ]
        }
      ]
    }
  }
  ```

  **Rationale**: A `Stop` hook with `type: "prompt"` is lightweight -- it only fires when the agent finishes, uses a fast model (Haiku), and adds negligible overhead. It catches the exact failure mode observed: options added to `cli.ts` without corresponding `completion.ts` updates. This is preferred over a `PostToolUse` hook on every Edit (too noisy) or a PreToolUse hook (nothing to block). The `Stop` hook provides a reminder before the agent declares the task complete.

### 12. Documentation-code synchronization check for commands (Stop hook)

- **Audit source**: Documentation #1 (phantom canonical update), #4 (undocumented --debug), #5 (undocumented --package-manager)
- **Why instructions alone aren't sufficient**: The phantom `canonical update` command persisted across multiple development cycles without being caught. Documentation references existed in 4 separate files. This indicates that documentation synchronization is systematically overlooked when commands change.
- **Mechanism**: A `.claude/rules/` file scoped to command-related paths that reminds the agent to check documentation when modifying CLI commands.
- **Implementation**: Create `.claude/rules/cli-commands.md`:

  ```markdown
  ---
  paths:
    - "cli/src/cli.ts"
    - "cli/src/commands/*.ts"
  ---

  # CLI Command Modification Checklist

  When adding, removing, or modifying CLI commands or options:

  1. **Shell completions**: Update `cli/src/commands/completion.ts` COMMANDS object
  2. **AGENTS.md**: Update the Commands list if adding/removing commands
  3. **Root README.md**: Update command tables and usage examples
  4. **cli/README.md**: Update command summary table
  5. **Relevant docs/ guides**: Check `cli/docs/` for references to the modified command
  6. **Tests**: Add/update tests for new flags and options
  ```

  **Rationale**: A `.claude/rules/` file scoped to CLI-related paths is loaded automatically when the agent reads or edits those files. This is lighter than a hook and surfaces the checklist at the moment the agent is working on command changes. Combined with the Stop hook for completions specifically, this provides layered defense.

---

## Findings Not Requiring Prevention Mechanisms

The following findings are one-off code issues that should be fixed directly but do not represent recurring issue classes warranting new instructions or automation:

1. **`syncWorkflows` union type for backward compatibility** (Code Quality #5) -- One-time refactor to clean up the API.
2. **`_source` parameter unused in `mergeAgentsMd`** (Code Quality #14) -- Simple cleanup, remove the parameter.
3. **`_commandName` parameter unused in `resolveVersion`** (Code Quality #18) -- Simple cleanup.
4. **`parseSimpleYaml` limitation** (Code Quality #19) -- Known limitation of a deliberate design choice.
5. **`compareVersions` input validation** (Code Quality #20) -- Defensive coding fix.
6. **`checkCliVersionMismatch` redundant lockfile read** (Code Quality #21) -- Performance optimization.
7. **`WorkflowConfig` name collision** (Legacy/Dead Code deprecated pattern #2) -- One-time rename.
8. **Inconsistent ENOENT handling patterns** (Legacy/Dead Code deprecated pattern #1) -- Consolidation refactor.
9. **Unsafe type assertions in version.ts and canonical.ts** (Code Quality #11, #12) -- Type safety fixes.
10. **`DEFAULT_CLI_NAME` duplicated** (Code Quality #13) -- Extract to shared constant.

---

## Proposed Changes Summary

### AGENTS.md Changes

All changes below target `/Users/julianpani/personal/code/agent-conf/AGENTS.md`.

**1. Fix Commands list (Finding #3)**

Change line 54 from:
```
Commands: init, sync, check, upgrade-cli, canonical (init, update), config, completion
```
to:
```
Commands: init, sync, check, upgrade-cli, canonical (init), config, completion
```

Add a reminder note after the Commands line:
```markdown
> **Reminder**: When modifying command options in `cli/src/cli.ts`, you MUST also update `cli/src/commands/completion.ts`. See [CLI Command Changes](#cli-command-changes).
```

**2. Add Default Prefix documentation to Key Patterns (Finding #4)**

Add bullet:
```markdown
- **Default prefix**: The canonical default prefix is `"agconf"` (defined as `DEFAULT_MARKER_PREFIX` in `config/schema.ts` and `DEFAULT_METADATA_PREFIX` in `managed-content.ts`). When writing fallback values, always reference these constants rather than hardcoding the string. Never use `"agent_conf"` or other variations.
```

**3. Add Prefix Normalization documentation to Key Patterns (Finding #5)**

Add bullet:
```markdown
- **Prefix normalization**: Marker prefixes (used in HTML comments) use dashes (e.g., `my-prefix`). Metadata prefixes (used in YAML frontmatter keys) use underscores (e.g., `my_prefix`). Conversion between these forms MUST use shared utility functions (`toMarkerPrefix()` / `toMetadataPrefix()`). DO NOT use inline `.replace(/-/g, "_")` or `.replace(/_/g, "-")` calls. Pass the original `markerPrefix` through to functions that need it rather than converting back and forth.
```

**4. Add Frontmatter Type Safety to Key Patterns (Finding #8)**

Add bullet:
```markdown
- **Frontmatter type safety**: Do not cast `frontmatter.metadata` to `Record<string, string>` directly. Use a type-safe accessor that validates values are strings at runtime to prevent silent bugs from non-string metadata values.
```

**5. Strengthen Content Hash Consistency (Finding #2)**

Replace the existing Content Hash Consistency section with:
```markdown
### Content Hash Consistency
**Critical:** All content hashes MUST use the same format: `sha256:` prefix + 12 hex characters.

**There MUST be a single hash utility function.** All hash computation should flow through one shared function. The current separate functions (`computeContentHash`, `computeGlobalBlockHash`, `computeRulesSectionHash`, `hashContent`) should all delegate to a single implementation.

**DO NOT:**
- Create new `createHash("sha256")` call sites anywhere in the codebase
- Duplicate the hash pattern `sha256:${hash.slice(0, 12)}` inline

**DO:**
- Import and use the shared hash utility for all content hashing
- If you need a new domain-specific hash function, create a thin wrapper that calls the shared utility
```

**6. Add Documentation Synchronization guideline (Finding #3)**

Add new subsection to Important Guidelines:
```markdown
### Documentation Synchronization
When removing or renaming CLI commands, subcommands, or options, update ALL documentation references:
- `AGENTS.md` (Commands list and architecture references)
- Root `README.md` (command tables and usage examples)
- `cli/README.md`
- `cli/docs/` guides that reference the command
- `cli/src/commands/completion.ts` (shell completions)
```

**7. Add Export Hygiene guideline (Finding #6)**

Add new subsection to Important Guidelines:
```markdown
### Export Hygiene
Only export functions, types, and constants that are imported by other modules. If a symbol is only used within its own file (or only by tests), do not export it. Test files should access non-exported functions by testing through the module's public API.
```

**8. Add Utility Reuse guideline (Finding #7)**

Add new subsection to Important Guidelines:
```markdown
### Utility Reuse
Before writing a helper function for file I/O, hashing, prefix conversion, or other common patterns, check `cli/src/utils/` and existing core modules for an existing implementation. Common utilities that MUST be reused:
- **File existence checks**: `fileExists()`, `directoryExists()` from `cli/src/utils/fs.ts`
- **Read file if exists**: `readFileIfExists()` from `cli/src/utils/fs.ts`
- **Hash computation**: Single shared hash utility (see Content Hash Consistency)
- **Prefix conversion**: `toMarkerPrefix()` / `toMetadataPrefix()` (see Prefix Normalization above)

If a utility does not exist yet but the pattern appears in 2+ locations, extract it to `cli/src/utils/` before duplicating.
```

**9. Add Function Complexity guideline (Finding #9)**

Add new subsection to Important Guidelines:
```markdown
### Function Complexity
Keep functions under ~200 lines. When a function exceeds this threshold, decompose it into smaller functions with clear single responsibilities. Separate business logic from UI/output rendering.
```

**10. Strengthen Testing Requirements (Finding #10)**

Update the Testing Requirements section, adding after "Write comprehensive unit and integration tests":
```markdown
- **Every command file in `cli/src/commands/` must have a corresponding test file** that covers flag validation, error paths, and orchestration logic -- not just integration-level coverage
```

### New or Updated Skills

No new skills are recommended. The findings do not involve multi-step processes that would benefit from skill-based workflows. The existing skills (code-review, codebase-audit) already cover the review processes that would catch these issues.

### New or Updated Rules (`.claude/rules/`)

**1. Create `/Users/julianpani/personal/code/agent-conf/.claude/rules/cli-commands.md`** (Finding #12)

```markdown
---
paths:
  - "cli/src/cli.ts"
  - "cli/src/commands/*.ts"
---

# CLI Command Modification Checklist

When adding, removing, or modifying CLI commands or their options:

1. **Shell completions**: Update `cli/src/commands/completion.ts` COMMANDS object with new/changed options
2. **AGENTS.md**: Update the Commands list if adding/removing commands or subcommands
3. **Root README.md**: Update command tables and usage examples
4. **cli/README.md**: Update command summary table
5. **cli/docs/ guides**: Check for references to the modified command
6. **Tests**: Add or update tests for new flags, options, and validation logic
```

**2. Create `/Users/julianpani/personal/code/agent-conf/.claude/rules/hash-and-prefix.md`** (Findings #2, #5)

```markdown
---
paths:
  - "cli/src/core/*.ts"
  - "cli/src/commands/check.ts"
---

# Hash and Prefix Conventions

## Hash Functions
- All content hashes use the format `sha256:` + 12 hex characters
- DO NOT create new `createHash("sha256")` call sites
- Import and use the shared hash utility function for all hashing

## Prefix Conversion
- Marker prefixes use dashes: `my-prefix` (for HTML comments like `<!-- my-prefix:global:start -->`)
- Metadata prefixes use underscores: `my_prefix` (for YAML keys like `my_prefix_managed`)
- Use `toMarkerPrefix()` / `toMetadataPrefix()` utility functions for conversion
- DO NOT use inline `.replace(/-/g, "_")` or `.replace(/_/g, "-")`
- The default prefix is `"agconf"` -- never use `"agent_conf"` as a fallback
```

**3. Create `/Users/julianpani/personal/code/agent-conf/.claude/rules/testing.md`** (Finding #10)

```markdown
---
paths:
  - "cli/src/commands/*.ts"
  - "cli/src/core/*.ts"
---

# Testing Requirements

- Every command file in `cli/src/commands/` MUST have a corresponding test file in `cli/tests/unit/`
- Tests must cover: flag validation, error paths, orchestration logic, and edge cases
- When adding new sync content types, also add check command tests (see AGENTS.md "Check Command Integrity")
- When modifying hash computation or prefix handling, verify round-trip consistency in tests
```

### Hook Configurations

**1. Stop hook for completions drift detection** (Finding #11)

Add to `/Users/julianpani/personal/code/agent-conf/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Review the conversation transcript to determine if any CLI command options were added, removed, or modified in cli/src/cli.ts during this session. If CLI options were changed, check whether cli/src/commands/completion.ts was also updated to include those options in the COMMANDS object. Respond with {\"ok\": true} if no CLI options were changed or if completion.ts was updated accordingly. Respond with {\"ok\": false, \"reason\": \"CLI options were modified in cli.ts but completion.ts was not updated. Update the COMMANDS object in completion.ts to include the new/changed options.\"} if completions are out of sync.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Rationale**: This is the lightest automated enforcement that addresses the demonstrated failure mode. A `Stop` hook with `type: "prompt"` fires only when the agent finishes its response, uses a fast model, and costs minimal overhead. It specifically targets the observed pattern: CLI options added without completion updates. See [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide.md) and [hooks reference](https://code.claude.com/docs/en/hooks.md) for configuration details.

### Settings Changes

No permission or deny-list changes are recommended. The current `.claude/settings.json` permissions are appropriately scoped. The sandbox configuration is suitable for this project.

**Note**: The `.claude/settings.local.json` file contains a GitHub PAT in the `env.GH_TOKEN` field. While this is gitignored (local settings), it is worth noting that tokens in settings files should be managed via environment variables or a secrets manager rather than being hardcoded, even in local-only files.

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Fix AGENTS.md Commands list (remove phantom `canonical update`) | 5 min | Eliminates critical documentation mismatch |
| 2 | Create `.claude/rules/cli-commands.md` | 10 min | Prevents future documentation drift for CLI changes |
| 3 | Add Stop hook for completions drift | 10 min | Automated catch for the exact failure mode observed |
| 4 | Create `.claude/rules/hash-and-prefix.md` | 10 min | Prevents hash/prefix bugs (addresses 2 critical findings) |
| 5 | Add AGENTS.md guidelines (export hygiene, utility reuse, function complexity, documentation sync) | 20 min | Addresses 5+ high/medium findings |
| 6 | Strengthen Content Hash Consistency section | 5 min | Prevents future hash duplication |
| 7 | Create `.claude/rules/testing.md` | 5 min | Addresses test coverage gaps |
| 8 | Strengthen Testing Requirements in AGENTS.md | 5 min | Requires command-level tests |
