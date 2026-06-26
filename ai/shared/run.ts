/**
 * CLI entry point: npm run agent <id> [-- --dry-run]
 *
 * Reads environment variables for the AI Gateway, resolves the repo root from
 * process.cwd() (callers run from the repo root via package.json scripts), then
 * delegates to runAgent and logs the result.
 */

import { runAgent } from "./runner.js";
import type { GatewayEnv } from "./models.js";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("-"));
const dryRun = args.includes("--dry-run");

if (!id) {
  console.error("Usage: npm run agent <id> [-- --dry-run]");
  process.exit(1);
}

const env: GatewayEnv = {
  AI_GATEWAY_ACCOUNT_ID: process.env.AI_GATEWAY_ACCOUNT_ID ?? "",
  AI_GATEWAY_ID: process.env.AI_GATEWAY_ID ?? "",
  CF_AIG_TOKEN: process.env.CF_AIG_TOKEN,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

// Repo root = the working directory (package.json scripts run from here).
const root = process.cwd();

try {
  const result = await runAgent({ id, root, env, dryRun, now: new Date() });
  if (result.filed) {
    console.log(`[${id}] filed: ${result.title}`);
    if (result.path) console.log(`[${id}] path:  ${result.path}`);
    if (result.cost != null) console.log(`[${id}] cost:  $${result.cost.usd.toFixed(6)}`);
  } else {
    console.log(`[${id}] stood down — nothing filed today.`);
  }
  process.exit(0);
} catch (err) {
  console.error(`[${id}] error:`, err);
  process.exit(1);
}
