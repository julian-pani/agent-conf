---
paths:
  - "cli/src/core/managed-content.ts"
  - "cli/src/core/markers.ts"
  - "cli/src/core/rules.ts"
  - "cli/src/core/agents.ts"
  - "cli/src/utils/prefix.ts"
---

# Hash and Prefix Conventions

## Content Hashes

All content hashes MUST use format: `sha256:` prefix + 12 hex characters.

DO NOT create new `createHash("sha256")` call sites. Use existing functions:
- `computeContentHash()` from `managed-content.ts` - for file frontmatter
- `computeGlobalBlockHash()` from `markers.ts` - for AGENTS.md global block
- `computeRulesSectionHash()` from `markers.ts` - for AGENTS.md rules section

## Prefix Conversion

Marker prefixes use dashes (`my-prefix`), metadata prefixes use underscores (`my_prefix`).

MUST use `toMarkerPrefix()` / `toMetadataPrefix()` from `cli/src/utils/prefix.ts`.
DO NOT use inline `.replace(/-/g, "_")` or `.replace(/_/g, "-")`.
