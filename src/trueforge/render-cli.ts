import { renderWithAgent } from "./render.js";

const dirs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
try {
  const r = await renderWithAgent(dirs.length > 0 ? { mediaDirs: dirs } : {});
  process.stdout.write(`\nsession   ${r.sessionId}\n`);
  process.stdout.write(`sandbox   ${r.sandboxDir}\n`);
  process.stdout.write(`staged    ${r.staged} files\n\n`);
  process.stdout.write(`${r.finalText}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
