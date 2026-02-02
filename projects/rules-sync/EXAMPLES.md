# Rules Sync - Concrete Examples

## 1. Canonical Repository Setup

### Directory Structure
```
canonical-repo/
├── agent-conf.yaml
├── instructions/
│   └── AGENTS.md
├── skills/
│   └── commit/
│       └── SKILL.md
└── rules/                       # NEW
    ├── code-style.md
    ├── security/
    │   ├── api-auth.md
    │   └── data-handling.md
    └── testing/
        ├── unit-tests.md
        └── e2e-tests.md
```

### agent-conf.yaml
```yaml
version: "1.0.0"
meta:
  name: acme-standards
  organization: ACME Corp
content:
  instructions: "instructions/AGENTS.md"
  skills_dir: "skills"
  rules_dir: "rules"           # NEW
targets: ["claude", "codex"]
markers:
  prefix: "agent-conf"
```

---

## 2. Source Rule Files

### rules/code-style.md (no paths)
```markdown
---
metadata:
  author: "Platform Team"
---

# Code Style Guidelines

Use consistent formatting across the codebase.

## Naming Conventions

- Use camelCase for variables
- Use PascalCase for classes
- Use SCREAMING_SNAKE_CASE for constants

## Formatting

- 2-space indentation
- 80 character line limit
```

### rules/security/api-auth.md (with paths)
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/api/**/*.ts"
metadata:
  author: "Security Team"
  reviewed: "2024-01-15"
---

# API Authentication Rules

All API endpoints must implement proper authentication.

## Requirements

- Use JWT tokens for authentication
- Implement rate limiting
- Log all authentication failures
```

### rules/testing/unit-tests.md (with paths)
```markdown
---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Unit Testing Guidelines

## Test Structure

Each test file should follow the AAA pattern:
- Arrange: Set up test data
- Act: Execute the code under test
- Assert: Verify the results

## Mocking

- Mock external dependencies
- Never mock the module under test
```

---

## 3. Claude Target Output

After sync to Claude target, rules are copied as-is with metadata added:

### .claude/rules/code-style.md
```markdown
---
metadata:
  author: "Platform Team"
  agent_conf_managed: "true"
  agent_conf_content_hash: "sha256:a1b2c3d4e5f6"
  agent_conf_source_path: "code-style.md"
---

# Code Style Guidelines

Use consistent formatting across the codebase.

## Naming Conventions

- Use camelCase for variables
- Use PascalCase for classes
- Use SCREAMING_SNAKE_CASE for constants

## Formatting

- 2-space indentation
- 80 character line limit
```

### .claude/rules/security/api-auth.md
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/api/**/*.ts"
metadata:
  author: "Security Team"
  reviewed: "2024-01-15"
  agent_conf_managed: "true"
  agent_conf_content_hash: "sha256:b2c3d4e5f6g7"
  agent_conf_source_path: "security/api-auth.md"
---

# API Authentication Rules

All API endpoints must implement proper authentication.

## Requirements

- Use JWT tokens for authentication
- Implement rate limiting
- Log all authentication failures
```

### Full Claude Directory Structure
```
downstream-repo/
├── .agent-conf/
│   └── lockfile.json
├── .claude/
│   ├── CLAUDE.md
│   ├── skills/
│   │   └── commit/
│   │       └── SKILL.md
│   └── rules/                    # Preserves source structure
│       ├── code-style.md
│       ├── security/
│       │   ├── api-auth.md
│       │   └── data-handling.md
│       └── testing/
│           ├── unit-tests.md
│           └── e2e-tests.md
├── .codex/
│   └── skills/
│       └── commit/
│           └── SKILL.md
└── AGENTS.md                     # Contains concatenated rules for Codex
```

---

## 4. Codex Target Output

For Codex, rules are concatenated into AGENTS.md under a dedicated section.

### AGENTS.md (with rules section)
```markdown
<!-- agent-conf:global:start -->
<!-- DO NOT EDIT THIS SECTION - Managed by agent-conf -->
<!-- Content hash: sha256:abc123def456 -->

# ACME Engineering Standards

This document defines coding standards for all ACME projects.

## General Guidelines

- Write clean, maintainable code
- Follow the single responsibility principle

<!-- agent-conf:global:end -->

<!-- agent-conf:rules:start -->
<!-- DO NOT EDIT THIS SECTION - Managed by agent-conf -->
<!-- Content hash: sha256:xyz789uvw012 -->
<!-- Rule count: 5 -->

# Project Rules

<!-- Rule: code-style.md -->

## Code Style Guidelines

Use consistent formatting across the codebase.

### Naming Conventions

- Use camelCase for variables
- Use PascalCase for classes
- Use SCREAMING_SNAKE_CASE for constants

### Formatting

- 2-space indentation
- 80 character line limit

<!-- Rule: security/api-auth.md -->
<!-- Applies to:
     - src/api/**/*.ts
     - lib/api/**/*.ts
-->

## API Authentication Rules

All API endpoints must implement proper authentication.

### Requirements

- Use JWT tokens for authentication
- Implement rate limiting
- Log all authentication failures

<!-- Rule: security/data-handling.md -->

## Data Handling Security

[content...]

<!-- Rule: testing/e2e-tests.md -->
<!-- Applies to: **/*.e2e.ts -->

## E2E Testing Guidelines

[content...]

<!-- Rule: testing/unit-tests.md -->
<!-- Applies to:
     - **/*.test.ts
     - **/*.spec.ts
-->

## Unit Testing Guidelines

### Test Structure

Each test file should follow the AAA pattern:
- Arrange: Set up test data
- Act: Execute the code under test
- Assert: Verify the results

### Mocking

- Mock external dependencies
- Never mock the module under test

<!-- agent-conf:rules:end -->

<!-- agent-conf:repo:start -->
<!-- Repository-specific content below -->

# Repository-Specific Notes

This repo also uses these local conventions...

<!-- agent-conf:repo:end -->
```

### Key Observations

1. **Heading levels shifted**: Original `# Title` → `## Title` (nested under `# Project Rules`)
2. **Alphabetical ordering**: Rules sorted by path (`code-style.md`, `security/api-auth.md`, etc.)
3. **Path attribution**: Each rule has `<!-- Rule: {path} -->` comment
4. **Paths as comments**: The `paths` frontmatter becomes `<!-- Applies to: ... -->`
5. **No frontmatter in output**: The YAML frontmatter is stripped, only body is included
6. **Preserved sections**: Global and repo sections remain unchanged

---

## 5. Heading Level Adjustment Examples

### Input: Rule with h1-h3
```markdown
# Main Title

Some intro text.

## Section One

Content here.

### Subsection

More content.
```

### Output: After +1 adjustment
```markdown
## Main Title

Some intro text.

### Section One

Content here.

#### Subsection

More content.
```

### Edge Case: h6 heading (maximum)
```markdown
# h1 → becomes h2
## h2 → becomes h3
### h3 → becomes h4
#### h4 → becomes h5
##### h5 → becomes h6
###### h6 → stays h6 (capped)
```

### Code Block Preservation
```markdown
# Real Heading → becomes ## Real Heading

Here's some code:

```python
# This is a comment, not a heading
## Also a comment
```

## Another Heading → becomes ### Another Heading
```

---

## 6. Lockfile Structure

### .agent-conf/lockfile.json
```json
{
  "version": "1.0.0",
  "pinned_version": "v1.2.3",
  "synced_at": "2024-01-20T10:30:00.000Z",
  "source": {
    "type": "github",
    "repository": "acme/agent-standards",
    "commit_sha": "abc123def456789",
    "ref": "main"
  },
  "content": {
    "agents_md": {
      "global_block_hash": "sha256:abc123def456",
      "merged": true
    },
    "skills": ["commit"],
    "rules": {
      "files": [
        "code-style.md",
        "security/api-auth.md",
        "security/data-handling.md",
        "testing/e2e-tests.md",
        "testing/unit-tests.md"
      ],
      "content_hash": "sha256:xyz789uvw012",
      "targets": {
        "claude": {
          "hash": "sha256:cla123",
          "count": 5
        },
        "codex": {
          "hash": "sha256:cod456",
          "count": 5
        }
      }
    },
    "targets": ["claude", "codex"],
    "marker_prefix": "agent-conf"
  },
  "cli_version": "0.1.0"
}
```

---

## 7. Check Command Output

### When rules are unmodified
```
$ agent-conf check

✓ AGENTS.md global block: no changes
✓ AGENTS.md rules block: no changes
✓ Skills (5 files): no changes
✓ Rules (5 files): no changes

All managed files are in sync.
```

### When a Claude rule is modified
```
$ agent-conf check

✓ AGENTS.md global block: no changes
✓ AGENTS.md rules block: no changes
✓ Skills (5 files): no changes
✗ Rules: 1 file modified

Modified rules:
  .claude/rules/security/api-auth.md
    Stored hash: sha256:b2c3d4e5f6g7
    Current hash: sha256:modified123

Run 'agent-conf sync' to restore managed content, or commit your changes first.
```

### When Codex rules section is modified
```
$ agent-conf check

✓ AGENTS.md global block: no changes
✗ AGENTS.md rules block: modified
✓ Skills (5 files): no changes
✓ Rules (5 files): no changes

The rules section in AGENTS.md has been manually modified.
Run 'agent-conf sync' to restore managed content.
```

---

## 8. Orphan Deletion Example

### Before: Canonical has 3 rules
```
canonical/rules/
├── code-style.md
├── security/api-auth.md
└── testing/unit-tests.md
```

### Downstream (before sync, has 4 rules)
```
downstream/.claude/rules/
├── code-style.md         # managed
├── security/api-auth.md  # managed
├── testing/unit-tests.md # managed
└── deprecated/old.md     # managed (orphan - no longer in canonical)
```

### After sync
```
downstream/.claude/rules/
├── code-style.md         # updated
├── security/api-auth.md  # updated
└── testing/unit-tests.md # updated
# deprecated/old.md is DELETED (was managed, no longer in source)
```

### Safety: Non-managed files are preserved
```
downstream/.claude/rules/
├── code-style.md         # managed by agent-conf
├── my-local-rule.md      # NOT managed (no metadata) → PRESERVED
└── testing/unit-tests.md # managed by agent-conf
```

---

## 9. Sync Output Example

```
$ agent-conf sync

Syncing from acme/agent-standards@v1.2.3...

AGENTS.md:
  ✓ Global block updated (merged with existing content)

Skills (1 skill, 2 targets):
  ✓ commit → .claude/skills/, .codex/skills/

Rules (5 rules):
  Claude target:
    ✓ Copied 5 files to .claude/rules/
    ✓ Deleted 1 orphan (deprecated/old.md)

  Codex target:
    ✓ Updated rules section in AGENTS.md

Sync complete! Lockfile written to .agent-conf/lockfile.json
```
