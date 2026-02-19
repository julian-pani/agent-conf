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
