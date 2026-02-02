# Multi-Source & Modules Architecture Exploration

> **Status**: Early exploration / Discussion document
> **Created**: 2026-02-01
> **Last Updated**: 2026-02-01

## Table of Contents

1. [Understanding the Underlying Needs](#1-understanding-the-underlying-needs)
2. [Analysis of Current Architecture](#2-analysis-of-current-architecture)
3. [Proposal Analysis & Challenges](#3-proposal-analysis--challenges)
4. [Alternative Approaches](#4-alternative-approaches)
5. [Recommended Direction](#5-recommended-direction)
6. [Open Questions](#6-open-questions)

---

## 1. Understanding the Underlying Needs

Before diving into the proposed solutions, let me articulate what I believe you're actually trying to solve:

### 1.1 The Core Problem: Configuration Composition

Currently, agent-conf assumes a **single canonical source → many downstreams** model. But real organizations have:

```
                    ┌─────────────────┐
                    │  Open Source    │  (community best practices,
                    │  "Marketplace"  │   self-learning loops, etc.)
                    └────────┬────────┘
                             │ depends on
                             ▼
                    ┌─────────────────┐
                    │  Company-Wide   │  (security policies,
                    │  Standards      │   compliance, tooling)
                    └────────┬────────┘
                             │ depends on
                             ▼
                    ┌─────────────────┐
                    │  Team-Level     │  (frontend conventions,
                    │  Conventions    │   backend patterns)
                    └────────┬────────┘
                             │ depends on
                             ▼
                    ┌─────────────────┐
                    │  Project Repo   │  (project-specific
                    │  (downstream)   │   instructions)
                    └─────────────────┘
```

This is a **dependency graph of configurations**, not just a single source relationship.

### 1.2 The Granularity Problem: All or Nothing

Currently, `sync` brings **everything** from the canonical. But organizations need:

- **Mandatory compliance** (security guidelines MUST be present)
- **Optional opt-in** (team can choose to use the "code review" skill or not)
- **Context-sensitive** (different rules for prototype vs. production)

### 1.3 The Ecosystem Problem: Sharing Beyond Organizations

Your "self-learning loop" idea is a perfect example: it's a **packaged capability** that:
- Requires multiple coordinated pieces (skills, hooks, env vars)
- Should be shareable across organizations
- Needs version pinning and explicit upgrade paths
- Has prerequisites and configuration requirements

### 1.4 Summary of Underlying Needs

| Need | What You Proposed | Core Question |
|------|-------------------|---------------|
| Configuration composition | Multiple sources | How do sources compose without conflicts? |
| Selective adoption | Modules/bundles | What's the right granularity? |
| Mandatory enforcement | Required modules | How to balance flexibility vs. compliance? |
| Ecosystem sharing | Marketplace | How to distribute and discover? |
| Context awareness | Work modes | Is this essential or accidental complexity? |

---

## 2. Analysis of Current Architecture

### 2.1 What the Current Model Does Well

1. **Simple mental model**: One source of truth, clear ownership
2. **Safe merging**: Markers preserve local customizations
3. **Version pinning**: Explicit, reviewable upgrades via lockfile
4. **Integrity checking**: Hashes prevent drift
5. **CI/CD integration**: Automated enforcement

### 2.2 What It Can't Handle

1. **Inheritance chains**: No way to say "A depends on B depends on C"
2. **Partial adoption**: Can't cherry-pick from canonical
3. **Cross-cutting concerns**: Security module can't be layered on top of team module
4. **Configuration conflicts**: What if two sources define the same skill?

### 2.3 Key Architectural Decisions to Preserve

Whatever changes we make should maintain:

- **Explicit version pinning** (auditable upgrades)
- **Content integrity** (hash verification)
- **Local customization preservation** (marker system)
- **Deterministic syncs** (same inputs → same outputs)
- **Offline capability** (can work with local paths)

---

## 3. Proposal Analysis & Challenges

### 3.1 Multiple Canonical Sources

**What You Proposed**: A downstream can sync from multiple canonical sources.

**The Challenge**: **Conflict Resolution**

```yaml
# What happens when:
# - canonical-A has skill "code-review" v1.2
# - canonical-B has skill "code-review" v2.0

# Or worse:
# - canonical-A says: "Always use TypeScript"
# - canonical-B says: "JavaScript is fine for scripts"
```

**Options for conflict resolution**:

| Strategy | Pros | Cons |
|----------|------|------|
| **Last wins** (order-dependent) | Simple | Non-deterministic, fragile |
| **Explicit override** (user declares winner) | Clear intent | Verbose, manual |
| **Namespace isolation** (prefixed skills/sections) | No conflicts | Breaks composability |
| **Dependency tree** (only leaf nodes sync) | Clean model | Complex mental model |

**My Take**: Multiple sources without a clear composition model creates **accidental complexity**. The problem isn't "multiple sources" - it's "hierarchical inheritance".

**Counter-proposal**: Instead of "multiple peers", what about **chained canonicals**?

```
marketplace/self-learning → my-org/standards → my-repo

# Each layer:
# - Inherits from parent
# - Can add new content
# - Can override parent content (explicit)
# - Cannot remove required content from parent
```

This is more like class inheritance than multiple inheritance - simpler to reason about.

### 3.2 Modules/Bundles

**What You Proposed**: Canonicals declare modules; downstreams choose which to install.

**This is a strong idea.** It addresses the granularity problem directly.

**Design Questions**:

1. **What's in a module?**
   ```yaml
   # Option A: Just grouping existing primitives
   modules:
     security:
       skills: [security-review, vulnerability-scan]
       instructions: security-guidelines.md

   # Option B: New abstraction with rich metadata
   modules:
     security:
       name: "Security Guidelines"
       skills: [...]
       hooks: [pre-commit-security-scan]
       env_vars:
         required: [SNYK_TOKEN]
         optional: [SECURITY_LEVEL]
       prerequisites:
         cli_version: ">=2.0.0"
         targets: [claude]  # Only works with Claude
   ```

2. **How do modules compose?**
   ```yaml
   # Can modules depend on other modules?
   modules:
     advanced-security:
       extends: security
       adds:
         skills: [pen-test-helper]
   ```

3. **What's the installation unit?**
   - Whole modules (all or nothing within module)?
   - Individual skills with module as just a category?

**My Take**: Modules are valuable, but **keep them simple initially**:
- Module = named group of skills + instructions section
- No module-to-module dependencies (use canonical chaining for that)
- Required modules = must install
- Optional modules = user chooses

### 3.3 Required vs Optional Modules

**What You Proposed**: Canonicals can mark modules as required (mandatory for all downstreams).

**This is essential for compliance use cases.**

**Design Considerations**:

```yaml
# In canonical's agent-conf.yaml
modules:
  security:
    required: true  # Cannot be skipped
    skills: [...]

  productivity:
    required: false  # Opt-in
    skills: [...]
```

**Enforcement questions**:
- What happens if a downstream tries to skip a required module?
  - Error during sync? (strict)
  - Warning but allow? (permissive)
  - Depends on mode? (flexible)

- Can required modules be overridden in the chain?
  - Company requires security
  - Team canonical inherits from company
  - Can team make security optional? (probably not)

**My Take**: Required = truly required. Enforcement should be strict. If you need flexibility, use different branches or a different canonical.

### 3.4 Canonical as Downstream

**What You Proposed**: A canonical repo can also be a downstream of another canonical.

**This is the key insight that enables the ecosystem.**

```
           ┌──────────────────┐
           │ marketplace/     │
           │ self-learning    │
           └────────┬─────────┘
                    │ (my-org/standards is a downstream)
                    ▼
           ┌──────────────────┐
           │ my-org/standards │ ← Also a canonical for...
           └────────┬─────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    my-repo-1   my-repo-2   my-repo-3
```

**Implementation considerations**:

1. **Cycle detection**: A → B → C → A must be prevented
2. **Flattening vs. layering**:
   - Does my-repo see one merged view?
   - Or can it distinguish "from marketplace" vs "from company"?
3. **Override semantics**: Can my-org override marketplace content?

**My Take**: This is powerful but needs careful design. The simplest model:
- Each canonical sees its upstream as a single source (not modules)
- It can override/extend any content
- Downstreams see the flattened result
- Original provenance tracked in metadata (for debugging)

### 3.5 Work Modes (Prototyping vs Production)

**What You Proposed**: Different bundles selected based on "mode".

**Let me challenge this one.**

**The Question**: Is this essential complexity or accidental complexity?

**Arguments against a first-class "mode" concept**:

1. **Branches already exist**: `main` for production rules, `prototype` branch for relaxed rules
2. **Modes add cognitive load**: Now users must understand sources × modules × modes
3. **Mode proliferation**: prototype, production, testing, staging, demo...?
4. **Enforcement ambiguity**: Who decides what mode a repo is in?

**Arguments for modes**:

1. **Same repo, different contexts**: Running tests vs. shipping code
2. **Easier than branches**: Don't need to maintain parallel branches
3. **Runtime selection**: CI could run in "strict" mode while local dev is "relaxed"

**My Take**: I'd **defer this feature** until the core module system is working. You can achieve most of what you want with:
- Branches in the canonical
- Module optionality (prototype skips "strict-review", production includes it)
- Environment variables that skills/hooks check

If modes become clearly necessary, they can be added later as syntactic sugar over module selection.

---

## 4. Alternative Approaches

### 4.1 Alternative A: Layered Canonicals (Recommended Starting Point)

Instead of "multiple sources" as peers, model it as a **directed acyclic graph of canonicals**:

```yaml
# my-org/standards/agent-conf.yaml
version: "2.0.0"

upstream:
  repository: marketplace/ai-standards
  version: "1.5.0"  # Pinned!

# My org adds/overrides on top of upstream
content:
  instructions: instructions/AGENTS.md
  skills_dir: skills

modules:
  # Inherit all modules from upstream, plus:
  company-security:
    required: true
    skills: [security-review, compliance-check]

  # Can mark upstream modules as required for our downstreams
  inherit:
    - name: self-learning  # From marketplace
      required: true        # We mandate it
```

**Benefits**:
- Clear precedence (child overrides parent)
- Single "effective" configuration (flattened view)
- Version pinning at each layer
- No peer conflicts to resolve

### 4.2 Alternative B: Package Manager Mental Model

Think of modules like npm packages:

```yaml
# downstream/.agent-conf/config.yaml
dependencies:
  "@marketplace/self-learning": "^1.0.0"
  "@my-org/security": "2.0.0"
  "@my-org/frontend-standards": "~3.1.0"

# Automatic conflict detection
# Clear version resolution (semver)
# Lock file for reproducibility
```

**Benefits**:
- Familiar mental model (npm/yarn)
- Rich ecosystem tooling patterns to learn from
- Clear versioning semantics

**Challenges**:
- More complex implementation
- Need registry/discovery mechanism
- May be overkill for current scale

### 4.3 Alternative C: Feature Flags Instead of Modes

Instead of explicit modes, use feature flags that can be set per-environment:

```yaml
# canonical agent-conf.yaml
modules:
  strict-review:
    when:
      env: AGENT_CONF_STRICT  # Only enabled if env var set
    skills: [...]

  prototype-helpers:
    when:
      not_env: CI  # Disabled in CI
    skills: [...]
```

**Benefits**:
- No new "mode" concept
- Runtime flexibility
- CI can enforce stricter rules naturally

---

## 5. Recommended Direction

Based on this analysis, here's what I'd recommend:

### Phase 1: Modules (Foundation)

**Add the module concept without multi-source yet.**

```yaml
# agent-conf.yaml
modules:
  security:
    required: true
    skills: [security-review]
    instructions_section: security  # Maps to section in AGENTS.md

  code-review:
    required: false
    skills: [review-helper, pr-summary]
```

```yaml
# downstream's selection (in init or config)
modules:
  - security     # Required anyway, but explicit
  - code-review  # Opted in
  # - testing    # Available but not selected
```

**Why start here**:
- Solves granularity problem without conflict complexity
- Enables required vs optional distinction
- Foundation for multi-source later
- Incremental change to current model

### Phase 2: Upstream Canonicals (Composition)

**Add the ability for a canonical to have an upstream.**

```yaml
# my-org/standards/agent-conf.yaml
upstream:
  repository: marketplace/ai-standards
  version: "1.5.0"

# Inherits modules from upstream
# Can add new modules
# Can override upstream module settings
# Can make optional modules required
```

**Why as phase 2**:
- Enables your ecosystem vision
- Builds on module foundation
- Clear composition semantics (inheritance, not peers)

### Phase 3: Ecosystem Features (If Needed)

- Module discovery/registry
- Dependency resolution
- Environment-based module selection
- Module prerequisites validation

---

## 6. Open Questions

These need discussion before implementation:

### 6.1 Module Granularity

**Q: Can a module contain sub-modules, or are they flat?**

Flat is simpler but might not scale. Nested enables:
```yaml
modules:
  security:
    submodules:
      basic: [...]
      advanced: [...]
```

### 6.2 Instruction Composition

**Q: How do instructions (AGENTS.md content) compose across modules?**

Options:
- Each module contributes a section (concatenated)
- Modules can override sections by name
- Only one "primary" instruction source, modules just add skills

### 6.3 Lockfile Complexity

**Q: How does the lockfile track multi-source state?**

Current lockfile tracks one source. With modules and upstreams:
```json
{
  "sources": {
    "direct": { "repository": "...", "version": "..." },
    "upstream": { "repository": "...", "version": "..." }
  },
  "modules": {
    "security": { "source": "direct", "hash": "..." },
    "self-learning": { "source": "upstream", "hash": "..." }
  }
}
```

### 6.4 Breaking Change Strategy

**Q: Is this a major version bump?**

The module system changes config schema significantly. Options:
- New schema version (2.0.0) with migration path
- Backward-compatible addition (modules optional)
- Parallel mode (detect and handle both)

### 6.5 Marketplace Discovery

**Q: How do users find modules?**

Options:
- GitHub topics/search (organic)
- Central registry (curated)
- Awesome list (community-maintained)
- Discovery command in CLI (`agent-conf search self-learning`)

---

## 7. Refined Understanding (Discussion Round 1)

### 7.1 Semantic Conflicts vs Structural Conflicts

My initial framing of conflicts was naive. The real problem isn't "two files named the same" - it's **semantic contradiction in instructions**:

```markdown
# From company standards
Always use comprehensive error handling with specific error types.

# From external "fast-prototyping" module
Skip error handling during prototyping; focus on happy path first.
```

These don't "conflict" structurally (different files, different sections), but they **contradict semantically**. The LLM will receive both and make arbitrary choices.

**This opens a new problem space**: **Context Consistency Analysis**

- Not just merging files, but analyzing the **composed context** for coherence
- Tooling that can detect semantic contradictions (possibly LLM-assisted)
- Provenance tracking: where did each instruction come from?
- Debugging: when friction occurs, trace back to the source

**Key insight**: agent-conf becomes the **composition layer**, but needs hooks for **validation tooling** that sits on top.

### 7.2 Trust Boundaries: Internal vs External

A cleaner model than "upstream inheritance" is **trust zones**:

```
┌─────────────────────────────────────────────────────────┐
│                    EXTERNAL ZONE                         │
│  (marketplace, open source, community)                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ self-learning│  │ orchestration│  │ code-review  │   │
│  │    module    │  │    module    │  │   helpers    │   │
│  └──────┬───────┘  └──────────────┘  └──────────────┘   │
│         │                                                │
│         │ explicit, reviewed, version-pinned             │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    INTERNAL ZONE                         │
│  (company-controlled)                                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           my-org/engineering-standards            │   │
│  │  - security (required)                            │   │
│  │  - testing (required)                             │   │
│  │  - depends on: self-learning@1.5.0 (external)    │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│                     │ auto-merge OK, required enforced   │
│         ┌───────────┼───────────────┐                    │
│         ▼           ▼               ▼                    │
│    frontend-    backend-       data-team                 │
│    standards    standards      standards                 │
│         │           │               │                    │
└─────────┼───────────┼───────────────┼───────────────────┘
          │           │               │
          ▼           ▼               ▼
      repo-1      repo-2          repo-3
```

**Behavioral differences by zone**:

| Aspect | Internal (Company) | External (Marketplace) |
|--------|-------------------|------------------------|
| Updates | Can auto-merge | Manual review required |
| `required` | Enforced | Advisory only (company decides) |
| Trust | Implicit | Explicit review |
| Breaking changes | Coordinated rollout | Must pin versions |
| Provenance | "ours" | "third-party" |

**This is a better primitive than just "upstream"** - it captures the organizational reality.

### 7.3 Self-Learning Loop as Design Case Study

Based on discussion, the self-learning loop requires:

#### What it needs to install/configure:

| Artifact Type | Example | Current Support |
|---------------|---------|-----------------|
| Skills | `friction-report`, `categorize-issue`, `delegate-fix` | ✅ Yes |
| Instructions | Sections in AGENTS.md about reporting friction | ✅ Yes |
| Hooks | Claude Code hooks for friction detection | ❌ No (not managed) |
| MCP Servers | Server for async processing, history lookup | ❌ No |
| Environment vars | API keys, endpoint URLs | ❌ No (validation only?) |
| Config changes | Allow/deny lists in settings | ❌ No |
| External services | Async processing backend | ❌ Way out of scope |

#### The workflow it enables:

```
1. FRICTION DETECTION (during coding session)
   ├─ Agent encounters issue (missing context, wrong approach, etc.)
   ├─ Hook captures: conversation ID, context, commit SHA, what happened
   └─ Reports to async processing (doesn't block main work)

2. ASYNC CATEGORIZATION
   ├─ What kind of issue? (docs / env / skills / instructions)
   ├─ What scope? (this repo / team / company-wide)
   ├─ Consults history of past issues
   ├─ Searches online for solutions
   └─ Checks tool docs (Claude Code, Codex features)

3. REMEDIATION
   ├─ Delegates to subagents for changes
   ├─ Changes may touch:
   │   ├─ Project repo (local fix)
   │   ├─ Team canonical (semi-global)
   │   ├─ Company canonical (global)
   │   └─ Engineer's local env (MCP, env vars)
   └─ Creates PRs, notifies humans for review
```

#### Why this can't be a Claude Code plugin alone:

1. **Cross-repo changes**: Fixes may need to go to canonical repos, not just current project
2. **Configuration changes**: May need to modify allow/deny lists, settings
3. **Environment setup**: MCP servers, env vars need validation/setup
4. **Async infrastructure**: Needs backend service for processing (out of band)
5. **Multi-agent orchestration**: Subagents working across different repos

**This validates the "module as rich bundle" model** - modules aren't just skill groupings, they're **coordinated capabilities** with:
- Multiple artifact types
- Prerequisites and validation
- Setup/installation procedures
- Configuration requirements

### 7.4 Revised Module Model

Given these insights, a module should be:

```yaml
# In canonical's agent-conf.yaml
modules:
  self-learning:
    name: "Self-Learning Feedback Loop"
    description: "Captures friction, categorizes issues, delegates fixes"

    # What it provides
    artifacts:
      skills:
        - friction-report
        - categorize-issue
        - delegate-fix
      instructions:
        section: self-learning-guidelines
        file: instructions/self-learning.md
      hooks:
        - name: friction-detector
          type: post-conversation  # hypothetical
          script: hooks/friction-detector.sh

    # What it requires
    prerequisites:
      env_vars:
        required:
          - FRICTION_API_ENDPOINT
          - FRICTION_API_KEY
        optional:
          - FRICTION_LOG_LEVEL
      mcp_servers:
        - name: friction-processor
          setup: "See setup instructions at..."
      cli_version: ">=2.0.0"

    # Validation
    validation:
      script: scripts/validate-self-learning-setup.sh
      description: "Verifies all prerequisites are configured"

    # Documentation
    docs:
      setup: docs/SETUP.md
      usage: docs/USAGE.md
```

**Key additions to original module concept**:
- **Prerequisites**: What must exist before module works
- **Validation**: Script to verify setup is correct
- **Non-skill artifacts**: Hooks, MCP server references, config snippets
- **Setup documentation**: Guides for manual steps

### 7.5 Implications for agent-conf Architecture

1. **Module registry in lockfile**: Track which modules installed, their sources, versions
2. **Prerequisite checking**: `agent-conf sync` validates prerequisites, warns/errors if missing
3. **Setup mode**: `agent-conf setup <module>` runs validation, guides user through prereqs
4. **Provenance tracking**: Every artifact knows its source module and zone (internal/external)
5. **Consistency hooks**: Extension point for semantic analysis tools

### 7.6 Updated Phasing

| Phase | What | Unlocks |
|-------|------|---------|
| **1** | Basic modules (skills + instructions grouping) | Granular adoption |
| **2** | Trust zones (internal vs external sources) | Safe ecosystem integration |
| **3** | Rich modules (prereqs, validation, hooks) | Self-learning loop possible |
| **4** | Consistency tooling hooks | Semantic conflict detection |

---

## 8. Vision Expansion (Discussion Round 2)

### 8.1 The Larger Vision: AI DevEx Platform

The conversation has revealed a vision larger than "sync markdown files":

**Core goal**: Treat AI coding environments as **reproducible, testable, observable artifacts**.

Analogous to:
- Docker/Nix for build environments
- Terraform for infrastructure
- ESLint configs for code style

But for the entire AI agent development experience.

### 8.2 Platform Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI DevEx Platform                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONTENT LAYER (current agent-conf focus)                       │
│  ├── Instructions (AGENTS.md, CLAUDE.md)                        │
│  ├── Skills (reusable agent capabilities)                       │
│  ├── Rules (modular instruction files)                          │
│  └── Hooks (Claude Code hooks)                                  │
│                                                                  │
│  ENVIRONMENT LAYER (expansion)                                   │
│  ├── MCP Servers (what tools are available)                     │
│  ├── Environment variables (API keys, config)                   │
│  ├── Settings (allow/deny lists, permissions)                   │
│  └── Tool versions (Claude Code version, etc.)                  │
│                                                                  │
│  GOVERNANCE LAYER (expansion)                                    │
│  ├── Audit trail (who changed what, when)                       │
│  ├── Compliance (required modules enforced)                     │
│  ├── Rollout control (staged deployment)                        │
│  └── Approval workflows (review before deploy)                  │
│                                                                  │
│  LEARNING LAYER (expansion)                                      │
│  ├── Friction detection (capture issues)                        │
│  ├── Categorization (scope, type, severity)                     │
│  ├── Remediation (fix in right place)                           │
│  └── Feedback loops (measure improvement)                       │
│                                                                  │
│  EXPERIMENTATION LAYER (expansion)                               │
│  ├── Config variants (A/B testing)                              │
│  ├── Evaluations (measure agent performance)                    │
│  ├── Comparisons (Claude vs Codex, config A vs B)               │
│  └── RL integration (deterministic env for training)            │
│                                                                  │
│  OBSERVABILITY LAYER (expansion)                                 │
│  ├── Usage metrics (what's being used)                          │
│  ├── Friction patterns (common issues)                          │
│  ├── Drift detection (configs diverging)                        │
│  └── Health dashboards (org-wide view)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Architecture Decision: Core + Modules

Rather than building a monolith or fragmenting into separate tools, the recommendation is **core + capability modules**:

```
agent-conf (core)
│
├── Built-in capabilities
│   ├── sync - Content synchronization
│   ├── status - Show current state
│   ├── check - Verify integrity
│   └── config - Manage settings
│
└── Installable modules (npm packages or git repos)
    ├── @agent-conf/env - Environment management
    ├── @agent-conf/gov - Governance & audit
    ├── @agent-conf/lab - Experimentation
    ├── @agent-conf/loop - Self-learning
    └── @community/... - Third-party modules
```

**This eats our own dogfood**: agent-conf's module system is used to extend agent-conf itself.

**Benefits**:
- Core stays minimal and stable
- Modules are opt-in (adopt what you need)
- Clear versioning (module versions independent)
- Ecosystem-friendly (third parties can contribute)
- Dogfooding validates the module design

### 8.4 GitHub Issues as Friction Tracker (v0/v1)

**Proposed approach**: Use GitHub Issues for friction tracking initially.

**Trade-offs**:

| Aspect | Assessment |
|--------|------------|
| Infrastructure | ✅ Zero - just GitHub |
| Structured data | ⚠️ Rely on issue templates |
| Cross-repo patterns | ⚠️ Need aggregation agent |
| Query/analysis | ⚠️ Limited, needs periodic synthesis |
| Migration path | ✅ Issues exportable via API |

**Recommendation**: Accept limitations for v0/v1. Dedicated `friction-tracker` repo in org. Strict issue templates. Periodic "synthesis agent" runs to identify patterns.

**Where issues live**:
```
my-org/friction-tracker/
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── friction-report.md (structured template)
│       └── pattern-identified.md (for synthesis results)
├── AGENTS.md (instructions for agents working here)
└── analysis/ (synthesis reports, trends)
```

### 8.5 Reproducibility Depth

For deterministic environments (RL, evals), what needs to be captured?

| Layer | What to capture | Difficulty |
|-------|-----------------|------------|
| Content | Instructions, skills, rules | ✅ Current focus |
| Config | Settings, allow/deny lists | 🔶 Feasible |
| Environment | Env vars, MCP servers | 🔶 Feasible |
| Tool versions | Claude Code version | 🔶 Can detect |
| Model version | Claude model being used | ⚠️ Not user-controlled |
| External state | API responses, file system | ❌ Very hard |

**Practical reproducibility**: Content + Config + Environment + Tool versions. Model version is noted but not controlled. External state is out of scope.

### 8.6 Naming Consideration

Is "agent-conf" the right name for a platform?

| Option | Pros | Cons |
|--------|------|------|
| Keep "agent-conf" | Established, clear | Undersells the vision |
| "agent-stack" | Suggests platform | Generic |
| "agentenv" | Environment focus | Too narrow |
| "devagent" | Dev + Agent | Exists? |

**Tentative**: Keep "agent-conf" as the core tool name. The platform/ecosystem could be "agent-conf ecosystem" or just emerge organically.

### 8.7 Revised Phasing (Platform View)

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| **1** | Content modules | Module schema, selection, required/optional |
| **2** | Trust zones | Internal vs external sources, update policies |
| **3** | Rich modules | Prerequisites, validation, non-skill artifacts |
| **4** | Capability modules | Extend agent-conf itself via modules |
| **5** | Environment layer | MCP, env vars, settings management |
| **6** | Learning loop | Friction detection, categorization, remediation |
| **7** | Experimentation | Config variants, evals, comparisons |
| **8** | Governance | Audit, compliance, rollout control |

Each phase is independently valuable. Organizations can stop at any phase based on needs.

---

## Next Steps

1. **Discuss this document** - Challenge my analysis, add considerations I missed
2. **Decide on Phase 1 scope** - Modules design detailed spec
3. **Prototype** - Spike the module config schema and selection logic
4. **User testing** - Validate with 2-3 real use cases before committing

---

## Appendix A: Comparison Matrix

| Feature | Current | Your Proposal | My Recommendation |
|---------|---------|---------------|-------------------|
| Sources | Single | Multiple peers | Layered (DAG) |
| Granularity | All or nothing | Modules | Modules |
| Required content | N/A | Required modules | Required modules |
| Inheritance | N/A | Canonical as downstream | Upstream declaration |
| Modes | N/A | Work modes | Defer (use env vars) |
| Discovery | Manual | Marketplace | Phase 3+ |
