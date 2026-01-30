# Plan: Publish agent-conf as High-Quality Open Source npm Package

## Overview

Transform the agent-conf CLI into a production-ready open source project with proper documentation, CI/CD automation, npm publishing with provenance, and semantic versioning using Changesets.

## Configuration

- **GitHub Owner:** julian-pani
- **Copyright Holder:** Julian Pani
- **Release Management:** Changesets (automated version PRs)

## Current State

**What exists (good foundation):**
- Well-structured TypeScript CLI at `/cli/`
- Biome linting/formatting configured
- Vitest testing with unit + integration tests
- tsup build configuration (ESM, Node 20+)
- Comprehensive README with usage docs
- MIT license declared in package.json

**What's missing:**
- LICENSE file (text)
- CHANGELOG.md
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- GitHub CI/CD workflows
- npm publishing configuration
- Git tags/releases
- GitHub issue/PR templates

---

## Implementation Plan

### Phase 1: Documentation Files

**1.1 Create LICENSE file**
- Location: `cli/LICENSE`
- Content: MIT license text with copyright holder

**1.2 Create CHANGELOG.md**
- Location: `cli/CHANGELOG.md`
- Format: [Keep a Changelog](https://keepachangelog.com/)
- Document all v0.1.0 features

**1.3 Create CONTRIBUTING.md**
- Location: `cli/CONTRIBUTING.md`
- Cover: setup, code style (Biome), testing, commit conventions, PR process

**1.4 Create CODE_OF_CONDUCT.md**
- Location: `cli/CODE_OF_CONDUCT.md`
- Adopt: Contributor Covenant v2.1

**1.5 Create SECURITY.md**
- Location: `cli/SECURITY.md`
- Cover: supported versions, vulnerability reporting, response timeline

---

### Phase 2: Update package.json

**File:** `cli/package.json`

Add/update fields:
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/julian-pani/agent-conf.git",
    "directory": "cli"
  },
  "homepage": "https://github.com/julian-pani/agent-conf#readme",
  "bugs": {
    "url": "https://github.com/julian-pani/agent-conf/issues"
  },
  "author": "Julian Pani",
  "keywords": ["cli", "ai-agents", "claude", "codex", "developer-tools", "config-sync"]
}
```

---

### Phase 3: CI/CD Workflows

**3.1 Create CI workflow**
- Location: `.github/workflows/ci.yml`
- Triggers: push to master, PRs
- Jobs: lint, typecheck, test (Node 20 + 22), build
- Uses pnpm with caching

**3.2 Create Changesets workflow**
- Location: `.github/workflows/changesets.yml`
- Triggers: push to master
- Creates "Version Packages" PR when changesets exist
- Publishes to npm with provenance when PR is merged
- Requires `NPM_TOKEN` secret

**3.3 Create Dependabot config**
- Location: `.github/dependabot.yml`
- Weekly npm updates for `/cli` directory

---

### Phase 4: Changesets Setup

**4.1 Install Changesets**
```bash
cd cli && pnpm add -D @changesets/cli @changesets/changelog-github
```

**4.2 Initialize Changesets**
```bash
pnpm changeset init
```

**4.3 Configure Changesets**
- Location: `cli/.changeset/config.json`
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "julian-pani/agent-conf" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**4.4 Add changeset scripts to package.json**
```json
{
  "scripts": {
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

---

### Phase 5: GitHub Templates

**5.1 Issue templates**
- Location: `.github/ISSUE_TEMPLATE/`
- Files: `bug_report.yml`, `feature_request.yml`, `config.yml`

**5.2 PR template**
- Location: `.github/PULL_REQUEST_TEMPLATE.md`
- Checklist for contributors

---

### Phase 6: README Enhancements

**File:** `cli/README.md`

Add badges at top:
- npm version
- CI status
- License

---

### Phase 7: First Release (v0.1.0)

1. Verify npm package name availability (`npm view agent-conf`)
2. Create npm account / generate automation token
3. Add `NPM_TOKEN` and `GITHUB_TOKEN` secrets to GitHub repo
4. Run `npm pack` locally to verify package contents
5. For initial release, manually publish: `cd cli && pnpm build && npm publish --provenance --access public`
6. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0" && git push origin v0.1.0`
7. Create GitHub Release from tag

**Subsequent releases (via Changesets):**
1. Contributors run `pnpm changeset` to create changeset files
2. CI creates "Version Packages" PR automatically
3. Merge PR to trigger npm publish + GitHub Release

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `cli/LICENSE` | Create |
| `cli/CHANGELOG.md` | Create |
| `cli/CONTRIBUTING.md` | Create |
| `cli/CODE_OF_CONDUCT.md` | Create |
| `cli/SECURITY.md` | Create |
| `cli/package.json` | Modify (add metadata + changeset scripts) |
| `cli/README.md` | Modify (add badges) |
| `cli/.changeset/config.json` | Create (via `pnpm changeset init`) |
| `.github/workflows/ci.yml` | Create |
| `.github/workflows/changesets.yml` | Create |
| `.github/dependabot.yml` | Create |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Create |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | Create |
| `.github/ISSUE_TEMPLATE/config.yml` | Create |
| `.github/PULL_REQUEST_TEMPLATE.md` | Create |

---

## Verification

1. **Linting:** `cd cli && pnpm check` passes
2. **Tests:** `cd cli && pnpm test` passes
3. **Build:** `cd cli && pnpm build` produces valid dist/
4. **Package:** `cd cli && npm pack` creates correct tarball
5. **CI:** Push branch, verify all workflow jobs pass
6. **Release:** Create test tag, verify npm publish + GitHub Release

---

## Post-Launch

- Configure GitHub branch protection (require CI to pass)
- Enable Dependabot alerts and security updates
- Monitor npm downloads and GitHub issues
- Consider adding Conventional Commits + commitlint for future releases
