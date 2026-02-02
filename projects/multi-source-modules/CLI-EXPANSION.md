# CLI Expansion Plan

> **Status**: Future design
> **Created**: 2026-02-02
> **Depends on**: [EXPLORATION.md](./EXPLORATION.md), [MODULE-SYSTEM-DESIGN.md](./MODULE-SYSTEM-DESIGN.md)

## Current State

```
Package: agent-conf
CLI:     agent-conf

Commands:
  agent-conf init
  agent-conf sync
  agent-conf status
  agent-conf check
  agent-conf config
  agent-conf canonical init
  agent-conf canonical update
  agent-conf upgrade-cli
  agent-conf completion
```

## Target State

```
Package: agx (pending npm transfer) or agconf
CLIs:    agx, agconf, agent-conf (aliases)

Commands:
  agx content sync          ←→  agconf sync  ←→  agent-conf sync
  agx content status        ←→  agconf status
  agx content check         ←→  agconf check
  agx content init          ←→  agconf init

  agx module add
  agx module remove
  agx module list
  agx module update
  agx module outdated

  agx env check             (future: @agx/env)
  agx env sync              (future)

  agx lab eval              (future: @agx/lab)
  agx lab compare           (future)
```

## Migration Phases

### Phase 1: Package Rename (Near-term)

Rename npm package, keep CLI command:

```json
{
  "name": "agconf",
  "bin": {
    "agconf": "./dist/index.js",
    "agent-conf": "./dist/index.js"
  }
}
```

**User experience:**
```bash
npm install -g agconf
agent-conf sync    # Still works
agconf sync        # Also works
```

### Phase 2: Add Module Commands

Add module subcommand group to existing CLI:

```bash
agconf sync                    # Content (unchanged)
agconf module add @foo/bar     # New
agconf module list             # New
```

No structural refactor needed yet - just add `module` as a command group.

### Phase 3: Platform Entry Point

Introduce `agx` as the platform CLI with namespaced domains:

```json
{
  "name": "agx",
  "bin": {
    "agx": "./dist/agx.js",
    "agconf": "./dist/agconf.js",
    "agent-conf": "./dist/agconf.js"
  }
}
```

**Two entry points, shared code:**

```
agx content sync  ──┐
                    ├──→  syncAction()
agconf sync  ───────┘
```

## Architecture: Shared Command Registration

### Directory Structure

```
cli/src/
├── entries/
│   ├── agx.ts              # Platform entry: agx content/module/env
│   └── agconf.ts           # Compat entry: agconf sync/status/etc
│
├── domains/
│   ├── content/
│   │   ├── index.ts        # registerContentCommands(program)
│   │   ├── sync.ts         # syncAction
│   │   ├── status.ts       # statusAction
│   │   ├── check.ts        # checkAction
│   │   └── init.ts         # initAction
│   │
│   ├── module/
│   │   ├── index.ts        # registerModuleCommands(program)
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   ├── list.ts
│   │   └── update.ts
│   │
│   └── canonical/
│       ├── index.ts        # registerCanonicalCommands(program)
│       ├── init.ts
│       └── update.ts
│
└── core/                   # Shared utilities (unchanged)
    ├── sync.ts
    ├── lockfile.ts
    └── ...
```

### Entry Point Implementation

```typescript
// src/entries/agx.ts
import { program } from 'commander';
import { registerContentCommands } from '../domains/content';
import { registerModuleCommands } from '../domains/module';
import { registerCanonicalCommands } from '../domains/canonical';

program
  .name('agx')
  .description('AI Agent Experience Platform')
  .version(VERSION);

// Content domain (namespaced)
const content = program
  .command('content')
  .description('Content sync operations');
registerContentCommands(content);

// Module domain
const module = program
  .command('module')
  .description('Module management');
registerModuleCommands(module);

// Canonical domain
const canonical = program
  .command('canonical')
  .description('Canonical repository management');
registerCanonicalCommands(canonical);

// Utility commands at top level
program
  .command('upgrade-cli')
  .description('Check for CLI updates')
  .action(upgradeCli);

program.parse();
```

```typescript
// src/entries/agconf.ts
import { program } from 'commander';
import { registerContentCommands } from '../domains/content';
import { registerModuleCommands } from '../domains/module';
import { registerCanonicalCommands } from '../domains/canonical';

program
  .name('agconf')
  .description('AI Agent Configuration CLI')
  .version(VERSION);

// Content commands at TOP LEVEL (no 'content' prefix)
registerContentCommands(program);

// Module commands (still namespaced - new feature)
const module = program
  .command('module')
  .description('Module management');
registerModuleCommands(module);

// Canonical commands (namespaced as before)
const canonical = program
  .command('canonical')
  .description('Canonical repository management');
registerCanonicalCommands(canonical);

program
  .command('upgrade-cli')
  .action(upgradeCli);

program.parse();
```

### Domain Registration Pattern

```typescript
// src/domains/content/index.ts
import { Command } from 'commander';
import { syncAction } from './sync';
import { statusAction } from './status';
import { checkAction } from './check';
import { initAction } from './init';

export function registerContentCommands(program: Command) {
  program
    .command('init')
    .description('Initialize sync from canonical repository')
    .option('--source <repo>', 'Canonical repository')
    .option('--local <path>', 'Local canonical path')
    .action(initAction);

  program
    .command('sync')
    .description('Sync content from canonical')
    .option('--ref <ref>', 'Git ref to sync from')
    .action(syncAction);

  program
    .command('status')
    .description('Show sync status')
    .action(statusAction);

  program
    .command('check')
    .description('Check for modifications to managed files')
    .action(checkAction);
}
```

## Command Equivalence Table

| agx (platform) | agconf (compat) | agent-conf (legacy) |
|----------------|-----------------|---------------------|
| `agx content init` | `agconf init` | `agent-conf init` |
| `agx content sync` | `agconf sync` | `agent-conf sync` |
| `agx content status` | `agconf status` | `agent-conf status` |
| `agx content check` | `agconf check` | `agent-conf check` |
| `agx module add` | `agconf module add` | - |
| `agx module list` | `agconf module list` | - |
| `agx canonical init` | `agconf canonical init` | `agent-conf canonical init` |
| `agx env check` | - (needs @agx/env) | - |

## npm Package Strategy

### If `agx` is Approved

```json
{
  "name": "agx",
  "bin": {
    "agx": "./dist/entries/agx.js",
    "agconf": "./dist/entries/agconf.js",
    "agent-conf": "./dist/entries/agconf.js"
  }
}
```

### If `agx` is Not Approved

```json
{
  "name": "agconf",
  "bin": {
    "agconf": "./dist/entries/agconf.js",
    "agent-conf": "./dist/entries/agconf.js"
  }
}
```

Platform entry (`agx`) deferred until name secured, or use `agconf` as the platform name.

## Future: Plugin Architecture

If domains become separate packages:

```
@agx/core     - CLI framework, plugin loader
@agx/content  - Content sync (current functionality)
@agx/module   - Module management
@agx/env      - Environment management
@agx/lab      - Experimentation
```

`agx` would dynamically discover and load installed `@agx/*` packages.

**Implementation sketch:**

```typescript
// @agx/core
const plugins = discoverPlugins(); // Finds @agx/* in node_modules
for (const plugin of plugins) {
  plugin.register(program);
}
```

**Deferred** - only pursue if monolithic package becomes unwieldy.

## Open Questions

1. **Deprecation timeline**: How long to support `agent-conf` command?
2. **Help text**: Should `agconf --help` mention `agx` as the "full" CLI?
3. **Config location**: Should config move from `.agent-conf/` to `.agx/`?
4. **Shell completions**: Need to update for new command structure
