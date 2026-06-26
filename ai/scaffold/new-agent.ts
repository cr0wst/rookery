/**
 * npm run new-agent <name>
 *
 * Scaffolds a new agent desk from templates:
 *   ai/agents/<name>/agent.yaml   — machine config (model ids, schedule, tools)
 *   ai/agents/<name>/prompt.md    — the agent's persona prompt
 *   ai/agents/<name>/memory.yaml  — empty working memory
 *   authors/<name>/config.yaml    — minimal Dispatch contributor profile
 *
 * Refuses (non-zero exit) if ai/agents/<name>/ already exists.
 * Substitutes {{ID}} and {{NAME}} in every template.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a kebab-case slug to a Title Cased display name. */
function toDisplayName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Substitute {{ID}} and {{NAME}} placeholders in a template string. */
function render(template: string, id: string, name: string): string {
  return template.replaceAll("{{ID}}", id).replaceAll("{{NAME}}", name);
}

/** Return true if the path exists (file or directory). */
async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(thisFile), "..", "..");
const templatesDir = join(dirname(thisFile), "templates");

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run new-agent <name>");
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    console.error(`Error: agent name must be lowercase kebab-case (got: "${id}")`);
    process.exit(1);
  }

  const agentDir = join(repoRoot, "ai", "agents", id);
  if (await exists(agentDir)) {
    console.error(`Error: ai/agents/${id}/ already exists — aborting.`);
    process.exit(1);
  }

  const name = toDisplayName(id);

  // Read templates
  const [agentYamlTpl, promptTpl] = await Promise.all([
    readFile(join(templatesDir, "agent.yaml"), "utf8"),
    readFile(join(templatesDir, "prompt.md"), "utf8"),
  ]);

  // Render templates
  const agentYaml = render(agentYamlTpl, id, name);
  const prompt = render(promptTpl, id, name);

  // Empty memory (full shape so runner never errors on missing fields)
  const memoryYaml =
    `# ${name} — working memory.\n` +
    `covered: []\n` +
    `ideas: []\n` +
    `likes: []\n` +
    `dislikes: []\n` +
    `notes: ""\n`;

  // Minimal author contributor profile
  const authorConfig =
    `name: ${name}\n` +
    `kind: agent\n` +
    `model: Claude Sonnet\n` +
    `modelId: claude-sonnet-4-6\n` +
    `agentOwner: Steve Crow\n` +
    `agentOwnerGitlab: cr0wst\n` +
    `beat: "<!-- TODO: describe this desk's beat -->"\n`;

  // Write files
  await mkdir(agentDir, { recursive: true });
  await writeFile(join(agentDir, "agent.yaml"), agentYaml, "utf8");
  await writeFile(join(agentDir, "prompt.md"), prompt, "utf8");
  await writeFile(join(agentDir, "memory.yaml"), memoryYaml, "utf8");

  const authorDir = join(repoRoot, "authors", id);
  await mkdir(authorDir, { recursive: true });
  await writeFile(join(authorDir, "config.yaml"), authorConfig, "utf8");

  console.log(`✓ Created ai/agents/${id}/`);
  console.log(`  - agent.yaml`);
  console.log(`  - prompt.md`);
  console.log(`  - memory.yaml`);
  console.log(`✓ Created authors/${id}/config.yaml`);
  console.log(`\nNext: edit ai/agents/${id}/prompt.md with the agent's persona,`);
  console.log(`      then run: npm run agent ${id} -- --dry-run`);
}

await main();
