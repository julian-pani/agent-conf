# Module System Design

> **Status**: Draft v0.1
> **Created**: 2026-02-02
> **Depends on**: [EXPLORATION.md](./EXPLORATION.md)

## 1. Overview

The module system is the foundational abstraction that enables:
- Granular adoption (install what you need)
- Required vs optional content (compliance)
- Trust zones (internal vs external)
- Ecosystem growth (third-party modules)
- Platform extensibility (capability modules)

## 2. Module Types

### 2.1 Content Modules

Bundles of agent-facing content:

```
@my-org/security-standards
├── skills/
│   ├── security-review/
│   └── vulnerability-scan/
├── rules/
│   └── security/
│       ├── api-auth.md
│       └── data-handling.md
├── instructions/
│   └── security-section.md
└── module.yaml
```

### 2.2 Capability Modules (Future)

Extend agent-conf itself:

```
@agent-conf/env
├── commands/
│   ├── env-check.ts
│   └── env-sync.ts
├── providers/
│   └── mcp-provider.ts
└── module.yaml
```

**Phase 1 focuses on Content Modules only.**

## 3. Module Manifest (`module.yaml`)

```yaml
# Required fields
name: "@my-org/security-standards"
version: "1.0.0"
description: "Company security standards for AI agents"

# Module type
type: content  # or "capability" in future

# Trust zone (affects update behavior)
zone: internal  # or "external"

# What this module provides
provides:
  skills:
    - security-review
    - vulnerability-scan
  rules:
    - security/api-auth.md
    - security/data-handling.md
  instructions:
    section: security-guidelines
    file: instructions/security-section.md
  hooks:  # Future
    - name: security-pre-commit
      type: pre-commit
      script: hooks/security-check.sh

# Dependencies on other modules
dependencies:
  "@marketplace/code-review": "^2.0.0"  # External dependency

# Requirements for installation
prerequisites:
  env_vars:
    required:
      - SECURITY_API_KEY
    optional:
      - SECURITY_LOG_LEVEL
  cli_version: ">=2.0.0"
  targets:
    - claude  # Only works with Claude target

# Installation behavior
install:
  required: true  # Downstream cannot skip this module

# Validation
validation:
  script: scripts/validate.sh
  description: "Verifies security tooling is configured"
```

## 4. Module Resolution

### 4.1 Sources

Modules can come from:

| Source | Example | Use Case |
|--------|---------|----------|
| npm registry | `@my-org/security` | Published packages |
| Git repository | `github:my-org/security-module` | Private/unpublished |
| Local path | `file:../shared-modules/security` | Monorepo, development |
| Canonical inline | (defined in agent-conf.yaml) | Simple cases |

### 4.2 Version Resolution

Follow npm/semver conventions:
- `^1.0.0` - Compatible with 1.x.x
- `~1.0.0` - Patch updates only
- `1.0.0` - Exact version
- `*` - Any version (not recommended)

### 4.3 Dependency Graph

```
project-repo
├── @my-org/standards (internal, required)
│   ├── @my-org/security (internal, required)
│   └── @marketplace/self-learning (external, optional)
│       └── @marketplace/friction-detection (external)
└── @my-org/frontend-conventions (internal, optional)
```

**Flattening**: Final installation is flat (no nested node_modules style). Conflicts are resolved by:
1. Closer to root wins
2. Higher version wins (if compatible)
3. Error if incompatible

## 5. Installation Flow

```
agent-conf module add @my-org/security-standards

1. RESOLVE
   ├── Fetch module manifest
   ├── Resolve dependencies recursively
   ├── Check for version conflicts
   └── Build installation plan

2. VALIDATE
   ├── Check prerequisites (env vars, cli version)
   ├── Check target compatibility
   ├── Run module validation script (if any)
   └── Prompt user for missing prerequisites

3. INSTALL
   ├── Download/copy module content
   ├── Merge instructions into AGENTS.md
   ├── Copy skills to target directories
   ├── Copy rules to target directories
   └── Update lockfile

4. VERIFY
   ├── Run post-install validation
   └── Show installation summary
```

## 6. Lockfile Extension

```json
{
  "version": "2.0.0",
  "synced_at": "2026-02-02T10:00:00Z",

  "modules": {
    "@my-org/security-standards": {
      "version": "1.0.0",
      "source": {
        "type": "npm",
        "registry": "https://registry.npmjs.org"
      },
      "zone": "internal",
      "required": true,
      "content_hash": "sha256:abc123...",
      "installed_at": "2026-02-02T10:00:00Z"
    },
    "@marketplace/self-learning": {
      "version": "2.1.0",
      "source": {
        "type": "github",
        "repository": "marketplace/self-learning",
        "ref": "v2.1.0",
        "commit": "def456..."
      },
      "zone": "external",
      "required": false,
      "content_hash": "sha256:def456...",
      "installed_at": "2026-02-02T10:00:00Z"
    }
  },

  "content": {
    "agents_md": {
      "sections": {
        "global": { "hash": "...", "source": "@my-org/standards" },
        "security": { "hash": "...", "source": "@my-org/security-standards" },
        "self-learning": { "hash": "...", "source": "@marketplace/self-learning" }
      }
    },
    "skills": {
      "security-review": { "source": "@my-org/security-standards", "hash": "..." },
      "friction-report": { "source": "@marketplace/self-learning", "hash": "..." }
    },
    "rules": {
      "security/api-auth.md": { "source": "@my-org/security-standards", "hash": "..." }
    }
  }
}
```

## 7. Trust Zones & Update Behavior

### 7.1 Internal Zone

```yaml
zone: internal
```

- Source: Company-controlled repositories
- Updates: Can be auto-merged (CI workflow)
- Required: Enforceable
- Trust: Implicit

### 7.2 External Zone

```yaml
zone: external
```

- Source: Marketplace, open source, third-party
- Updates: Manual review required
- Required: Advisory only (company decides)
- Trust: Explicit review needed

### 7.3 Update Commands

```bash
# Check for updates
agent-conf module outdated

# Update internal modules (can be automated)
agent-conf module update --zone=internal

# Update specific external module (requires review)
agent-conf module update @marketplace/self-learning
```

## 8. Instruction Composition

When multiple modules contribute instructions:

### 8.1 Section-Based Composition

Each module contributes a named section:

```markdown
<!-- agent-conf:section:security:start -->
<!-- Source: @my-org/security-standards@1.0.0 -->
## Security Guidelines
...
<!-- agent-conf:section:security:end -->

<!-- agent-conf:section:self-learning:start -->
<!-- Source: @marketplace/self-learning@2.1.0 -->
## Self-Learning Loop
...
<!-- agent-conf:section:self-learning:end -->

<!-- agent-conf:repo:start -->
## Project-Specific Instructions
...
<!-- agent-conf:repo:end -->
```

### 8.2 Section Ordering

Defined in downstream config:

```yaml
# .agent-conf/config.yaml
instruction_order:
  - security        # From @my-org/security-standards
  - code-standards  # From @my-org/standards
  - self-learning   # From @marketplace/self-learning
  # repo section always last
```

## 9. CLI Commands (Module-Related)

```bash
# List installed modules
agent-conf module list

# Add a module
agent-conf module add @my-org/security-standards
agent-conf module add github:marketplace/self-learning#v2.0.0
agent-conf module add ./local-module

# Remove a module (if not required)
agent-conf module remove @marketplace/self-learning

# Update modules
agent-conf module update                    # All (respects zones)
agent-conf module update --zone=internal    # Internal only
agent-conf module update @specific/module   # Specific module

# Check for updates
agent-conf module outdated

# Show module info
agent-conf module info @my-org/security-standards

# Validate prerequisites
agent-conf module check
```

---

## 10. Open Questions

### 10.1 Module Discovery

**Q: How do users find modules?**

Options:
- npm search (if published to npm)
- GitHub topics (`agent-conf-module`)
- Curated registry/awesome-list
- `agent-conf search <query>` command

**Leaning toward**: npm + GitHub topics for v1. Curated registry if ecosystem grows.

### 10.2 Capability Module API

**Q: How do capability modules extend the CLI?**

Options:
- Export specific interfaces (commands, providers)
- Plugin hooks (lifecycle events)
- Full access to core internals

**Deferred** to Phase 4. Need real use cases first.

### 10.3 Conflict Resolution UI

**Q: When two modules provide conflicting content, how is it surfaced?**

Options:
- Error at install time
- Warning with manual resolution
- LLM-assisted conflict detection

**Needs design**: Structural conflicts (same skill name) are detectable. Semantic conflicts (contradictory instructions) need the consistency layer.

### 10.4 Module Forking/Overriding

**Q: Can a downstream override part of a module without forking entirely?**

```yaml
# Could this work?
modules:
  "@marketplace/self-learning":
    version: "2.0.0"
    overrides:
      skills:
        friction-report: ./local-skills/custom-friction-report
```

**Needs design**: Powerful but complex. Maybe v2.

### 10.5 Transitive Required Modules

**Q: If A requires B, and B depends on C, is C required?**

Options:
- Yes (transitive)
- No (only direct requirements)
- Configurable per-dependency

**Leaning toward**: Yes, transitive. Required means required.

### 10.6 Module Signing/Verification

**Q: How do we verify module integrity and authorship?**

Options:
- npm signatures (if using npm)
- Git commit signing
- Custom signing infrastructure

**Deferred** unless security-critical use cases emerge.

### 10.7 Breaking Changes in Modules

**Q: How are breaking changes in modules handled?**

- Semver major version bump
- Migration scripts in module?
- Changelog requirements?

**Needs design**: Probably just semver + good changelogs for v1.

---

## 11. Relationship to Current Architecture

### 11.1 What Changes

| Current | With Modules |
|---------|--------------|
| Single canonical source | Multiple module sources |
| All-or-nothing sync | Selective module installation |
| Flat lockfile | Module-aware lockfile |
| Global/repo markers only | Section-per-module markers |

### 11.2 What Stays the Same

- Marker-based content separation
- Hash-based integrity checking
- Target abstraction (claude, codex)
- Pre-commit hook protection

### 11.3 Migration Path

1. Existing `agent-conf.yaml` canonicals work unchanged
2. New `module.yaml` format for module publishers
3. Downstreams can mix: canonical source + additional modules
4. Eventually: canonical itself is just a "meta-module"

---

## 12. Example Scenarios

### 12.1 Company Adopting Modules

```bash
# Initialize with company canonical (defines required modules)
agent-conf init --source my-org/engineering-standards

# Canonical declares:
# - @my-org/security (required)
# - @my-org/testing (required)
# - @my-org/code-review (optional)

# Result: security and testing installed automatically
# User can add optional modules:
agent-conf module add @my-org/code-review
```

### 12.2 Adding External Module

```bash
# Add marketplace module
agent-conf module add @marketplace/self-learning

# Prompted:
# ⚠️  External module requires manual review for updates
# ℹ️  Prerequisites: FRICTION_API_KEY must be set
# Continue? [y/N]

# After installation, updates require explicit action:
agent-conf module update @marketplace/self-learning
# Shows changelog, requires confirmation
```

### 12.3 Module Author Workflow

```bash
# Create new module
mkdir my-module && cd my-module

# Initialize module structure
agent-conf module init

# Creates:
# ├── module.yaml
# ├── skills/
# ├── rules/
# ├── instructions/
# └── README.md

# Validate module
agent-conf module validate

# Publish (if using npm)
npm publish
```
