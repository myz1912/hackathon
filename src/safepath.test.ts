import { mkdir, mkdtemp, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PathEscapeError, resolveWithinRoot } from "./safepath.js";

async function roots(): Promise<{ parent: string; root: string; outside: string }> {
  const parent = await mkdtemp(join(tmpdir(), "postforge-path-"));
  const root = join(parent, "media");
  const outside = join(parent, "outside");
  await mkdir(root);
  await mkdir(outside);
  return { parent, root, outside };
}

describe("resolveWithinRoot", () => {
  it("rejects parent traversal", async () => {
    const { root } = await roots();
    expect(() => resolveWithinRoot(root, "../outside/secret.mp4")).toThrow(PathEscapeError);
  });

  it("rejects an absolute path outside the root", async () => {
    const { root, outside } = await roots();
    expect(() => resolveWithinRoot(root, join(outside, "secret.mp4"))).toThrow(PathEscapeError);
  });

  it("rejects a sibling directory with the same string prefix", async () => {
    const { parent, root } = await roots();
    const sibling = join(parent, "media-evil");
    await mkdir(sibling);
    expect(() => resolveWithinRoot(root, join(sibling, "secret.mp4"))).toThrow(PathEscapeError);
  });

  it("rejects a symlink inside the root that points outside", async () => {
    const { root, outside } = await roots();
    await writeFile(join(outside, "secret.mp4"), "secret");
    await symlink(outside, join(root, "escape"));
    expect(() => resolveWithinRoot(root, "escape/secret.mp4")).toThrow(PathEscapeError);
  });

  it("accepts a legitimate nested path", async () => {
    const { root } = await roots();
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "nested", "clip.mp4"), "clip");
    expect(resolveWithinRoot(root, "nested/clip.mp4")).toBe(
      await realpath(join(root, "nested", "clip.mp4")),
    );
  });
});
