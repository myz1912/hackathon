import { join } from "node:path";
import { resolveWithinRoot } from "../safepath.js";

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function assertSafeId(id: string): string {
  if (!SAFE_ID.test(id)) throw new TypeError(`Unsafe identifier: ${JSON.stringify(id)}`);
  return id;
}

export function resolveWithin(root: string, ...parts: string[]): string {
  return resolveWithinRoot(root, join(...parts), { strict: true });
}

export function sessionArtifactPath(root: string, prefix: string, sessionId: string): string {
  return resolveWithin(root, `${prefix}${assertSafeId(sessionId)}.json`);
}
