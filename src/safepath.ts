import { realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export class PathEscapeError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Path escapes the configured media root: ${path}`);
    this.name = "PathEscapeError";
    this.path = path;
  }
}

export const MEDIA_ROOT =
  process.env.POSTFORGE_MEDIA_ROOT ?? fileURLToPath(new URL("../fixtures", import.meta.url));

const realRoots = new Map<string, string>();

function resolveRoot(root: string): string {
  const absoluteRoot = resolve(root);
  const cached = realRoots.get(absoluteRoot);
  if (cached) return cached;
  const realRoot = realpathSync(absoluteRoot);
  realRoots.set(absoluteRoot, realRoot);
  return realRoot;
}

function resolveExistingAncestor(candidate: string, offendingPath: string): string {
  let current = candidate;
  const missingParts: string[] = [];

  for (;;) {
    try {
      return resolve(realpathSync(current), ...missingParts);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw new PathEscapeError(offendingPath);
      const parent = dirname(current);
      if (parent === current) throw new PathEscapeError(offendingPath);
      missingParts.unshift(basename(current));
      current = parent;
    }
  }
}

export function resolveWithinRoot(
  root: string,
  candidate: string,
  options: { readonly strict?: boolean } = {},
): string {
  if (candidate.split(sep).includes("..")) throw new PathEscapeError(candidate);

  const realRoot = resolveRoot(root);
  const absoluteCandidate = isAbsolute(candidate) ? resolve(candidate) : resolve(realRoot, candidate);
  const realCandidate = resolveExistingAncestor(absoluteCandidate, candidate);
  if (
    (options.strict && realCandidate === realRoot) ||
    (realCandidate !== realRoot && !realCandidate.startsWith(`${realRoot}${sep}`))
  ) {
    throw new PathEscapeError(candidate);
  }
  return realCandidate;
}
