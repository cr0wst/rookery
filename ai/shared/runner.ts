/**
 * The daily loop every desk runs.
 *
 * One generic, agent-agnostic pipeline configured by an `agent.yaml`:
 *
 *   gather → triage → (research) → write → drip → publish → remember
 *
 *   - gather:   recent blog + shared memo board + this desk's private memory
 *   - triage:   a cheap call — is there anything worth a deep-dive, and what's
 *               the angle? If not, the desk stands down and writes NOTHING.
 *   - research: an optional tool loop (fetch / browser), capped at maxSteps.
 *   - write:    the post — title, summary, body, slug.
 *   - drip:     stamp the post a future date (one day past the latest queued
 *               post) so the blog releases on a steady cadence, not all at once.
 *   - publish:  write the markdown to disk (skipped on dryRun).
 *   - remember: record the covered topic in private memory (skipped on dryRun).
 *
 * The four model-touching phases (triage/research/write) and `publish` are
 * injected via `deps` so tests run the whole orchestration with fakes — no
 * network, no creds. The defaults wire real Vercel-AI-SDK calls through the
 * Cloudflare AI Gateway.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  generateText,
  jsonSchema,
  stepCountIs,
  tool,
  Output,
  type LanguageModelUsage,
  type SystemModelMessage,
  type ToolSet,
} from "ai";

import { loadAgent, type AgentConfig } from "./agent-config";
import { recentPosts, buildBlogContext, type BlogPost } from "./blog";
import {
  readBoard,
  readMemory,
  writeMemory,
  type BoardNote,
  type Memory,
} from "./memory";
import { buildPost, postPath, slugify, zonedDay, DEFAULT_TZ } from "./format";
import { computeCost, type Cost, type Usage } from "./cost";
import { model, cacheControl, type GatewayEnv } from "./models";
import { fetchUrlText } from "../tools/fetch";
import { browserRead } from "../tools/browser";

// ---------------------------------------------------------------------------
// nextDripDate — PURE. The cadence rule, isolated for tests.
// ---------------------------------------------------------------------------

/**
 * The date to stamp the next post: one day after the LATEST of (the newest
 * already-queued future post, `now`), pinned to `hour:00:00.000` UTC. With an
 * empty queue this is simply "tomorrow at `hour`"; with a backlog it appends to
 * the end of the queue so posts release one per day.
 */
export function nextDripDate(futureDates: Date[], now: Date, hour = 13): Date {
  const latest = futureDates.reduce((max, d) => (d > max ? d : max), now);
  const next = new Date(latest.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(hour, 0, 0, 0);
  return next;
}

// ---------------------------------------------------------------------------
// Types: the run context and the injectable deps.
// ---------------------------------------------------------------------------

/** Everything a phase needs, gathered once at the top of a run. */
export interface RunContext {
  id: string;
  root: string;
  env: GatewayEnv;
  now: Date;
  config: AgentConfig;
  prompt: string;
  /** Tier-weighted summary of recent posts (may be ""). */
  blogContext: string;
  posts: BlogPost[];
  board: BoardNote[];
  memory: Memory;
}

/** Triage verdict: should the desk write today, and on what angle? */
export interface TriageResult {
  write: boolean;
  angle?: string;
  usages?: Usage[];
}

/** Research output: free-text notes the writer can lean on, plus token usage. */
export interface ResearchResult {
  notes: string;
  usages: Usage[];
}

/** A finished draft, pre-frontmatter. */
export interface WriteResult {
  title: string;
  summary: string;
  body: string;
  slug: string;
  tags?: string[];
  usages: Usage[];
}

/** The four seams tests can replace. All optional in opts; real by default. */
export interface RunnerDeps {
  triage(ctx: RunContext): Promise<TriageResult>;
  research(ctx: RunContext, angle: string): Promise<ResearchResult>;
  write(ctx: RunContext, angle: string, research: ResearchResult): Promise<WriteResult>;
  /** Persist the finished post. `path` is an absolute filesystem path. */
  publish(path: string, markdown: string): Promise<void>;
}

export interface RunOptions {
  id: string;
  root: string;
  env: GatewayEnv;
  /** When true: run everything EXCEPT publish + remember (no side effects). */
  dryRun?: boolean;
  now?: Date;
  deps?: Partial<RunnerDeps>;
}

export interface RunResult {
  filed: boolean;
  title?: string;
  /** Repo-relative path of the published post (omitted on stand-down). */
  path?: string;
  cost?: Cost;
}

// ---------------------------------------------------------------------------
// runAgent — the orchestration.
// ---------------------------------------------------------------------------

export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const dryRun = opts.dryRun ?? false;
  const deps: RunnerDeps = { ...defaultDeps(), ...opts.deps };

  // --- Gather ---------------------------------------------------------------
  const { config, prompt } = await loadAgent(opts.id, opts.root);
  const posts = await recentPosts(opts.root);
  const blogContext = buildBlogContext(posts);
  const board = await readBoard(join(opts.root, "ai", "shared", "memo-board.yaml"));
  const memoryPath = join(opts.root, "ai", "agents", opts.id, "memory.yaml");
  const memory = await readMemory(memoryPath);

  const ctx: RunContext = {
    id: opts.id,
    root: opts.root,
    env: opts.env,
    now,
    config,
    prompt,
    blogContext,
    posts,
    board,
    memory,
  };

  // --- Triage ---------------------------------------------------------------
  const triage = await deps.triage(ctx);
  if (!triage.write) {
    console.log(`[${config.id}] stand-down: nothing worth a deep-dive today.`);
    return { filed: false };
  }
  const angle = triage.angle ?? "";

  // --- Research (optional: only when this desk has tools) --------------------
  let research: ResearchResult = { notes: "", usages: [] };
  if (config.tools.length > 0) {
    research = await deps.research(ctx, angle);
  }

  // --- Write ----------------------------------------------------------------
  const draft = await deps.write(ctx, angle, research);

  // --- Drip: stamp a future date past the desk's own queued backlog ---------
  const futureDates = await futurePostDates(opts.root, opts.id, now);
  const dripDate = nextDripDate(futureDates, now);

  const usages: Usage[] = [
    ...(triage.usages ?? []),
    ...research.usages,
    ...draft.usages,
  ];
  const cost = computeCost(usages);

  const relPath = postPath(opts.id, dripDate, draft.slug, DEFAULT_TZ);
  const markdown = buildPost({
    author: opts.id,
    title: draft.title,
    date: dripDate,
    tags: draft.tags ?? [],
    summary: draft.summary,
    body: draft.body,
    cost,
  });

  // --- Publish (side effect — skipped entirely on dryRun) -------------------
  if (!dryRun) {
    await deps.publish(join(opts.root, relPath), markdown);
  }

  // --- Remember (side effect — skipped entirely on dryRun) ------------------
  if (!dryRun) {
    const updated: Memory = {
      ...memory,
      covered: [
        ...memory.covered,
        {
          date: zonedDay(dripDate, DEFAULT_TZ),
          slug: slugify(draft.slug),
          topic: angle || draft.title,
        },
      ],
    };
    await writeMemory(memoryPath, updated, config.name);
  }

  return { filed: true, title: draft.title, path: relPath, cost };
}

/**
 * Dates of the desk's own posts stamped in the future (date > now) — the drip
 * queue. Reads `authors/<id>/posts/*.md` frontmatter; fail-open ([] on any
 * missing dir / unparseable file).
 */
async function futurePostDates(root: string, id: string, now: Date): Promise<Date[]> {
  const dir = join(root, "authors", id, "posts");
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const dates: Date[] = [];
  for (const file of names) {
    if (!file.endsWith(".md") || file.endsWith(".erin.md")) continue;
    let text: string;
    try {
      text = await readFile(join(dir, file), "utf8");
    } catch {
      continue;
    }
    const fm = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const dm = fm[1].match(/^date:\s*(.+)$/m);
    if (!dm) continue;
    const d = new Date(dm[1].trim());
    if (!Number.isNaN(d.getTime()) && d > now) dates.push(d);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Default deps: real model calls via the AI SDK through the AI Gateway.
//
// Prompt caching: the big STATIC prefix (persona prompt + memory digest) is
// passed as a `system` SystemModelMessage carrying `providerOptions:
// cacheControl` (`{ anthropic: { cacheControl: { type: "ephemeral" } } }`),
// so Anthropic caches it across the three same-run phases and across runs
// within the TTL. The DYNAMIC, per-run context (blog digest, memo board, the
// angle, research notes) goes in the `prompt` (user) message so it never
// pollutes the cached prefix.
//
// Tool loop (research): `generateText({ tools, stopWhen: stepCountIs(maxSteps) })`
// runs the model → tool → model loop until it stops calling tools or hits the
// step cap. Each `tool({ inputSchema: jsonSchema(...), execute })` is a real fn.
//
// Confirmed against ai@6.0.211 / @ai-sdk/anthropic@3.0.87 by inspecting the
// installed d.ts: `system` accepts `string | SystemModelMessage | ...`;
// SystemModelMessage has `providerOptions`; `stopWhen` defaults to
// stepCountIs(1); `Output.object({ schema })` yields `result.output` typed.
// NOTE: structured `Output.object` + tool-loop wiring is exercised only on a
// live run (tests inject fakes) — see the task report's "concerns".
// ---------------------------------------------------------------------------

function defaultDeps(): RunnerDeps {
  return { triage, research, write, publish };
}

/** Cached static prefix: persona + a digest of this desk's private memory. */
function systemPrefix(ctx: RunContext): SystemModelMessage {
  const content = [ctx.prompt, memoryDigest(ctx.memory)].filter(Boolean).join("\n\n---\n\n");
  return { role: "system", content, providerOptions: cacheControl };
}

/** A compact, human-readable digest of working memory for the system prefix. */
function memoryDigest(m: Memory): string {
  const parts: string[] = [];
  if (m.notes) parts.push(`Working notes:\n${m.notes}`);
  if (m.covered.length) {
    const recent = m.covered.slice(-20).map((c) => `- ${c.date}: ${c.topic}`);
    parts.push(`Recently covered (do NOT repeat — build on or link instead):\n${recent.join("\n")}`);
  }
  if (m.ideas.length) parts.push(`Open ideas:\n${m.ideas.map((i) => `- ${i}`).join("\n")}`);
  if (m.likes.length) parts.push(`Likes: ${m.likes.join(", ")}`);
  if (m.dislikes.length) parts.push(`Dislikes: ${m.dislikes.join(", ")}`);
  return parts.length ? `## Your working memory\n\n${parts.join("\n\n")}` : "";
}

/** The dynamic, per-run context block (NOT cached) shared by every phase. */
function dynamicContext(ctx: RunContext): string {
  const parts: string[] = [];
  if (ctx.blogContext) parts.push(`## Recently on the blog\n\n${ctx.blogContext}`);
  if (ctx.board.length) {
    const notes = ctx.board.map((n) => `- (${n.by}) ${n.text}`).join("\n");
    parts.push(`## Shared memo board — leads & notes\n\n${notes}`);
  }
  return parts.join("\n\n");
}

/** LanguageModelUsage → a `Usage` tagged with the model id the runner knows. */
function toUsages(modelId: string, usage: LanguageModelUsage): Usage[] {
  return [
    {
      model: modelId,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
  ];
}

const triageOutput = Output.object({
  schema: jsonSchema<{ write: boolean; angle?: string }>({
    type: "object",
    properties: {
      write: {
        type: "boolean",
        description: "True only if there's something genuinely worth a deep-dive post today.",
      },
      angle: {
        type: "string",
        description: "If write is true, the specific angle / thesis to pursue (one sentence).",
      },
    },
    required: ["write"],
    additionalProperties: false,
  }),
});

async function triage(ctx: RunContext): Promise<TriageResult> {
  const result = await generateText({
    model: model(ctx.config.models.triage, ctx.env),
    system: systemPrefix(ctx),
    prompt:
      `${dynamicContext(ctx)}\n\n` +
      "## Today's triage\n\n" +
      "Decide whether there's something worth a deep-dive post today. A quiet day " +
      "is a fine day — stand down (write: false) unless you have a real angle. " +
      "But a direct lead or request from Steve (the human, byline cr0wst) on the " +
      "memo board IS a real angle: take it and run. If you write, set write: true " +
      "and give the angle.",
    output: triageOutput,
  });
  const out = result.output;
  return {
    write: Boolean(out.write),
    angle: out.angle,
    usages: toUsages(ctx.config.models.triage, result.totalUsage),
  };
}

/** Build the enabled research tools for this desk from its `tools` list. */
function researchTools(ctx: RunContext): ToolSet {
  const tools: ToolSet = {};
  for (const name of ctx.config.tools) {
    if (name === "fetch") {
      tools.fetch = tool({
        description: "Fetch the text body of an https:// URL (truncated). Use for primary sources.",
        inputSchema: jsonSchema<{ url: string }>({
          type: "object",
          properties: { url: { type: "string", description: "An https:// URL." } },
          required: ["url"],
          additionalProperties: false,
        }),
        execute: async ({ url }) => fetchUrlText(url, ctx.config.research.fetchLimit),
      });
    } else if (name === "browser") {
      tools.browser = tool({
        description: "Read a web page as clean markdown via a headless browser (handles JS-heavy pages).",
        inputSchema: jsonSchema<{ url: string }>({
          type: "object",
          properties: { url: { type: "string", description: "An https:// URL." } },
          required: ["url"],
          additionalProperties: false,
        }),
        execute: async ({ url }) => browserRead(url),
      });
    }
  }
  return tools;
}

async function research(ctx: RunContext, angle: string): Promise<ResearchResult> {
  const tools = researchTools(ctx);
  if (Object.keys(tools).length === 0) return { notes: "", usages: [] };
  const result = await generateText({
    model: model(ctx.config.models.research, ctx.env),
    system: systemPrefix(ctx),
    prompt:
      `${dynamicContext(ctx)}\n\n` +
      `## Research the angle\n\n${angle}\n\n` +
      "Use your tools to gather primary sources and concrete detail. When you " +
      "have enough, stop and write up tight notes (facts, quotes, links) the " +
      "writer can lean on — not prose.",
    tools,
    stopWhen: stepCountIs(ctx.config.research.maxSteps),
  });
  return {
    notes: result.text,
    usages: toUsages(ctx.config.models.research, result.totalUsage),
  };
}

const writeOutput = Output.object({
  schema: jsonSchema<{ title: string; summary: string; body: string; slug: string; tags?: string[] }>({
    type: "object",
    properties: {
      title: { type: "string" },
      summary: { type: "string", description: "One- or two-sentence dek for the frontmatter." },
      body: { type: "string", description: "The post body in Markdown. No frontmatter." },
      slug: { type: "string", description: "A short url slug (kebab-case)." },
      tags: { type: "array", items: { type: "string" }, description: "Topical tags (the author tag is added automatically)." },
    },
    required: ["title", "summary", "body", "slug"],
    additionalProperties: false,
  }),
});

async function write(ctx: RunContext, angle: string, research: ResearchResult): Promise<WriteResult> {
  const researchBlock = research.notes ? `## Research notes\n\n${research.notes}\n\n` : "";
  const result = await generateText({
    model: model(ctx.config.models.write, ctx.env),
    system: systemPrefix(ctx),
    prompt:
      `${dynamicContext(ctx)}\n\n` +
      `${researchBlock}` +
      `## Write the post\n\nAngle: ${angle}\n\n` +
      "Write the post in your voice. Return title, summary, body (Markdown, no " +
      "frontmatter), a kebab-case slug, and a few tags.",
    output: writeOutput,
  });
  const out = result.output;
  return {
    title: out.title,
    summary: out.summary,
    body: out.body,
    slug: out.slug,
    tags: out.tags,
    usages: toUsages(ctx.config.models.write, result.totalUsage),
  };
}

/** Default publish: write the markdown to disk, creating the posts dir. */
async function publish(path: string, markdown: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, markdown);
}
