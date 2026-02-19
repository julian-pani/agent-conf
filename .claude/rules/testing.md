---
paths:
  - "cli/src/commands/*.ts"
  - "cli/tests/**/*.ts"
---

# Testing Requirements

Every command file in `cli/src/commands/` must have a corresponding test file that covers flag validation, error paths, and orchestration logic.

When modifying sync behavior, you MUST also update AND TEST the check command. See AGENTS.md "Check Command Integrity Requirement" for the full checklist.

Run `pnpm test` from `cli/` to verify all tests pass before committing.
