import { describe, expect, it } from "vitest";
import {
  buildAgentsMd,
  buildGlobalBlock,
  buildRepoBlock,
  computeGlobalBlockHash,
  extractRepoBlockContent,
  getMarkers,
  hasGlobalBlockChanges,
  isAgentsMdManaged,
  parseAgentsMd,
  parseGlobalBlockMetadata,
  stripMetadataComments,
} from "../../src/core/markers.js";

// Use getMarkers() to get marker strings for tests
const markers = getMarkers();
const GLOBAL_START_MARKER = markers.globalStart;
const GLOBAL_END_MARKER = markers.globalEnd;
const REPO_START_MARKER = markers.repoStart;
const REPO_END_MARKER = markers.repoEnd;

describe("markers", () => {
  describe("parseAgentsMd", () => {
    it("should parse content with both blocks", () => {
      const content = `${GLOBAL_START_MARKER}
<!-- DO NOT EDIT THIS SECTION - Managed by agconf CLI -->
<!-- Source: github:org/agconf@abc123 -->
<!-- Last synced: 2026-01-27T15:30:00.000Z -->

# Global Standards
Some content here

${GLOBAL_END_MARKER}

${REPO_START_MARKER}
<!-- Repository-specific instructions below -->

# Repo Specific
My custom instructions

${REPO_END_MARKER}
`;

      const result = parseAgentsMd(content);

      expect(result.hasMarkers).toBe(true);
      expect(result.globalBlock).toContain("# Global Standards");
      expect(result.repoBlock).toContain("# Repo Specific");
    });

    it("should handle content without markers", () => {
      const content = `# My Custom AGENTS.md

Some existing content that was manually created.
`;

      const result = parseAgentsMd(content);

      expect(result.hasMarkers).toBe(false);
      expect(result.globalBlock).toBeNull();
      expect(result.repoBlock).toBeNull();
    });

    it("should handle empty content", () => {
      const result = parseAgentsMd("");

      expect(result.hasMarkers).toBe(false);
      expect(result.globalBlock).toBeNull();
      expect(result.repoBlock).toBeNull();
    });

    it("should handle content with only global block", () => {
      const content = `${GLOBAL_START_MARKER}
Global content
${GLOBAL_END_MARKER}
`;

      const result = parseAgentsMd(content);

      expect(result.hasMarkers).toBe(true);
      expect(result.globalBlock).toBe("Global content");
      expect(result.repoBlock).toBeNull();
    });
  });

  describe("buildGlobalBlock", () => {
    it("should build a properly formatted global block", () => {
      const content = "# Standards\nSome content";
      const metadata = {};

      const result = buildGlobalBlock(content, metadata);

      expect(result).toContain(GLOBAL_START_MARKER);
      expect(result).toContain(GLOBAL_END_MARKER);
      expect(result).toContain("DO NOT EDIT THIS SECTION");
      expect(result).toContain("Content hash: sha256:");
      expect(result).toContain("# Standards\nSome content");
    });

    it("should compute and include content hash", () => {
      const content = "# Standards\nSome content";
      const metadata = {};

      const result = buildGlobalBlock(content, metadata);
      const expectedHash = computeGlobalBlockHash(content);

      expect(result).toContain(`Content hash: ${expectedHash}`);
    });
  });

  describe("buildRepoBlock", () => {
    it("should build a repo block with content", () => {
      const result = buildRepoBlock("My custom instructions");

      expect(result).toContain(REPO_START_MARKER);
      expect(result).toContain(REPO_END_MARKER);
      expect(result).toContain("My custom instructions");
    });

    it("should build an empty repo block when content is null", () => {
      const result = buildRepoBlock(null);

      expect(result).toContain(REPO_START_MARKER);
      expect(result).toContain(REPO_END_MARKER);
    });
  });

  describe("buildAgentsMd", () => {
    it("should build complete AGENTS.md with both blocks", () => {
      const globalContent = "# Global Standards";
      const repoContent = "# Repo Instructions";
      const metadata = {
        source: "local:/path/to/agconf",
        syncedAt: "2026-01-27T15:30:00.000Z",
      };

      const result = buildAgentsMd(globalContent, repoContent, metadata);

      expect(result).toContain(GLOBAL_START_MARKER);
      expect(result).toContain(GLOBAL_END_MARKER);
      expect(result).toContain(REPO_START_MARKER);
      expect(result).toContain(REPO_END_MARKER);
      expect(result).toContain("# Global Standards");
      expect(result).toContain("# Repo Instructions");
    });
  });

  describe("stripMetadataComments", () => {
    it("should strip metadata comments from global block", () => {
      const globalBlock = `<!-- DO NOT EDIT THIS SECTION - Managed by agconf CLI -->
<!-- Source: github:org/agconf@abc123 -->
<!-- Last synced: 2026-01-27T15:30:00.000Z -->

# Global Standards
Some content here`;

      const result = stripMetadataComments(globalBlock);

      expect(result).not.toContain("DO NOT EDIT");
      expect(result).not.toContain("Source:");
      expect(result).not.toContain("Last synced:");
      expect(result).toContain("# Global Standards");
    });
  });

  describe("extractRepoBlockContent", () => {
    it("should strip the 'Repository-specific instructions below' comment", () => {
      const content = `${GLOBAL_START_MARKER}
Global content
${GLOBAL_END_MARKER}

${REPO_START_MARKER}
<!-- Repository-specific instructions below -->

# Repo Specific
My custom instructions

${REPO_END_MARKER}
`;

      const parsed = parseAgentsMd(content);
      const extracted = extractRepoBlockContent(parsed);

      // Should NOT contain the comment since buildRepoBlock will add it fresh
      expect(extracted).not.toContain("Repository-specific instructions below");
      expect(extracted).toContain("# Repo Specific");
      expect(extracted).toContain("My custom instructions");
    });

    it("should return null for empty repo block after stripping comment", () => {
      const content = `${GLOBAL_START_MARKER}
Global content
${GLOBAL_END_MARKER}

${REPO_START_MARKER}
<!-- Repository-specific instructions below -->

${REPO_END_MARKER}
`;

      const parsed = parseAgentsMd(content);
      const extracted = extractRepoBlockContent(parsed);

      // Empty after stripping comment and whitespace
      expect(extracted).toBeNull();
    });

    it("should not duplicate comment on re-sync", () => {
      // Simulate first sync
      const globalContent = "# Global Standards";
      const repoContent = "# My Repo Instructions";
      const metadata = {
        source: "local:/path/to/agconf",
        syncedAt: "2026-01-27T15:30:00.000Z",
      };

      const firstSync = buildAgentsMd(globalContent, repoContent, metadata);

      // Count occurrences of the comment
      const countOccurrences = (str: string, substr: string) =>
        (str.match(new RegExp(substr, "g")) || []).length;

      expect(countOccurrences(firstSync, "Repository-specific instructions below")).toBe(1);

      // Simulate re-sync by parsing and rebuilding
      const parsed = parseAgentsMd(firstSync);
      const extractedRepo = extractRepoBlockContent(parsed);
      const secondSync = buildAgentsMd(globalContent, extractedRepo, metadata);

      // Should still only have one occurrence
      expect(countOccurrences(secondSync, "Repository-specific instructions below")).toBe(1);
    });
  });

  describe("computeGlobalBlockHash", () => {
    it("should return consistent hash for same content", () => {
      const content = "# Standards\nSome content";
      const hash1 = computeGlobalBlockHash(content);
      const hash2 = computeGlobalBlockHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{12}$/);
    });

    it("should return different hash for different content", () => {
      const hash1 = computeGlobalBlockHash("# Standards\nContent A");
      const hash2 = computeGlobalBlockHash("# Standards\nContent B");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("parseGlobalBlockMetadata", () => {
    it("should parse all metadata fields", () => {
      const globalBlock = `<!-- DO NOT EDIT THIS SECTION - Managed by agconf CLI -->
<!-- Source: github:org/agconf@abc123 -->
<!-- Last synced: 2026-01-27T15:30:00.000Z -->
<!-- Content hash: sha256:abc123def456 -->

# Global Standards`;

      const metadata = parseGlobalBlockMetadata(globalBlock);

      expect(metadata.source).toBe("github:org/agconf@abc123");
      expect(metadata.syncedAt).toBe("2026-01-27T15:30:00.000Z");
      expect(metadata.contentHash).toBe("sha256:abc123def456");
    });

    it("should handle missing fields gracefully", () => {
      const globalBlock = "# Global Standards\nSome content";
      const metadata = parseGlobalBlockMetadata(globalBlock);

      expect(metadata.source).toBeUndefined();
      expect(metadata.syncedAt).toBeUndefined();
      expect(metadata.contentHash).toBeUndefined();
    });
  });

  describe("hasGlobalBlockChanges", () => {
    it("should return false for unmodified AGENTS.md", () => {
      const globalContent = "# Standards\nSome content";
      const metadata = {
        source: "github:org/agconf@abc1234",
        syncedAt: "2026-01-27T15:30:00.000Z",
      };

      const agentsMd = buildAgentsMd(globalContent, "# Repo", metadata);
      expect(hasGlobalBlockChanges(agentsMd)).toBe(false);
    });

    it("should return true when global block content is modified", () => {
      const globalContent = "# Standards\nSome content";
      const metadata = {
        source: "github:org/agconf@abc1234",
        syncedAt: "2026-01-27T15:30:00.000Z",
      };

      let agentsMd = buildAgentsMd(globalContent, "# Repo", metadata);

      // Modify the global block content
      agentsMd = agentsMd.replace("Some content", "Modified content");

      expect(hasGlobalBlockChanges(agentsMd)).toBe(true);
    });

    it("should return false for content without hash (old format)", () => {
      const agentsMd = `${GLOBAL_START_MARKER}
<!-- Source: github:org/agconf@abc123 -->
<!-- Last synced: 2026-01-27T15:30:00.000Z -->

# Standards
${GLOBAL_END_MARKER}`;

      expect(hasGlobalBlockChanges(agentsMd)).toBe(false);
    });
  });

  describe("isAgentsMdManaged", () => {
    it("should return true for managed AGENTS.md", () => {
      const agentsMd = buildAgentsMd("# Standards", "# Repo", {
        source: "github:test/repo@abc",
        syncedAt: "2026-01-27T15:30:00.000Z",
      });

      expect(isAgentsMdManaged(agentsMd)).toBe(true);
    });

    it("should return false for unmanaged content", () => {
      const agentsMd = "# My Custom AGENTS.md\n\nSome content.";
      expect(isAgentsMdManaged(agentsMd)).toBe(false);
    });
  });

  describe("custom marker prefix", () => {
    const CUSTOM_PREFIX = "fbagents";

    describe("buildGlobalBlock with custom prefix", () => {
      it("should use custom prefix in markers", () => {
        const content = "# Standards\nSome content";
        const metadata = {};

        const result = buildGlobalBlock(content, metadata, { prefix: CUSTOM_PREFIX });

        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:global:start -->`);
        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:global:end -->`);
        expect(result).not.toContain("agconf:global");
      });
    });

    describe("buildRepoBlock with custom prefix", () => {
      it("should use custom prefix in markers", () => {
        const result = buildRepoBlock("My custom instructions", { prefix: CUSTOM_PREFIX });

        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:repo:start -->`);
        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:repo:end -->`);
        expect(result).not.toContain("agconf:repo");
      });
    });

    describe("buildAgentsMd with custom prefix", () => {
      it("should use custom prefix in all markers", () => {
        const globalContent = "# Global Standards";
        const repoContent = "# Repo Instructions";
        const metadata = {};

        const result = buildAgentsMd(globalContent, repoContent, metadata, {
          prefix: CUSTOM_PREFIX,
        });

        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:global:start -->`);
        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:global:end -->`);
        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:repo:start -->`);
        expect(result).toContain(`<!-- ${CUSTOM_PREFIX}:repo:end -->`);
        expect(result).not.toContain("agconf:");
      });
    });

    describe("parseAgentsMd with custom prefix", () => {
      it("should parse content with custom prefix markers", () => {
        const content = `<!-- ${CUSTOM_PREFIX}:global:start -->
<!-- DO NOT EDIT THIS SECTION -->

# Global Standards
Some content here

<!-- ${CUSTOM_PREFIX}:global:end -->

<!-- ${CUSTOM_PREFIX}:repo:start -->
<!-- Repository-specific instructions below -->

# Repo Specific
My custom instructions

<!-- ${CUSTOM_PREFIX}:repo:end -->
`;

        const result = parseAgentsMd(content, { prefix: CUSTOM_PREFIX });

        expect(result.hasMarkers).toBe(true);
        expect(result.globalBlock).toContain("# Global Standards");
        expect(result.repoBlock).toContain("# Repo Specific");
      });

      it("should not parse default markers when using custom prefix", () => {
        const content = `${GLOBAL_START_MARKER}
Global content
${GLOBAL_END_MARKER}`;

        const result = parseAgentsMd(content, { prefix: CUSTOM_PREFIX });

        expect(result.hasMarkers).toBe(false);
        expect(result.globalBlock).toBeNull();
      });
    });

    describe("isAgentsMdManaged with custom prefix", () => {
      it("should detect managed content with custom prefix", () => {
        const agentsMd = buildAgentsMd("# Standards", "# Repo", {}, { prefix: CUSTOM_PREFIX });

        expect(isAgentsMdManaged(agentsMd, { prefix: CUSTOM_PREFIX })).toBe(true);
      });

      it("should not detect default prefix as managed when using custom prefix", () => {
        const agentsMd = buildAgentsMd("# Standards", "# Repo", {});

        expect(isAgentsMdManaged(agentsMd, { prefix: CUSTOM_PREFIX })).toBe(false);
      });
    });

    describe("hasGlobalBlockChanges with custom prefix", () => {
      it("should detect changes in content with custom prefix", () => {
        const globalContent = "# Standards\nSome content";
        let agentsMd = buildAgentsMd(globalContent, "# Repo", {}, { prefix: CUSTOM_PREFIX });

        expect(hasGlobalBlockChanges(agentsMd, { prefix: CUSTOM_PREFIX })).toBe(false);

        // Modify the content
        agentsMd = agentsMd.replace("Some content", "Modified content");

        expect(hasGlobalBlockChanges(agentsMd, { prefix: CUSTOM_PREFIX })).toBe(true);
      });
    });
  });
});
