# Multi-Source & Modules Project

Planning documents for evolving agent-conf from a sync tool into an AI DevEx platform.

## Documents

| Document | Status | Description |
|----------|--------|-------------|
| [EXPLORATION.md](./EXPLORATION.md) | Active | Vision exploration, requirements analysis, design discussions |
| [MODULE-SYSTEM-DESIGN.md](./MODULE-SYSTEM-DESIGN.md) | Draft | Module manifest schema, resolution, installation flow |
| [CLI-EXPANSION.md](./CLI-EXPANSION.md) | Future | CLI restructuring for platform growth (agx/agconf) |
| [npm-agx-request.md](./npm-agx-request.md) | Action item | Email template to request `agx` package name |

## Vision Summary

```
Current:  agent-conf = content sync tool
Future:   agx = AI DevEx platform
            ├── content sync (current)
            ├── module management
            ├── environment management
            ├── self-learning loop
            ├── experimentation/evals
            └── governance/audit
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multiple sources | Layered (DAG), not peers | Avoids conflict resolution complexity |
| Trust model | Internal vs External zones | Matches organizational reality |
| Granularity | Module-based | Required vs optional, selective adoption |
| CLI naming | agconf (now), agx (future) | Room to grow, backwards compat |
| Friction tracking (v1) | GitHub Issues | Minimal infrastructure |

## Phased Roadmap

1. **Modules (basic)** - Skill/instruction grouping, required/optional
2. **Trust zones** - Internal vs external sources, update policies
3. **Rich modules** - Prerequisites, validation, non-skill artifacts
4. **CLI platform** - agx entry point, namespaced domains
5. **Environment layer** - MCP, env vars, settings management
6. **Learning loop** - Friction detection, categorization, remediation
7. **Experimentation** - Config variants, evals, comparisons

## Open Threads

- [ ] npm `agx` package request (send email)
- [ ] Module manifest schema finalization
- [ ] Instruction composition strategy (section ordering, conflicts)
- [ ] Semantic consistency analysis approach
