---
name: documentation-standards
description: Guidelines and best practices for creating and maintaining project documentation. Use when writing new docs, reviewing documentation quality, or establishing documentation structure for a project. Invoke with /documentation-standards.
---

# Documentation Standards

You are a documentation specialist. Use these standards when creating, reviewing, or restructuring project documentation.

These are **general baseline standards**. Projects may have additional, project-specific documentation conventions (see "Project-specific conventions" below). When project-specific conventions exist, they take precedence over these general guidelines for the areas they cover.

## Documentation Hierarchy

Every project should have documentation organized in layers, from high-level to detailed:

### Layer 1: README.md (Package Front Page)

The README is the first thing users see. It must be **concise and scannable**.

**Must include:**
- Project name and one-line description
- Badges (npm version, CI status, license)
- Quick start (3-5 steps to get running)
- Command/API summary table (brief, not exhaustive)
- Link to full documentation

**Must NOT include:**
- Detailed feature explanations (link to docs/ instead)
- Full configuration references
- Architecture decisions
- Long code examples
- Contributor guidelines

**Rule of thumb:** If a README section exceeds ~15 lines, it belongs in `docs/` with a link from the README.

### Layer 2: docs/ Directory (Detailed Documentation)

The `docs/` directory contains feature documentation, guides, and references. Organize by audience and purpose.

**Flat structure** (for projects with fewer than ~10 doc files):

```
docs/
├── getting-started.md          # Extended setup guide
├── <feature-name>.md           # One file per major feature
├── configuration.md            # Full configuration reference
├── architecture.md             # Architecture decisions and rationale
├── troubleshooting.md          # Common issues and solutions
└── contributing.md             # Contributor guidelines
```

**Sub-directory structure** (when docs/ grows beyond ~10 files):

```
docs/
├── guides/                     # How-to guides (task-oriented)
│   ├── getting-started.md
│   └── migration.md
├── features/                   # Feature documentation (one per feature)
│   ├── authentication.md
│   └── notifications.md
├── reference/                  # Reference material (exhaustive, lookup-oriented)
│   ├── configuration.md
│   └── cli-commands.md
├── adr/                        # Architectural Decision Records
│   ├── 001-choose-database.md
│   └── 002-api-versioning.md
└── contributing.md             # Contributor guidelines
```

**Common sub-directory conventions:**

| Sub-dir | Purpose | When to use |
|---------|---------|-------------|
| `guides/` | Task-oriented how-to docs | When you have 3+ guides |
| `features/` | Feature-specific documentation | When you have 5+ features with their own docs |
| `reference/` | Exhaustive reference material (config, API, CLI) | When you have multiple reference docs |
| `adr/` | Architectural Decision Records | When you want to record design decisions (any project size) |

**Principles:**
- **One topic per file** - a feature, a concept, or a workflow
- **Name files after the topic** - `authentication.md`, not `advanced-features.md`
- **Keep files focused** - if a file exceeds 300 lines, consider splitting it
- **Cross-reference** - link between docs, don't duplicate content
- **Start flat, add structure when needed** - don't create sub-dirs preemptively

### Architectural Decision Records (ADRs)

ADRs record significant design decisions. They can be adopted at any project size.

**File naming:** `NNN-short-title.md` (e.g., `001-use-postgres.md`)

**Standard structure:**
```markdown
# N. Short Title

Date: YYYY-MM-DD
Status: proposed | accepted | deprecated | superseded by [N](link)

## Context
[What is the issue? What forces are at play?]

## Decision
[What was decided and why]

## Consequences
[What are the results of this decision?]
```

### Layer 3: Inline Code Documentation

- **Public APIs**: Document parameters, return values, and side effects
- **Complex logic**: Explain the "why", not the "what"
- **Do NOT over-document**: Self-explanatory code needs no comments

### Layer 4: AGENTS.md / CLAUDE.md (Agent Instructions)

- Technical context for AI coding agents
- Architecture patterns, key modules, development commands
- NOT user-facing documentation

## Monorepo and Multi-Module Projects

When a repository contains multiple independently consumable packages, services, or modules:

### Module-level documentation

Each independently consumable module gets its own README and optionally its own `docs/`:

```
packages/
  auth/
    README.md                   # Auth package README
    docs/                       # Auth-specific detailed docs
    src/
  api/
    README.md                   # API package README
    docs/
    src/
docs/                           # Cross-cutting docs (architecture, onboarding)
README.md                       # Root README (project overview, links to modules)
```

**Guidelines:**

| Question | If yes → module-level docs | If no → top-level docs only |
|----------|---------------------------|----------------------------|
| Is the module independently published/released? | Own README + optional docs/ | Document at top level |
| Does the module have its own users/consumers? | Own README + optional docs/ | Document at top level |
| Does the module have its own CLI or API? | Own README with quick start | Reference from top level |
| Is it an internal implementation module? | No separate docs needed | Inline comments + AGENTS.md |

**Root README in monorepos** should:
- Describe the overall project and its purpose
- List all modules with one-line descriptions and links
- Cover shared development setup (install, build, test)
- NOT duplicate module-specific documentation

## Audience Separation

Maintain clear separation between:

| Audience | Location | Content |
|----------|----------|---------|
| **Users** (consumers of the package/tool) | README.md, docs/ | How to install, configure, use |
| **Contributors** (developers of the package) | CONTRIBUTING.md, docs/architecture.md | How to build, test, release, design decisions |
| **AI Agents** | AGENTS.md, .claude/ | Codebase context, patterns, commands |

## Writing Style

- **Use imperative mood** for instructions: "Run the command" not "You should run the command"
- **Lead with the action** in each section
- **Use tables** for reference data (commands, options, settings)
- **Use code blocks** with language hints for all code/config examples
- **Use relative links** between docs: `[Setup Guide](./docs/getting-started.md)`
- **Avoid jargon** in user-facing docs; use it freely in contributor/agent docs
- **Keep paragraphs short** - 2-3 sentences max

## Formatting Standards

### Headings
- `#` for page title (one per file)
- `##` for major sections
- `###` for subsections
- Don't skip levels (no `#` then `###`)
- Use sentence case: "Getting started" not "Getting Started"

### Code Examples
- Always specify language: ` ```bash `, ` ```yaml `, ` ```typescript `
- Show minimal, working examples
- Include expected output when helpful
- Use comments to explain non-obvious parts

### Tables
- Use for structured reference data (commands, options, settings)
- Keep cells concise
- Align columns for readability in source

### Links
- Prefer relative links for internal docs
- Include link text that describes the destination: `[Configuration guide](./docs/configuration.md)` not `[click here](./docs/configuration.md)`

## Project-Specific Conventions

These general standards are a baseline. Projects often have additional documentation requirements that override or extend them. Look for project-specific documentation conventions in these locations:

1. **Agent rules** (e.g., `.claude/rules/documentation.md`) - the recommended location for project-specific doc conventions
2. **docs/CONVENTIONS.md** or **docs/README.md** - sometimes used to describe doc structure
3. **Agent memory** - the doc-reviewer and doc-planner agents accumulate project conventions over time

### Common project-specific conventions

Projects may define conventions for any of the following. When they do, follow those conventions instead of (or in addition to) these general standards:

**Documentation site generators** (Jekyll, MkDocs, Docusaurus, VitePress, etc.):
- Required frontmatter fields (title, nav_order, layout, sidebar_position, etc.)
- Index/navigation file updates (mkdocs.yml nav section, _sidebar.md, sidebars.js, etc.)
- Build/preview commands
- Asset and image handling
- URL slug conventions

**File conventions:**
- Required metadata or frontmatter in doc files
- Naming conventions beyond what's described here
- Template files for new docs
- Required sections in specific doc types

**Review and publishing workflows:**
- Approval processes for doc changes
- Staging/preview environments
- Auto-generation from code (API docs, CLI references)
- Versioned documentation requirements

**When creating project-specific conventions**, define them in a rule file or conventions doc, not by modifying this skill. This skill provides the general baseline; project-specific rules layer on top.

## Documentation Maintenance Checklist

When reviewing documentation (for a new feature or during an audit):

1. **Completeness**: Every user-facing feature has documentation
2. **Accuracy**: Documentation matches current code behavior
3. **Location**: Content is in the right layer (README vs docs/ vs inline)
4. **Freshness**: No references to removed features or old behavior
5. **Links**: All internal links resolve; no broken references
6. **Examples**: Code examples are correct and runnable
7. **Consistency**: Formatting follows these standards throughout
8. **Cross-references**: New docs are linked from relevant existing docs
9. **Project conventions**: Project-specific requirements are met (frontmatter, index files, etc.)

## Anti-Patterns to Avoid

- **README bloat**: Putting detailed docs in README instead of docs/
- **Orphan docs**: Documentation files not linked from anywhere
- **Stale docs**: Features changed but docs not updated
- **Duplicate content**: Same information in multiple places (link instead)
- **Implementation docs as user docs**: Exposing internal details to users
- **Missing docs**: New features shipped without any documentation
- **Wall of text**: Long paragraphs without structure or formatting
- **Premature structure**: Creating sub-dirs or module-level docs before they're needed
