import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

export interface ProposedAction {
  readonly tool: string;
  readonly argv: readonly string[];
  readonly touches: readonly string[];
  readonly description: string;
}

export interface ApprovalDecision {
  readonly approved: boolean;
  readonly reason: string;
}

export interface ApprovalGate {
  request(action: ProposedAction): Promise<ApprovalDecision>;
}

export class AutoDenyGate implements ApprovalGate {
  async request(_action: ProposedAction): Promise<ApprovalDecision> {
    return { approved: false, reason: "denied by policy" };
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

  async request(_action: ProposedAction): Promise<ApprovalDecision> {
    if (this.#remainingApprovals === 0) {
      return { approved: false, reason: "no action-scoped approval remains" };
    }
    this.#remainingApprovals -= 1;
    return { approved: true, reason: "approved for this action only" };
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
      `Action:  ${action.description}`,
    ];
    this.#output.write(`${lines.join("\n")}\n`);
    const reader = createInterface({ input: this.#input, output: this.#output });
    try {
      const answer = (await reader.question("Approve this one action? [y/N] ")).trim().toLowerCase();
      return answer === "y" || answer === "yes"
        ? { approved: true, reason: "approved by operator for this action only" }
        : { approved: false, reason: "denied by operator" };
    } finally {
      reader.close();
    }
  }
}
