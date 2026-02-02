# Rules Sync Feature

Add support for syncing "rules" - modular, topic-specific project instructions stored in `.claude/rules/` - from a canonical repository to downstream repos.

## Project Files

| File | Description |
|------|-------------|
| [PLAN.md](./PLAN.md) | High-level design, requirements, and implementation phases |
| [TODO.md](./TODO.md) | Task tracker with checkboxes for implementation progress |
| [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) | Detailed technical specifications, interfaces, and algorithms |
| [EXAMPLES.md](./EXAMPLES.md) | Concrete input/output examples for all scenarios |

## Quick Summary

### What are Rules?

Rules are like instructions but broken down into multiple small files, organized in the `.claude/rules/` directory. They support:
- Arbitrary subdirectory organization
- Optional `paths` frontmatter for conditional loading (Claude-specific)
- YAML frontmatter for metadata

### Target-Specific Behavior

| Target | Behavior |
|--------|----------|
| **Claude** | Copy rule files as-is, preserving directory structure, with metadata added |
| **Codex** | Concatenate all rules into AGENTS.md under a `# Project Rules` section |

### Key Design Decisions

1. **Heading adjustment for Codex**: When concatenating, headings shift +1 level to nest under `# Project Rules`
2. **Path attribution**: Each rule includes a source comment (`<!-- Rule: security/api-auth.md -->`)
3. **Paths as comments**: For Codex, the `paths` frontmatter becomes text since Codex doesn't support conditional loading
4. **Orphan safety**: Only delete rules that have managed metadata

## Implementation Order

```
Phase 1: Core Infrastructure
├── Config schema (add rules_dir)
├── Source resolution (add rulesPath)
└── Lockfile schema (add rules tracking)

Phase 2: Rules Core Module
├── Rule discovery (recursive)
├── Claude sync (copy with metadata)
└── Codex sync (concatenate with markers)

Phase 3: Integration
├── Main sync flow
├── Check command
└── Status command

Phase 4-6: CLI, Testing, Docs
```

## Status

**Current Phase**: Planning complete, ready for implementation

## Notes

- Rules are optional in canonical config (backward compatible)
- Uses same metadata pattern as skills (`agent_conf_managed`, `agent_conf_content_hash`)
- Adds new markers: `<!-- {prefix}:rules:start -->` / `<!-- {prefix}:rules:end -->`
