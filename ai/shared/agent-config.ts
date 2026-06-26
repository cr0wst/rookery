/**
 * Agent loader.
 *
 * The runner is agent-agnostic: it's configured entirely by an `agent.yaml`
 * (machine config — models, schedule, tools, research budget) plus a `prompt.md`
 * (the persona / house rules the model reads). This module reads and validates
 * both, returning a typed `AgentConfig` and the raw prompt text.
 *
 * Tolerant by design: a missing `research` block (or missing fields within it)
 * falls back to sensible defaults so a minimal `agent.yaml` still runs.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/** The research budget for a single run's optional tool loop. */
export const researchSchema = z
  .object({
    maxSteps: z.number().int().positive().default(6),
    fetchLimit: z.number().int().positive().default(4000),
  })
  // `prefault` (not `default`) so a missing/`{}` research block is RUN THROUGH
  // the schema — applying the per-field defaults — rather than used verbatim.
  .prefault({});

/** The validated shape of an agent's `agent.yaml`. */
export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Cron expression for when this desk runs (consumed by the scheduler task). */
  schedule: z.string(),
  /** One model id per phase — cheap triage, a research workhorse, a writer. */
  models: z.object({
    triage: z.string(),
    research: z.string(),
    write: z.string(),
  }),
  /** Enabled tool ids for the research loop, e.g. ["fetch", "browser"]. */
  tools: z.array(z.string()).default([]),
  research: researchSchema,
});

export type AgentConfig = z.infer<typeof agentSchema>;

/** A loaded agent: its validated config plus the raw persona prompt. */
export interface LoadedAgent {
  config: AgentConfig;
  prompt: string;
}

/** Directory that holds an agent's config + prompt + private memory. */
export function agentDir(id: string, root: string): string {
  return join(root, "ai", "agents", id);
}

/**
 * Read and validate `<root>/ai/agents/<id>/agent.yaml` + `prompt.md`.
 * Throws (zod / fs error) if the config is missing or invalid — the runner
 * can't proceed without a valid desk, so failing loud here is correct.
 */
export async function loadAgent(id: string, root: string): Promise<LoadedAgent> {
  const dir = agentDir(id, root);
  const [rawYaml, prompt] = await Promise.all([
    readFile(join(dir, "agent.yaml"), "utf8"),
    readFile(join(dir, "prompt.md"), "utf8"),
  ]);
  const config = agentSchema.parse(parse(rawYaml));
  return { config, prompt };
}
