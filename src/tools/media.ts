import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { MediaProbeSchema, type MediaProbe } from "../contracts.js";
import { MEDIA_ROOT, resolveWithinRoot } from "../safepath.js";

interface FfprobePayload {
  readonly streams?: readonly unknown[];
  readonly format?: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

const fixturePath = fileURLToPath(new URL("../../fixtures/media.json", import.meta.url));

async function fixtureProbe(path: string): Promise<MediaProbe> {
  const payload: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  if (!isRecord(payload) || !Array.isArray(payload.probes)) {
    throw new Error("Media fixture is malformed");
  }
  for (const candidate of payload.probes) {
    const parsed = MediaProbeSchema.safeParse(candidate);
    if (parsed.success && resolveWithinRoot(MEDIA_ROOT, parsed.data.path) === path) {
      return { ...parsed.data, path };
    }
  }
  throw new Error(`Media file is absent and no fixture probe exists for ${path}`);
}

async function runFfprobe(path: string, timeoutMs: number): Promise<string> {
  const argv = [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,width,height,duration",
    "-of",
    "json",
    path,
  ];
  return await new Promise<string>((resolve, reject) => {
    const child = spawn("ffprobe", argv, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Could not start ffprobe: ${error.message}`));
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`ffprobe timed out after ${timeoutMs}ms`));
      } else if (code !== 0) {
        reject(new Error(`ffprobe exited ${String(code)}: ${stderr.trim() || "no error output"}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  const resolvedPath = resolveWithinRoot(MEDIA_ROOT, path);
  if (!(await fileExists(resolvedPath))) return await fixtureProbe(resolvedPath);

  const raw = await runFfprobe(resolvedPath, 10_000);
  const payload: unknown = JSON.parse(raw);
  if (!isRecord(payload)) throw new Error("ffprobe returned an invalid payload");
  const typedPayload = payload as FfprobePayload;
  const streams = Array.isArray(typedPayload.streams) ? typedPayload.streams.filter(isRecord) : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const hasAudio = streams.some((stream) => stream.codec_type === "audio");
  if (!video) throw new Error(`ffprobe found no video stream in ${resolvedPath}`);

  const durationSec =
    asPositiveNumber(typedPayload.format?.duration) ??
    asPositiveNumber(video.duration) ??
    (() => {
      throw new Error(`ffprobe found no positive duration in ${resolvedPath}`);
    })();
  return MediaProbeSchema.parse({
    path: resolvedPath,
    durationSec,
    width: asPositiveNumber(video.width),
    height: asPositiveNumber(video.height),
    hasAudio,
  });
}
