import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
  buildInstallCommand,
  detectFromBinaryPath,
  detectFromNpmPrefix,
  detectFromUserAgent,
  detectPackageManager,
} from "../../src/utils/package-manager.js";

describe("package-manager", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe("buildInstallCommand", () => {
    it("builds npm install command", () => {
      expect(buildInstallCommand("npm", "agconf")).toBe("npm install -g agconf@latest");
    });

    it("builds pnpm install command", () => {
      expect(buildInstallCommand("pnpm", "agconf")).toBe("pnpm add -g agconf@latest");
    });

    it("builds yarn install command", () => {
      expect(buildInstallCommand("yarn", "agconf")).toBe("yarn global add agconf@latest");
    });

    it("builds bun install command", () => {
      expect(buildInstallCommand("bun", "agconf")).toBe("bun install -g agconf@latest");
    });
  });

  describe("detectFromUserAgent", () => {
    it("detects pnpm from user agent", () => {
      process.env.npm_config_user_agent = "pnpm/8.15.0 npm/? node/v20.11.0 darwin arm64";
      expect(detectFromUserAgent()).toBe("pnpm");
    });

    it("detects yarn from user agent", () => {
      process.env.npm_config_user_agent = "yarn/1.22.19 npm/? node/v20.11.0 darwin arm64";
      expect(detectFromUserAgent()).toBe("yarn");
    });

    it("detects bun from user agent", () => {
      process.env.npm_config_user_agent = "bun/1.0.0 npm/? node/v20.11.0 darwin arm64";
      expect(detectFromUserAgent()).toBe("bun");
    });

    it("detects npm from user agent", () => {
      process.env.npm_config_user_agent = "npm/10.2.4 node/v20.11.0 darwin arm64";
      expect(detectFromUserAgent()).toBe("npm");
    });

    it("returns null when env var is not set", () => {
      delete process.env.npm_config_user_agent;
      expect(detectFromUserAgent()).toBeNull();
    });

    it("returns null for unrecognized user agent", () => {
      process.env.npm_config_user_agent = "unknown/1.0.0";
      expect(detectFromUserAgent()).toBeNull();
    });
  });

  describe("detectFromBinaryPath", () => {
    let realpathSyncSpy: MockInstance;

    beforeEach(() => {
      realpathSyncSpy = vi.spyOn(fs, "realpathSync");
    });

    it("detects pnpm from .pnpm-global path", () => {
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue(
        "/home/user/.local/share/pnpm/.pnpm-global/5/node_modules/agconf/dist/index.js",
      );
      expect(detectFromBinaryPath()).toBe("pnpm");
    });

    it("detects pnpm from node_modules/.pnpm path", () => {
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue(
        "/home/user/.local/share/pnpm/global/5/node_modules/.pnpm/agconf@1.0.0/node_modules/agconf/dist/index.js",
      );
      expect(detectFromBinaryPath()).toBe("pnpm");
    });

    it("detects bun from .bun path", () => {
      process.argv[1] = "/home/user/.bun/bin/agconf";
      realpathSyncSpy.mockReturnValue(
        "/home/user/.bun/install/global/node_modules/agconf/dist/index.js",
      );
      expect(detectFromBinaryPath()).toBe("bun");
    });

    it("detects yarn from .yarn path", () => {
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue("/home/user/.yarn/global/node_modules/agconf/dist/index.js");
      expect(detectFromBinaryPath()).toBe("yarn");
    });

    it("detects yarn from yarn/global path", () => {
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue(
        "/home/user/.config/yarn/global/node_modules/agconf/dist/index.js",
      );
      expect(detectFromBinaryPath()).toBe("yarn");
    });

    it("returns null for unrecognized path", () => {
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue("/usr/local/lib/node_modules/agconf/dist/index.js");
      expect(detectFromBinaryPath()).toBeNull();
    });

    it("returns null when argv[1] is undefined", () => {
      process.argv = [process.argv[0]];
      expect(detectFromBinaryPath()).toBeNull();
    });

    it("returns null when realpathSync throws", () => {
      process.argv[1] = "/broken/symlink";
      realpathSyncSpy.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(detectFromBinaryPath()).toBeNull();
    });
  });

  describe("detectFromNpmPrefix", () => {
    it("returns null when argv[1] is undefined", () => {
      process.argv = [process.argv[0]];
      expect(detectFromNpmPrefix()).toBeNull();
    });
  });

  describe("detectPackageManager", () => {
    let realpathSyncSpy: MockInstance;

    beforeEach(() => {
      realpathSyncSpy = vi.spyOn(fs, "realpathSync");
    });

    it("returns env var detection with highest priority", () => {
      process.env.npm_config_user_agent = "pnpm/8.15.0 npm/? node/v20.11.0";
      // Even if binary path suggests something else
      realpathSyncSpy.mockReturnValue("/home/user/.bun/install/agconf/dist/index.js");

      const result = detectPackageManager("agconf");
      expect(result.name).toBe("pnpm");
      expect(result.detectedVia).toBe("npm_config_user_agent");
    });

    it("falls back to binary path when env var is absent", () => {
      delete process.env.npm_config_user_agent;
      process.argv[1] = "/usr/local/bin/agconf";
      realpathSyncSpy.mockReturnValue(
        "/home/user/.local/share/pnpm/.pnpm-global/5/node_modules/agconf/dist/index.js",
      );

      const result = detectPackageManager("agconf");
      expect(result.name).toBe("pnpm");
      expect(result.detectedVia).toBe("binary path");
    });

    it("falls back to npm default when nothing matches", () => {
      delete process.env.npm_config_user_agent;
      process.argv[1] = "/some/unknown/path/agconf";
      realpathSyncSpy.mockReturnValue("/some/unknown/path/agconf");

      const result = detectPackageManager("agconf");
      expect(result.name).toBe("npm");
      expect(result.detectedVia).toBe("default");
      expect(result.installCommand).toBe("npm install -g agconf@latest");
    });

    it("includes correct install command for detected PM", () => {
      process.env.npm_config_user_agent = "yarn/1.22.19 npm/?";

      const result = detectPackageManager("agconf");
      expect(result.installCommand).toBe("yarn global add agconf@latest");
    });
  });
});
