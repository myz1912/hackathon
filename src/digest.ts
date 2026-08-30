import { createHash } from "node:crypto";
import type { ProposedAction } from "./approval.js";
import type { EditPlan } from "./contracts.js";

function canonicalValue(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Cannot canonicalize a non-finite number");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value !== "object") throw new TypeError(`Cannot canonicalize ${typeof value}`);
  if (ancestors.has(value)) throw new TypeError("Cannot canonicalize a cyclic value");

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => canonicalValue(item, ancestors)).join(",")}]`;
    }
    const record = value as Record<string, unknown>;
    const fields = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalValue(record[key], ancestors)}`);
    return `{${fields.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalize(value: unknown): string {
  return canonicalValue(value, new Set());
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function planDigest(plan: EditPlan): string {
  return sha256(plan);
}

export function actionDigest(action: ProposedAction): string {
  return sha256({
    tool: action.tool,
    argv: action.argv,
    touches: action.touches,
    planDigest: action.planDigest,
  });
}
