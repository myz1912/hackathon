import { BrightDataCli, hasStoredLogin, ResearchToolError } from "./tools/brightdata.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  process.stderr.write('Usage: npm run research:live -- "<query>"\n');
  process.exitCode = 1;
} else if (!process.env.BRIGHT_DATA_API_TOKEN && !process.env.BRIGHTDATA_API_KEY && !hasStoredLogin()) {
  process.stderr.write("state: fallback\n");
  process.stderr.write("Missing BRIGHT_DATA_API_TOKEN (or BRIGHTDATA_API_KEY).\n");
  process.exitCode = 1;
} else {
  const tool = new BrightDataCli();
  try {
    const { report, receiptPath } = await tool.searchWithReceipt(query, 10);
    process.stdout.write("state: live\n");
    process.stdout.write(`receipt: ${receiptPath}\n`);
    console.table(
      report.findings.map((finding) => ({
        publisher: finding.publisher,
        title: finding.title.slice(0, 60),
        url: finding.url,
      })),
    );
  } catch (error) {
    process.stderr.write("state: error\n");
    if (error instanceof ResearchToolError) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
      if (error.receiptPath) process.stderr.write(`receipt: ${error.receiptPath}\n`);
    } else {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    }
    process.exitCode = 1;
  }
}
