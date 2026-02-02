# Rules Sync Feature Plan

## Overview

Add support for syncing "rules" - modular, topic-specific project instructions stored in `.claude/rules/` - from a canonical repository to downstream repos.

## Requirements

### Core Requirements

1. **Arbitrary sub-directory structure**: Rules can be organized in subdirectories (e.g., `security/apis/authentication.md`). Must preserve this structure during sync.

2. **Target-specific behavior**:
   - **Claude**: Sync markdown files as-is, preserving directory structure
   - **Codex**: Concatenate all rules into AGENTS.md file under a dedicated section

3. **Markdown concatenation for Codex**:
   - Insert under a "# Project Rules" section in AGENTS.md
   - Adjust heading levels (h1 in rule file → h2 when concatenated, etc.)
   - Track source file path for each rule
   - Include `paths` frontmatter as text (Codex doesn't support conditional loading)

4. **Preserve existing patterns**: Follow the established architecture for skills, markers, metadata, and lockfile tracking.

---

## Design Decisions

### 1. Canonical Repository Structure

```yaml
# agent-conf.yaml
version: "1.0.0"
content:
  instructions: "instructions/AGENTS.md"
  skills_dir: "skills"
  rules_dir: "rules"         # NEW: path to rules directory
```

Directory layout:
```
canonical-repo/
├── instructions/AGENTS.md
├── skills/
│   └── my-skill/
├── rules/                   # NEW
│   ├── code-style.md
│   ├── security/
│   │   ├── api-auth.md
│   │   └── data-handling.md
│   └── testing/
│       └── coverage.md
└── agent-conf.yaml
```

### 2. Target-Specific Output

#### Claude Target
```
downstream-repo/
├── .claude/
│   ├── CLAUDE.md
│   ├── skills/
│   │   └── my-skill/
│   └── rules/               # Synced as-is
│       ├── code-style.md
│       ├── security/
│       │   ├── api-auth.md
│       │   └── data-handling.md
│       └── testing/
│           └── coverage.md
└── AGENTS.md
```

#### Codex Target
```
downstream-repo/
├── .codex/
│   └── skills/
│       └── my-skill/
└── AGENTS.md                # Contains concatenated rules section
```

### 3. Markdown Concatenation Strategy (Codex)

#### Heading Level Adjustment

When concatenating, all headings in rule files shift by +1 to nest under "# Project Rules":

| Original | Concatenated |
|----------|--------------|
| `#`      | `##`         |
| `##`     | `###`        |
| `###`    | `####`       |
| etc.     | etc.         |

#### Source Attribution

Each rule includes a source comment:
```markdown
<!-- Rule from: security/api-auth.md -->
## API Authentication Rules
...
```

#### Path Frontmatter Handling

For rules with `paths` frontmatter, convert to text block:
```markdown
<!-- Rule from: frontend/components.md -->
<!-- Applies to: src/components/**/*.tsx, src/components/**/*.ts -->
## Component Guidelines
...
```

#### Section Structure

```markdown
<!-- agent-conf:rules:start -->
<!-- DO NOT EDIT THIS SECTION - Managed by agent-conf -->
<!-- Content hash: sha256:abc123 -->

# Project Rules

<!-- Rule from: code-style.md -->
## Code Style Guidelines
...

<!-- Rule from: security/api-auth.md -->
## API Authentication
...

<!-- agent-conf:rules:end -->
```

### 4. Lockfile Schema Extension

```typescript
interface LockfileContent {
  agents_md: { /* existing */ };
  skills: string[];
  rules?: {                          // NEW
    synced: string[];                // List of rule files synced
    targets: {
      claude?: {
        files: string[];             // Files copied
        content_hash: string;        // Hash of all rules
      };
      codex?: {
        concatenated_hash: string;   // Hash of concatenated content
        rule_count: number;
      };
    };
  };
}
```

### 5. Rule File Metadata (Claude Target)

Similar to skills, add metadata to track managed status:

```yaml
---
paths:
  - "src/api/**/*.ts"
metadata:
  agent_conf_managed: "true"
  agent_conf_content_hash: "sha256:..."
  agent_conf_source_path: "security/api-auth.md"
---

# API Authentication Rules
...
```

### 6. Ordering Strategy for Concatenation

Rules are concatenated in a deterministic order:
1. Sort alphabetically by full path
2. Depth-first (parent directory before subdirectories)

Example order:
```
code-style.md
security/api-auth.md
security/data-handling.md
testing/coverage.md
```

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### Task 1.1: Configuration Schema Updates
**Files**: `cli/src/config/schema.ts`, `cli/src/core/schema.ts`

- Add `rules_dir` to `CanonicalContentConfigSchema`
- Add validation for rules directory structure
- Update schema version compatibility checks

#### Task 1.2: Source Resolution Updates
**Files**: `cli/src/core/source.ts`

- Add `rulesPath` to `ResolvedSource` interface
- Update `resolveLocalSource()` and `resolveGitHubSource()` to include rules path
- Validate rules directory exists (optional - not all canonicals have rules)

#### Task 1.3: Lockfile Schema Updates
**Files**: `cli/src/schemas/lockfile.ts`, `cli/src/core/lockfile.ts`

- Add `rules` section to lockfile content schema
- Update `writeLockfile()` to include rules data
- Update `readLockfile()` to handle rules data
- Maintain backward compatibility with existing lockfiles

### Phase 2: Rules Core Module

#### Task 2.1: Create Rules Core Module
**New file**: `cli/src/core/rules.ts`

Exports:
```typescript
interface Rule {
  relativePath: string;           // e.g., "security/api-auth.md"
  content: string;
  frontmatter?: RuleFrontmatter;
}

interface RuleFrontmatter {
  paths?: string[];
  [key: string]: unknown;
}

interface RulesSyncOptions {
  override: boolean;
  targets: Target[];
  markerPrefix: string;
}

interface RulesSyncResult {
  claude?: {
    copied: number;
    updated: number;
    deleted: number;
    files: string[];
  };
  codex?: {
    concatenated: boolean;
    ruleCount: number;
  };
}

// Find all rule files in a directory
function discoverRules(rulesDir: string): Promise<Rule[]>;

// Sync rules to Claude target (copy with metadata)
function syncRulesToClaude(
  rules: Rule[],
  targetDir: string,
  options: RulesSyncOptions,
): Promise<RulesSyncResult['claude']>;

// Sync rules to Codex target (concatenate into AGENTS.md)
function syncRulesToCodex(
  rules: Rule[],
  agentsMdPath: string,
  options: RulesSyncOptions,
): Promise<RulesSyncResult['codex']>;

// Main sync function
function syncRules(
  sourceDir: string,
  targetDir: string,
  options: RulesSyncOptions,
): Promise<RulesSyncResult>;
```

#### Task 2.2: Rules Discovery
**File**: `cli/src/core/rules.ts`

- Recursively walk `rules/` directory
- Parse markdown frontmatter
- Extract `paths` field if present
- Build list of `Rule` objects with relative paths

#### Task 2.3: Claude Target Sync
**File**: `cli/src/core/rules.ts`

- Copy rule files preserving directory structure
- Add/update metadata frontmatter:
  - `agent_conf_managed: "true"`
  - `agent_conf_content_hash: "<hash>"`
  - `agent_conf_source_path: "<relative-path>"`
- Handle orphaned rules (delete rules no longer in canonical)
- Support symlinks (follow, don't copy as symlink)

#### Task 2.4: Codex Target Sync
**File**: `cli/src/core/rules.ts`

Functions:
```typescript
// Adjust heading levels in markdown
function adjustHeadingLevels(content: string, increment: number): string;

// Generate concatenated rules section
function generateRulesSection(
  rules: Rule[],
  markerPrefix: string,
): string;

// Insert/update rules section in AGENTS.md
function updateAgentsMdWithRules(
  agentsMdContent: string,
  rulesSection: string,
  markerPrefix: string,
): string;
```

### Phase 3: Integration

#### Task 3.1: Update Main Sync Flow
**File**: `cli/src/core/sync.ts`

- Call `syncRules()` after skills sync
- Handle rules being optional (not all canonicals have them)
- Include rules in `SyncResult`
- Update progress logging

#### Task 3.2: Update Check Command
**File**: `cli/src/commands/check.ts`, `cli/src/core/skill-metadata.ts` (or new `rules-metadata.ts`)

- Add rules integrity checking
- For Claude: check individual rule files for modifications
- For Codex: check rules section in AGENTS.md
- Include rules in `check` output

#### Task 3.3: Update Status Command
**File**: `cli/src/commands/status.ts` (or `sync.ts` if status is there)

- Show rules sync status
- Display rule counts per target
- Show orphaned rules that will be deleted

### Phase 4: CLI & UX

#### Task 4.1: Update Output Formatting
**File**: `cli/src/core/sync.ts`, `cli/src/utils/logger.ts`

- Add rules section to sync summary
- Show per-target results
- Display file paths for verbose mode

#### Task 4.2: Update Shell Completions
**File**: `cli/src/commands/completion.ts`

- No new commands needed (rules sync is part of `sync`)
- Update help text if needed

### Phase 5: Testing

#### Task 5.1: Unit Tests for Rules Module
**New file**: `cli/tests/unit/rules.test.ts`

Tests:
- `discoverRules()` - finds rules in nested directories
- `adjustHeadingLevels()` - correctly shifts headings
- `generateRulesSection()` - proper concatenation with markers
- `syncRulesToClaude()` - copies with metadata
- `syncRulesToCodex()` - updates AGENTS.md correctly

#### Task 5.2: Integration Tests
**File**: `cli/tests/unit/sync.test.ts` (extend)

Tests:
- Full sync with rules
- Sync without rules (backward compat)
- Rules with subdirectories
- Rules with paths frontmatter
- Orphan rule deletion
- Check command with rules

### Phase 6: Documentation

#### Task 6.1: Update README
**File**: `cli/README.md`

- Document rules_dir configuration
- Explain target-specific behavior
- Add examples

#### Task 6.2: Update AGENTS.md
**File**: `AGENTS.md`

- Document rules feature for contributors

---

## Edge Cases & Considerations

### Edge Case 1: Empty Rules Directory
- If `rules_dir` is configured but empty, sync succeeds with 0 rules
- Log info message about no rules found

### Edge Case 2: Rules with Invalid Frontmatter
- Parse errors should warn but not fail sync
- Invalid `paths` values should warn

### Edge Case 3: Very Large Rule Files
- No special handling needed (same as skills)
- Consider adding size warning in verbose mode

### Edge Case 4: Binary Files in Rules Directory
- Skip non-markdown files with warning
- Only process `.md` files

### Edge Case 5: Symlinked Rules
- Follow symlinks (resolve to actual content)
- Detect circular symlinks and skip with warning

### Edge Case 6: Existing Repo-Specific Rules (Claude)
- Rules not in canonical should be preserved
- Only delete rules that have `agent_conf_managed` metadata
- Follow same orphan deletion safety as skills

### Edge Case 7: Existing Rules Section (Codex)
- Replace entire rules section between markers
- Preserve any content outside markers
- If no markers exist, append rules section at end

### Edge Case 8: Conflicting Headings
- Multiple rules might have same h1 title
- After adjustment, they become h2 so this is fine
- Source comments help distinguish

### Edge Case 9: Deep Nesting
- No limit on subdirectory depth
- Relative paths preserved exactly

---

## Open Questions

1. **Should rules be optional in canonical config?**
   - Proposed: Yes, `rules_dir` is optional. If not specified, no rules sync.
   - Backward compatible with existing canonicals.

2. **Should we support rule-level overrides in downstream?**
   - For v1: No, rules are either synced or not
   - Future: Could add ability to override specific rules

3. **Should paths frontmatter be validated?**
   - For v1: Just pass through as-is
   - Future: Could validate glob patterns

4. **Heading level limit for concatenation?**
   - Markdown supports h1-h6
   - If rule has h6, shifting +1 would go to h7 (invalid)
   - Proposed: Cap at h6 (h6 stays h6)

---

## Success Criteria

1. Rules sync from canonical to downstream preserving structure (Claude)
2. Rules concatenate into AGENTS.md with proper heading adjustment (Codex)
3. Rules are tracked in lockfile
4. Check command detects modifications to rules
5. Backward compatible with existing canonicals and downstreams
6. All tests pass
7. Documentation updated

---

## Implementation Order

```
1.1 Config schema    ─┐
1.2 Source resolution ├─► 2.1 Rules core module ─► 2.2 Discovery
1.3 Lockfile schema  ─┘                          ─► 2.3 Claude sync
                                                 ─► 2.4 Codex sync
                                                        │
                                                        ▼
3.1 Main sync integration ─► 3.2 Check command ─► 3.3 Status command
                                    │
                                    ▼
                           4.1 Output formatting
                           4.2 Completions
                                    │
                                    ▼
                           5.1 Unit tests
                           5.2 Integration tests
                                    │
                                    ▼
                           6.1 README
                           6.2 AGENTS.md
```

Estimated tasks: ~15 discrete work items
