# Rules Sync - Technical Design

## 1. Data Structures

### Rule Interface

```typescript
// cli/src/core/rules.ts

export interface RuleFrontmatter {
  /**
   * Glob patterns for conditional rule loading (Claude-specific feature).
   * Example: ["src/api/**/*.ts", "lib/api/**/*.ts"]
   */
  paths?: string[];

  /**
   * Metadata added by agent-conf during sync.
   * Keys use the configured marker prefix with underscores.
   */
  metadata?: {
    [key: string]: string;
  };

  /**
   * Any other frontmatter fields from the original rule.
   */
  [key: string]: unknown;
}

export interface Rule {
  /**
   * Relative path from rules directory root.
   * Example: "security/api-auth.md"
   */
  relativePath: string;

  /**
   * Full file content including frontmatter.
   */
  rawContent: string;

  /**
   * Parsed frontmatter (null if no frontmatter or parse error).
   */
  frontmatter: RuleFrontmatter | null;

  /**
   * Content without frontmatter (body only).
   */
  body: string;
}

export interface RulesSyncOptions {
  /** Replace all rules vs merge */
  override: boolean;

  /** Targets to sync to */
  targets: Target[];

  /** Marker prefix for AGENTS.md sections */
  markerPrefix: string;

  /** Metadata key prefix (derived from markerPrefix) */
  metadataPrefix: string;
}

export interface RulesSyncResult {
  /** Rules discovered in source */
  discovered: number;

  /** Per-target results */
  targets: {
    [K in Target]?: TargetRulesResult;
  };
}

export interface TargetRulesResult {
  /** Files/rules synced */
  synced: number;

  /** Files/rules deleted (orphans) */
  deleted: number;

  /** Warnings encountered */
  warnings: string[];
}
```

### Lockfile Extension

```typescript
// cli/src/schemas/lockfile.ts - additions

export const RulesLockfileSchema = z.object({
  /** List of all rule relative paths synced */
  files: z.array(z.string()),

  /** Hash of all rule contents for change detection */
  content_hash: z.string(),

  /** Per-target specific data */
  targets: z.record(z.string(), z.object({
    /** Target-specific content hash */
    hash: z.string(),
    /** Count of rules for this target */
    count: z.number(),
  })).optional(),
});

// Extend ContentSchema
export const ContentSchema = z.object({
  agents_md: AgentsMdContentSchema,
  skills: z.array(z.string()),
  targets: z.array(z.string()).optional(),
  marker_prefix: z.string().optional(),

  // NEW
  rules: RulesLockfileSchema.optional(),
});
```

---

## 2. Markdown Concatenation Algorithm

### Heading Level Adjustment

```typescript
/**
 * Adjusts markdown heading levels by a given increment.
 *
 * @param content - Markdown content to adjust
 * @param increment - Number of levels to add (positive = deeper)
 * @returns Adjusted markdown content
 *
 * Rules:
 * - Only ATX headings are adjusted (# style, not underline style)
 * - Headings in code blocks are NOT adjusted
 * - Maximum heading level is 6 (h7+ stay as h6)
 * - Minimum heading level is 1 (can't go below h1)
 */
export function adjustHeadingLevels(content: string, increment: number): string {
  // Track if we're inside a code block
  let inCodeBlock = false;

  return content.split('\n').map(line => {
    // Check for code block boundaries
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }

    // Skip lines in code blocks
    if (inCodeBlock) {
      return line;
    }

    // Match ATX headings: ^(#{1,6})\s+(.*)$
    const headingMatch = line.match(/^(#{1,6})(\s+.*)$/);
    if (!headingMatch) {
      return line;
    }

    const [, hashes, rest] = headingMatch;
    const currentLevel = hashes.length;
    const newLevel = Math.min(6, Math.max(1, currentLevel + increment));

    return '#'.repeat(newLevel) + rest;
  }).join('\n');
}
```

### Concatenation Format

For each rule file, generate this block:

```markdown
<!-- Rule: {relativePath} -->
{paths comment if applicable}

{adjusted content}

```

Full section structure:

```markdown
<!-- {prefix}:rules:start -->
<!-- DO NOT EDIT THIS SECTION - Managed by agent-conf -->
<!-- Content hash: sha256:{hash} -->
<!-- Rule count: {count} -->

# Project Rules

{concatenated rules}

<!-- {prefix}:rules:end -->
```

### Path Frontmatter Handling

```typescript
/**
 * Generates a comment describing the paths a rule applies to.
 * Only included if the rule has a `paths` frontmatter field.
 */
function generatePathsComment(paths: string[]): string {
  if (!paths || paths.length === 0) return '';

  // Single path
  if (paths.length === 1) {
    return `<!-- Applies to: ${paths[0]} -->\n`;
  }

  // Multiple paths
  return `<!-- Applies to:\n${paths.map(p => `     - ${p}`).join('\n')}\n-->\n`;
}
```

### Full Concatenation Function

```typescript
export function generateRulesSection(
  rules: Rule[],
  markerPrefix: string,
): string {
  // Sort rules alphabetically by path for deterministic output
  const sortedRules = [...rules].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  );

  const parts: string[] = [];

  // Opening markers
  parts.push(`<!-- ${markerPrefix}:rules:start -->`);
  parts.push(`<!-- DO NOT EDIT THIS SECTION - Managed by agent-conf -->`);
  parts.push(`<!-- Content hash: sha256:${computeRulesHash(sortedRules)} -->`);
  parts.push(`<!-- Rule count: ${rules.length} -->`);
  parts.push('');
  parts.push('# Project Rules');
  parts.push('');

  // Each rule
  for (const rule of sortedRules) {
    parts.push(`<!-- Rule: ${rule.relativePath} -->`);

    // Add paths comment if applicable
    if (rule.frontmatter?.paths && rule.frontmatter.paths.length > 0) {
      parts.push(generatePathsComment(rule.frontmatter.paths));
    }

    // Adjust heading levels (+1 to nest under "# Project Rules")
    const adjustedBody = adjustHeadingLevels(rule.body.trim(), 1);
    parts.push(adjustedBody);
    parts.push('');  // Blank line between rules
  }

  // Closing marker
  parts.push(`<!-- ${markerPrefix}:rules:end -->`);

  return parts.join('\n');
}
```

---

## 3. AGENTS.md Section Insertion

### Section Placement Strategy

When inserting the rules section into AGENTS.md:

1. **If rules markers exist**: Replace content between markers
2. **If no markers exist**:
   - If global section exists: Insert after global section, before repo section
   - If no global section: Append at end of file

```typescript
export function updateAgentsMdWithRules(
  agentsMdContent: string,
  rulesSection: string,
  markerPrefix: string,
): string {
  const rulesStartMarker = `<!-- ${markerPrefix}:rules:start -->`;
  const rulesEndMarker = `<!-- ${markerPrefix}:rules:end -->`;

  // Check if rules markers already exist
  const startIdx = agentsMdContent.indexOf(rulesStartMarker);
  const endIdx = agentsMdContent.indexOf(rulesEndMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing rules section
    const before = agentsMdContent.slice(0, startIdx);
    const after = agentsMdContent.slice(endIdx + rulesEndMarker.length);
    return before + rulesSection + after;
  }

  // No existing rules section - find insertion point
  const globalEndMarker = `<!-- ${markerPrefix}:global:end -->`;
  const repoStartMarker = `<!-- ${markerPrefix}:repo:start -->`;

  // Try to insert between global end and repo start
  const globalEndIdx = agentsMdContent.indexOf(globalEndMarker);
  if (globalEndIdx !== -1) {
    const insertPoint = globalEndIdx + globalEndMarker.length;
    const before = agentsMdContent.slice(0, insertPoint);
    const after = agentsMdContent.slice(insertPoint);
    return before + '\n\n' + rulesSection + after;
  }

  // No global section, try to insert before repo section
  const repoStartIdx = agentsMdContent.indexOf(repoStartMarker);
  if (repoStartIdx !== -1) {
    const before = agentsMdContent.slice(0, repoStartIdx);
    const after = agentsMdContent.slice(repoStartIdx);
    return before + rulesSection + '\n\n' + after;
  }

  // No markers at all - append at end
  return agentsMdContent.trimEnd() + '\n\n' + rulesSection + '\n';
}
```

---

## 4. Claude Target - File Sync

### Directory Structure

```
Target: downstream/.claude/rules/
Source: canonical/rules/

Sync creates exact mirror of source structure with metadata added.
```

### Metadata Addition

```typescript
export function addRuleMetadata(
  rule: Rule,
  metadataPrefix: string,
): string {
  const managedKey = `${metadataPrefix}_managed`;
  const hashKey = `${metadataPrefix}_content_hash`;
  const sourceKey = `${metadataPrefix}_source_path`;

  // Compute hash of original content (before our metadata)
  const contentHash = computeContentHash(rule.body);

  // Build new frontmatter
  const newMetadata = {
    ...rule.frontmatter?.metadata,
    [managedKey]: 'true',
    [hashKey]: `sha256:${contentHash}`,
    [sourceKey]: rule.relativePath,
  };

  // Rebuild frontmatter
  const newFrontmatter = {
    ...rule.frontmatter,
    metadata: newMetadata,
  };

  // Remove null/undefined values
  delete newFrontmatter.metadata;
  if (Object.keys(newMetadata).length > 0) {
    newFrontmatter.metadata = newMetadata;
  }

  return stringifyFrontmatter(newFrontmatter) + rule.body;
}
```

### Orphan Detection

```typescript
export async function findOrphanedRules(
  targetRulesDir: string,
  sourceRules: Rule[],
  metadataPrefix: string,
): Promise<string[]> {
  const orphans: string[] = [];
  const sourceSet = new Set(sourceRules.map(r => r.relativePath));

  // Walk target rules directory
  const targetRules = await discoverRulesInDir(targetRulesDir);

  for (const targetRule of targetRules) {
    // Not in source = potentially orphaned
    if (!sourceSet.has(targetRule.relativePath)) {
      // Only delete if it's managed by us
      if (isManaged(targetRule, metadataPrefix)) {
        orphans.push(targetRule.relativePath);
      }
    }
  }

  return orphans;
}

function isManaged(rule: Rule, metadataPrefix: string): boolean {
  const managedKey = `${metadataPrefix}_managed`;
  return rule.frontmatter?.metadata?.[managedKey] === 'true';
}
```

---

## 5. Error Handling

### Parse Errors

```typescript
interface RuleParseWarning {
  path: string;
  error: string;
}

// In discoverRules():
// - Invalid YAML frontmatter → warn, treat as no frontmatter
// - Binary files → skip with warning
// - Unreadable files → skip with warning
```

### Sync Errors

```typescript
interface RuleSyncError {
  path: string;
  target: Target;
  error: string;
}

// - Permission denied → error, continue with other rules
// - Disk full → throw (fatal)
// - Invalid markdown → warn, sync anyway
```

---

## 6. Hash Computation

### Individual Rule Hash

Used for change detection (stored in metadata):

```typescript
function computeContentHash(body: string): string {
  // Hash only the body (excluding our metadata)
  // Normalize line endings to LF
  const normalized = body.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

### Aggregate Rules Hash

Used for lockfile and rules section marker:

```typescript
function computeRulesHash(rules: Rule[]): string {
  // Sort by path for determinism
  const sorted = [...rules].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  );

  // Hash all paths and bodies together
  const combined = sorted.map(r => `${r.relativePath}:${r.body}`).join('\n---\n');
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
}
```

---

## 7. Frontmatter Parsing

Use `gray-matter` library (already used for skills):

```typescript
import matter from 'gray-matter';

function parseRule(content: string, relativePath: string): Rule {
  try {
    const { data, content: body } = matter(content);
    return {
      relativePath,
      rawContent: content,
      frontmatter: data as RuleFrontmatter,
      body,
    };
  } catch (error) {
    // Parse error - treat as no frontmatter
    return {
      relativePath,
      rawContent: content,
      frontmatter: null,
      body: content,
    };
  }
}
```

---

## 8. File System Operations

### Discovery

```typescript
async function discoverRulesInDir(rulesDir: string): Promise<Rule[]> {
  const rules: Rule[] = [];

  async function walk(dir: string, basePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Recurse into subdirectory
        await walk(fullPath, relativePath);
      } else if (entry.isSymbolicLink()) {
        // Follow symlink
        const realPath = await fs.realpath(fullPath);
        const stat = await fs.stat(realPath);
        if (stat.isFile() && entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          rules.push(parseRule(content, relativePath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        rules.push(parseRule(content, relativePath));
      }
      // Skip other file types silently
    }
  }

  await walk(rulesDir);
  return rules;
}
```

### Write with Directory Creation

```typescript
async function writeRule(
  targetDir: string,
  rule: Rule,
  content: string,
): Promise<void> {
  const targetPath = path.join(targetDir, rule.relativePath);

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  // Write file
  await fs.writeFile(targetPath, content, 'utf-8');
}
```

---

## 9. Integration Points

### sync.ts Changes

```typescript
// In sync() function:

// After skills sync
if (resolvedSource.rulesPath) {
  const rulesResult = await syncRules(
    resolvedSource.rulesPath,
    targetDir,
    {
      override: options.override,
      targets: options.targets,
      markerPrefix,
      metadataPrefix: markerPrefixToMetadataPrefix(markerPrefix),
    },
  );

  result.rules = rulesResult;
}

// In SyncResult interface:
interface SyncResult {
  // ... existing fields
  rules?: RulesSyncResult;
}
```

### Lockfile Changes

```typescript
// In writeLockfile():
if (result.rules) {
  content.rules = {
    files: result.rules.files,
    content_hash: result.rules.contentHash,
    targets: result.rules.targetHashes,
  };
}
```

---

## 10. Testing Strategy

### Unit Test Cases

1. **adjustHeadingLevels**
   - h1 → h2 (increment 1)
   - h6 → h6 (cap at 6)
   - Code blocks unchanged
   - Inline code unchanged
   - Multiple headings in one file

2. **generateRulesSection**
   - Single rule
   - Multiple rules (verify ordering)
   - Rules with paths frontmatter
   - Rules without frontmatter
   - Empty rules array

3. **updateAgentsMdWithRules**
   - Insert with existing global/repo markers
   - Insert with no existing markers
   - Replace existing rules section
   - Preserve surrounding content

4. **discoverRules**
   - Flat directory
   - Nested directories
   - Symlinks
   - Non-markdown files (should skip)
   - Empty directory

5. **orphan detection**
   - Managed orphan (should be deleted)
   - Non-managed orphan (should be preserved)
   - No orphans

### Integration Test Cases

1. Full sync with rules → verify Claude gets files, Codex gets concatenated
2. Sync without rules in canonical → backward compat
3. Re-sync with rule added → incremental update
4. Re-sync with rule removed → orphan deletion
5. Check command detects rule modification
