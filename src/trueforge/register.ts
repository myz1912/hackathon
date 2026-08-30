import { pathToFileURL } from "node:url";
import { TrueForgeClient, TrueForgeError, type ModelProvider, type TrueForgeAgent } from "./client.js";

// The fully-configured agent: 5 Git-backed skills, the brightdata MCP server, sandbox on.
// An earlier revision used "postforge", which silently created a SECOND bare agent with no
// skills, no tools and sandbox disabled — sessions then ran against that one and the agent
// truthfully reported having no exec tool. Verified by the turn's token breakdown:
// configured runs show tool_definitions 271 / instructions 372; the bare one showed 0 / 32.
export const POSTFORGE_AGENT_NAME = "postforge-director";

function modelNameFrom(provider: ModelProvider): string | undefined {
  const model = provider.manifest.models[0];
  return model ? `${provider.name}/${model.name}` : undefined;
}

export async function ensurePostForgeAgent(
  client: TrueForgeClient,
  provider: ModelProvider,
): Promise<{ agent: TrueForgeAgent; created: boolean }> {
  const existing = (await client.listAgents()).find((agent) => agent.name === POSTFORGE_AGENT_NAME);
  if (existing) return { agent: existing, created: false };
  const modelName = modelNameFrom(provider);
  if (!modelName) throw new Error(`Configured model provider '${provider.name}' has no models`);
  const agent = await client.createAgent({
    name: POSTFORGE_AGENT_NAME,
    manifest: {
      model: { name: modelName },
      instructions:
        "You are PostForge. Turn owned-media briefs into source-cited edit guidance. Never post or upload; external_action remains false.",
      config: { sandbox: { enabled: false } },
    },
  });
  return { agent, created: true };
}

export async function registerPostForge(client = new TrueForgeClient()): Promise<TrueForgeAgent | undefined> {
  const providers = await client.listModelProviders();
  const provider = providers.find((candidate) => candidate.manifest.models.length > 0);
  if (!provider) {
    process.stderr.write("No TrueForge model provider is configured.\n");
    process.stderr.write(
      "Remediation: configure one in TrueForge Settings > Model Providers, then rerun npm run tf:register.\n",
    );
    process.exitCode = 1;
    return undefined;
  }
  const { agent } = await ensurePostForgeAgent(client, provider);
  process.stdout.write(`${agent.id}\n`);
  return agent;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  try {
    await registerPostForge();
  } catch (error) {
    process.stderr.write("state: error\n");
    process.stderr.write(
      `${error instanceof TrueForgeError || error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
