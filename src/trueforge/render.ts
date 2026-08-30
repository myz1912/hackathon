/**
 * Stage media into a session's sandbox, then have the agent render it with the
 * `video-cut` skill.
 *
 * The sandbox is genuinely confined: it cannot read the repository working tree or /tmp
 * ("Operation not permitted"), so media must be placed inside the session's own sandbox
 * directory. The sandbox is provisioned lazily on the first `exec`, which is why this
 * sends a trivial priming turn before copying anything.
 *
 *   npm run tf:render -- ./inputs ./cards
 */
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { TrueForgeClient } from "./client.js";
import { runTurnWithApprovals, allowAll } from "./hitl.js";

const SANDBOX_ROOT = path.join(
  homedir(),
  "Library",
  "Application Support",
  "trueforge",
  "sandboxes",
);

/** Newest sandbox directory belonging to a session, once TrueForge has provisioned one. */
export async function sandboxDirFor(sessionId: string): Promise<string | undefined> {
  const base = path.join(SANDBOX_ROOT, sessionId);
  if (!existsSync(base)) return undefined;
  const entries = await readdir(base);
  const dirs = await Promise.all(
    entries.map(async (name) => {
      const full = path.join(base, name);
      return { full, mtime: (await stat(full)).mtimeMs };
    }),
  );
  return dirs.sort((a, b) => b.mtime - a.mtime)[0]?.full;
}

export async function stageMedia(sandboxDir: string, sources: readonly string[]): Promise<number> {
  const target = path.join(sandboxDir, "media");
  await mkdir(target, { recursive: true });
  let staged = 0;
  for (const dir of sources) {
    if (!existsSync(dir)) continue;
    for (const name of await readdir(dir)) {
      await cp(path.join(dir, name), path.join(target, name));
      staged += 1;
    }
  }
  return staged;
}

const RENDER_BRIEF = `Load your video-cut skill and follow it. The event footage and the caption cards c1.png..c6.png are staged in ./media/ in your sandbox.

Produce agent-cut.mp4 in your sandbox cwd: 1080x1350, about 20 seconds, SIX segments, AUDIO KEPT.

Per the skill: probe the clips; scan each with volumedetect in 6-second windows and pick the highest-energy windows; normalise each segment with loudnorm=I=-16:TP=-1.5:LRA=11; scale+crop to 1080x1350 with setsar=1 and fps=30; concat; composite c1..c6 with overlay using -map 0:a so the audio survives; -pix_fmt yuv420p -movflags +faststart.

Then ffprobe the result and confirm BOTH a video and an audio stream exist. Report the segment table you chose with the measured mean volumes. Use exec for everything.`;

export async function renderWithAgent(opts: {
  client?: TrueForgeClient;
  agentName?: string;
  mediaDirs?: readonly string[];
}): Promise<{ sessionId: string; sandboxDir: string; staged: number; finalText: string }> {
  const client = opts.client ?? new TrueForgeClient();
  const agents = await client.listAgents();
  const name = opts.agentName ?? "postforge-director";
  const agent = agents.find((a) => a.name === name);
  if (!agent) throw new Error(`TrueForge agent not found: ${name}`);

  const session = await client.createSession(agent.id);

  // Prime the sandbox — it is created lazily on first exec.
  await runTurnWithApprovals({
    client,
    sessionId: session.id,
    message: "Use exec to run: pwd && mkdir -p media && echo primed",
    policy: allowAll(),
  });

  const sandboxDir = await sandboxDirFor(session.id);
  if (!sandboxDir) throw new Error(`No sandbox was provisioned for session ${session.id}`);

  const staged = await stageMedia(sandboxDir, opts.mediaDirs ?? ["inputs", "cards"]);
  if (staged === 0) throw new Error("Nothing staged — check the media directories exist");

  const result = await runTurnWithApprovals({
    client,
    sessionId: session.id,
    message: RENDER_BRIEF,
    policy: allowAll(),
    onEvent: (e) => {
      const type = (e as { type?: string })?.type;
      if (type && type !== "model.message.delta") process.stdout.write(`${type}\n`);
    },
  });

  return { sessionId: session.id, sandboxDir, staged, finalText: result.finalText };
}
