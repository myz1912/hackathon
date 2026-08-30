import { mkdir, mkdtemp, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PathEscapeError } from "../safepath.js";
import { assertSafeId, resolveWithin, sessionArtifactPath } from "./safe-id.js";

describe("safe TrueForge paths", () => {
  it("rejects unsafe server identifiers", () => {
    expect(() => assertSafeId("../../outside")).toThrow(TypeError);
    expect(() => assertSafeId("")).toThrow(TypeError);
    expect(() => assertSafeId("a".repeat(65))).toThrow(TypeError);
    expect(assertSafeId("session_A-123")).toBe("session_A-123");
  });

  it("returns a canonical strict descendant and rejects a symlink escape", async () => {
    const parent = await mkdtemp(join(tmpdir(), "postforge-safe-id-"));
    const root = join(parent, "root");
    const child = join(root, "child");
    const outside = join(parent, "outside");
    await mkdir(child, { recursive: true });
    await mkdir(outside);
    await symlink(outside, join(root, "escape"));

    expect(resolveWithin(root, "child")).toBe(await realpath(child));
    expect(() => resolveWithin(root, ".")).toThrow(PathEscapeError);
    expect(() => resolveWithin(root, "escape", "file.json")).toThrow(PathEscapeError);
  });

  it("keeps session-derived artifact names inside their root", async () => {
    const root = await mkdtemp(join(tmpdir(), "postforge-artifacts-"));
    expect(sessionArtifactPath(root, "turn-", "session-1")).toBe(
      join(await realpath(root), "turn-session-1.json"),
    );
    expect(() => sessionArtifactPath(root, "turn-", "../../outside")).toThrow(TypeError);
  });
});
