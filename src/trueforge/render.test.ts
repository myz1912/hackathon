import { mkdir, mkdtemp, readFile, realpath, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POSTFORGE_AGENT_NAME } from "./register.js";
import { RENDER_AGENT_NAME, sandboxDirFor, stageMedia } from "./render.js";

describe("TrueForge render staging", () => {
  it("rejects an unsafe session id", async () => {
    const root = await mkdtemp(join(tmpdir(), "postforge-sandboxes-"));
    await expect(sandboxDirFor("../../outside", root)).rejects.toThrow(TypeError);
  });

  it("selects only a real contained sandbox directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "postforge-sandboxes-"));
    const session = join(root, "session-1");
    const realSandbox = join(session, "sandbox-1");
    const outside = join(root, "outside");
    await mkdir(realSandbox, { recursive: true });
    await mkdir(outside);
    await utimes(realSandbox, new Date(1_000), new Date(1_000));
    await utimes(outside, new Date(2_000), new Date(2_000));
    await symlink(outside, join(session, "newest-symlink"));

    await expect(sandboxDirFor("session-1", root)).resolves.toBe(await realpath(realSandbox));
  });

  it("rejects duplicate basenames without overwriting staged media", async () => {
    const parent = await mkdtemp(join(tmpdir(), "postforge-stage-"));
    const sandbox = join(parent, "sandbox");
    const first = join(parent, "first");
    const second = join(parent, "second");
    await mkdir(sandbox);
    await mkdir(first);
    await mkdir(second);
    await writeFile(join(first, "clip.mp4"), "first");
    await writeFile(join(second, "clip.mp4"), "second");

    await expect(stageMedia(sandbox, [first, second])).rejects.toThrow("Duplicate staged media name");
    await expect(readFile(join(sandbox, "media", "clip.mp4"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("reports the actual regular files available in the media directory", async () => {
    const parent = await mkdtemp(join(tmpdir(), "postforge-stage-count-"));
    const sandbox = join(parent, "sandbox");
    const source = join(parent, "source");
    await mkdir(join(sandbox, "media"), { recursive: true });
    await mkdir(source);
    await writeFile(join(sandbox, "media", "existing.mp4"), "existing");
    await writeFile(join(source, "new.mp4"), "new");

    await expect(stageMedia(sandbox, [source])).resolves.toBe(2);
  });

  it("uses the shared registered agent name", () => {
    expect(RENDER_AGENT_NAME).toBe(POSTFORGE_AGENT_NAME);
  });
});
