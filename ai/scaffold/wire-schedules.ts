/**
 * npm run wire
 *
 * Scans each agent directory under ai/agents/, loads agent.yaml, and
 * (re)generates .github/workflows/<id>.yml so each desk's schedule is
 * declared in its own agent.yaml and CI follows automatically.
 *
 * Also exports a pure `workflowYaml(config)` for tests.
 */

import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";
import { loadAgent, type AgentConfig } from "../shared/agent-config.js";

// ---------------------------------------------------------------------------
// Pure: build the GitHub Actions workflow YAML for one agent.
// ---------------------------------------------------------------------------

/**
 * Emit a GitHub Actions workflow for a single agent desk.
 *
 * The output is built as a template string (not serialised via a YAML library)
 * so the formatting is stable and predictable for tests and diffs.
 *
 * GitHub expression syntax `${{ ... }}` is kept literal inside the string.
 */
export function workflowYaml(config: AgentConfig): string {
  const id = config.id;
  const cron = config.schedule;
  return `name: ${id}
on:
  schedule:
    - cron: "${cron}"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm run agent ${id}
        env:
          CF_AIG_TOKEN: \${{ secrets.CF_AIG_TOKEN }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          AI_GATEWAY_ACCOUNT_ID: \${{ vars.AI_GATEWAY_ACCOUNT_ID }}
          AI_GATEWAY_ID: \${{ vars.AI_GATEWAY_ID }}
      - name: Commit & push
        run: |
          git config user.name "${id}"
          git config user.email "${id}@rookery.bot"
          git add -A
          git diff --cached --quiet || git commit -m "${id}: daily run"
          git push
`;
}

// ---------------------------------------------------------------------------
// main: scan all agents and write workflows.
// ---------------------------------------------------------------------------

export async function main(root = process.cwd()): Promise<void> {
  const agentsDir = join(root, "ai", "agents");
  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch {
    console.log("wire: no ai/agents/ directory found.");
    return;
  }

  // Filter to subdirectories that look like agent ids (skip .gitkeep etc.)
  const agentIds = entries.filter((e) => !e.startsWith("."));

  let count = 0;
  for (const entry of agentIds) {
    let config: AgentConfig;
    try {
      ({ config } = await loadAgent(entry, root));
    } catch {
      // Not a valid agent directory — skip silently.
      continue;
    }
    const yaml = workflowYaml(config);
    const outPath = join(root, ".github", "workflows", `${config.id}.yml`);
    await writeFile(outPath, yaml, "utf8");
    console.log(`wire: wrote ${outPath}`);
    count++;
  }

  if (count === 0) {
    console.log("wire: no agents found.");
  } else {
    console.log(`wire: wrote ${count} workflow(s).`);
  }
}

// ---------------------------------------------------------------------------
// Guard: run main only when this file is the entry point (not on import).
// ---------------------------------------------------------------------------

const thisFile = fileURLToPath(import.meta.url);
if (resolve(process.argv[1] ?? "") === thisFile) {
  await main();
}
