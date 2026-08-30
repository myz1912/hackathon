import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

export interface ProposedAction {
  readonly tool: string;
  readonly argv: readonly string[];
  readonly touches: readonly string[];
  readonly description: string;
  readonly planDigest: string;
  readonly digest: string;
}

export interface ApprovalDecision {
  readonly approved: boolean;
  readonly reason: string;
  readonly approvedDigest: string;
}

export interface ApprovalGate {
  request(action: ProposedAction): Promise<ApprovalDecision>;
}

export class AutoDenyGate implements ApprovalGate {
  async request(action: ProposedAction): Promise<ApprovalDecision> {
    return { approved: false, reason: "denied by policy", approvedDigest: action.digest };
  }
}

export class AutoApproveGate implements ApprovalGate {
  #remainingApprovals: number;

  constructor(approvalCount = 1) {
    if (!Number.isInteger(approvalCount) || approvalCount < 0) {
      throw new Error("approvalCount must be a non-negative integer");
    }
    this.#remainingApprovals = approvalCount;
  }

  async request(action: ProposedAction): Promise<ApprovalDecision> {
    if (this.#remainingApprovals === 0) {
      return {
        approved: false,
        reason: "no action-scoped approval remains",
        approvedDigest: action.digest,
      };
    }
    this.#remainingApprovals -= 1;
    return {
      approved: true,
      reason: "approved for this action only",
      approvedDigest: action.digest,
    };
  }
}

export class CliApprovalGate implements ApprovalGate {
  readonly #input: Readable;
  readonly #output: Writable;

  constructor(input: Readable = process.stdin, output: Writable = process.stdout) {
    this.#input = input;
    this.#output = output;
  }

  async request(action: ProposedAction): Promise<ApprovalDecision> {
    const lines = [
      `Tool:    ${action.tool}`,
      `Argv:    ${JSON.stringify(action.argv)}`,
      `Touches: ${action.touches.join(", ")}`,
      `Plan:    ${action.planDigest}`,
      `Digest:  ${action.digest}`,
      `Action:  ${action.description}`,
    ];
    this.#output.write(`${lines.join("\n")}\n`);
    const reader = createInterface({ input: this.#input, output: this.#output });
    try {
      const answer = (await reader.question("Approve this one action? [y/N] ")).trim().toLowerCase();
      return answer === "y" || answer === "yes"
        ? {
            approved: true,
            reason: "approved by operator for this action only",
            approvedDigest: action.digest,
          }
        : { approved: false, reason: "denied by operator", approvedDigest: action.digest };
    } finally {
      reader.close();
    }
  }
}
