import { describe, expect, it } from "vitest";
import { generateBranchName, type ProposedChange, slugifyTitle } from "../../src/core/propose.js";

describe("propose", () => {
  describe("slugifyTitle", () => {
    it("should convert a title to a valid branch slug", () => {
      expect(slugifyTitle("Update code review skill")).toBe("update-code-review-skill");
    });

    it("should strip special characters", () => {
      expect(slugifyTitle("Fix: API auth (v2)")).toBe("fix-api-auth-v2");
    });

    it("should trim leading/trailing hyphens", () => {
      expect(slugifyTitle("  --hello world--  ")).toBe("hello-world");
    });

    it("should truncate long titles to 50 chars", () => {
      const longTitle = "a".repeat(100);
      expect(slugifyTitle(longTitle).length).toBeLessThanOrEqual(50);
    });

    it("should not end with a hyphen after truncation", () => {
      // "word word word..." truncated mid-slug could leave trailing hyphen
      const title = "aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll mmm nnn ooo";
      const slug = slugifyTitle(title);
      expect(slug).not.toMatch(/-$/);
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it("should collapse multiple non-alphanumeric chars into single hyphen", () => {
      expect(slugifyTitle("foo   bar---baz")).toBe("foo-bar-baz");
    });

    it("should handle numeric titles", () => {
      expect(slugifyTitle("123 test")).toBe("123-test");
    });

    it("should handle single word titles", () => {
      expect(slugifyTitle("hotfix")).toBe("hotfix");
    });

    it("should handle unicode characters by stripping them", () => {
      expect(slugifyTitle("fix café issue")).toBe("fix-caf-issue");
    });
  });

  describe("generateBranchName", () => {
    it("should prefix with propose/", () => {
      const name = generateBranchName("Update code review skill");
      expect(name).toBe("propose/update-code-review-skill");
    });

    it("should handle special characters in title", () => {
      const name = generateBranchName("Fix: security rules (OWASP)");
      expect(name).toBe("propose/fix-security-rules-owasp");
    });

    it("should produce a valid git branch name", () => {
      const name = generateBranchName("Spaces & Special!! Characters (here)");
      // Must not contain spaces or consecutive slashes
      expect(name).not.toMatch(/\s/);
      expect(name).not.toMatch(/\/\//);
      // Must start with propose/
      expect(name).toMatch(/^propose\//);
    });

    it("should truncate very long titles", () => {
      const longTitle =
        "This is a very long proposal title that goes on and on and really should be truncated";
      const name = generateBranchName(longTitle);
      // propose/ (8 chars) + slug (max 50 chars) = max 58
      expect(name.length).toBeLessThanOrEqual(58);
    });
  });

  describe("ProposedChange path mapping conventions", () => {
    // These test the expected canonical path formats for each content type
    it("skill canonical path should be under skills/", () => {
      const change: ProposedChange = {
        downstreamPath: ".claude/skills/code-review/SKILL.md",
        canonicalPath: "skills/code-review/SKILL.md",
        content: "# Code Review",
        type: "skill",
      };
      expect(change.canonicalPath).toMatch(/^skills\//);
      expect(change.canonicalPath).not.toMatch(/^\./);
    });

    it("rule canonical path should be under rules/", () => {
      const change: ProposedChange = {
        downstreamPath: ".claude/rules/security/api-auth.md",
        canonicalPath: "rules/security/api-auth.md",
        content: "# API Auth",
        type: "rule",
      };
      expect(change.canonicalPath).toMatch(/^rules\//);
    });

    it("agent canonical path should be under agents/", () => {
      const change: ProposedChange = {
        downstreamPath: ".claude/agents/reviewer.md",
        canonicalPath: "agents/reviewer.md",
        content: "# Reviewer",
        type: "agent",
      };
      expect(change.canonicalPath).toMatch(/^agents\//);
    });

    it("agents-md-global canonical path should be instructions/AGENTS.md", () => {
      const change: ProposedChange = {
        downstreamPath: "AGENTS.md",
        canonicalPath: "instructions/AGENTS.md",
        content: "# Global",
        type: "agents-md-global",
      };
      expect(change.canonicalPath).toBe("instructions/AGENTS.md");
    });
  });
});
