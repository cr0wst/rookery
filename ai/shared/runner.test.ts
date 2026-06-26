import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nextDripDate, runAgent, type RunnerDeps } from "./runner";
import { loadAgent } from "./agent-config";

// ---------------------------------------------------------------------------
// Self-contained fixture: a temp `root` with a minimal `test-desk` agent and a
// couple of existing posts. NO real agent, NO network — the model-touching
// phases are injected as fakes in every test.
// ---------------------------------------------------------------------------

const ENV = { AI_GATEWAY_ACCOUNT_ID: "a", AI_GATEWAY_ID: "g", CF_AIG_TOKEN: "t" };

/** A typed publish spy so `.mock.calls[0]` carries `[path, markdown]`. */
const publishSpy = () => vi.fn<(path: string, markdown: string) => Promise<void>>(async () => {});

const AGENT_YAML = `id: test-desk
name: Test Desk
schedule: "0 13 * * *"
models:
  triage: claude-haiku-4-5
  research: claude-sonnet-4-6
  write: claude-opus-4-8
tools:
  - fetch
`;

const PROMPT_MD = "# Test Desk\n\nYou are a test desk. Write plainly.\n";

let root: string;

async function writeFixture(path: string, content: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "rookery-runner-"));
  // Agent config + prompt.
  await mkdir(join(root, "ai", "agents", "test-desk"), { recursive: true });
  await writeFile(join(root, "ai", "agents", "test-desk", "agent.yaml"), AGENT_YAML);
  await writeFile(join(root, "ai", "agents", "test-desk", "prompt.md"), PROMPT_MD);
  // A couple of existing posts (one published in the past) so recentPosts/drip
  // have something to read.
  await writeFixture(
    join(root, "authors", "test-desk", "posts", "2026-06-20T1300-test-desk-hello.md"),
    "---\ntitle: \"Hello\"\ndate: 2026-06-20T13:00:00-04:00\nauthor: \"test-desk\"\ntags: [\"test-desk\"]\nsummary: \"A past post.\"\n---\nbody\n",
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// agent-config loader.
// ---------------------------------------------------------------------------

describe("loadAgent", () => {
  it("parses agent.yaml + prompt.md and applies research defaults", async () => {
    const { config, prompt } = await loadAgent("test-desk", root);
    expect(config.id).toBe("test-desk");
    expect(config.name).toBe("Test Desk");
    expect(config.schedule).toBe("0 13 * * *");
    expect(config.models.triage).toBe("claude-haiku-4-5");
    expect(config.tools).toEqual(["fetch"]);
    // No `research:` block in the yaml → defaults.
    expect(config.research).toEqual({ maxSteps: 6, fetchLimit: 4000 });
    expect(prompt).toContain("Test Desk");
  });

  it("throws on an invalid config (missing models)", async () => {
    const dir = join(root, "ai", "agents", "broken");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "agent.yaml"), "id: broken\nname: Broken\nschedule: x\n");
    await writeFile(join(dir, "prompt.md"), "x");
    await expect(loadAgent("broken", root)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// nextDripDate — PURE.
// ---------------------------------------------------------------------------

describe("nextDripDate", () => {
  it("appends one day after the latest queued future post at 13:00 UTC", () => {
    const out = nextDripDate(
      [new Date("2026-06-28T13:00:00Z")],
      new Date("2026-06-26T13:00:00Z"),
    );
    expect(out.toISOString()).toBe("2026-06-29T13:00:00.000Z");
  });

  it("with an empty queue, stamps tomorrow at 13:00 UTC", () => {
    const out = nextDripDate([], new Date("2026-06-26T09:30:00Z"));
    expect(out.toISOString()).toBe("2026-06-27T13:00:00.000Z");
  });

  it("ignores past dates and uses `now` as the floor", () => {
    const out = nextDripDate(
      [new Date("2026-01-01T00:00:00Z")],
      new Date("2026-06-26T18:00:00Z"),
    );
    expect(out.toISOString()).toBe("2026-06-27T13:00:00.000Z");
  });

  it("honors a custom hour", () => {
    const out = nextDripDate([], new Date("2026-06-26T09:30:00Z"), 9);
    expect(out.toISOString()).toBe("2026-06-27T09:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// runAgent — orchestration with injected fakes.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-06-26T13:00:00Z");

describe("runAgent — Test A: stand-down (triage write:false)", () => {
  it("writes nothing, never publishes, leaves memory untouched", async () => {
    const memoryPath = join(root, "ai", "agents", "test-desk", "memory.yaml");
    const before = "# Test Desk — working memory.\ncovered: []\nideas: []\nlikes: []\ndislikes: []\nnotes: \"\"\n";
    await writeFile(memoryPath, before);

    const publish = publishSpy();
    const deps: Partial<RunnerDeps> = {
      triage: async () => ({ write: false }),
      write: async () => {
        throw new Error("write must not be called on stand-down");
      },
      publish,
    };

    const res = await runAgent({ id: "test-desk", root, env: ENV, now: NOW, deps });

    expect(res).toEqual({ filed: false });
    expect(publish).not.toHaveBeenCalled();
    // Memory file byte-for-byte unchanged.
    expect(await readFile(memoryPath, "utf8")).toBe(before);
  });
});

describe("runAgent — Test C: happy path", () => {
  const draft = {
    title: "The Big Story",
    summary: "A summary.",
    body: "## The Big Story\n\nSome body text.",
    slug: "the-big-story",
    tags: ["beat"],
    usages: [{ model: "claude-opus-4-8", inputTokens: 100, outputTokens: 200 }],
  };

  function happyDeps(publish = publishSpy()) {
    const deps: Partial<RunnerDeps> = {
      triage: async () => ({
        write: true,
        angle: "x",
        usages: [{ model: "claude-haiku-4-5", inputTokens: 10, outputTokens: 5 }],
      }),
      research: async () => ({
        notes: "some notes",
        usages: [{ model: "claude-sonnet-4-6", inputTokens: 50, outputTokens: 30 }],
      }),
      write: async () => draft,
      publish,
    };
    return { deps, publish };
  }

  it("publishes once (non-dry) and records a covered entry in memory", async () => {
    const { deps, publish } = happyDeps();
    const res = await runAgent({ id: "test-desk", root, env: ENV, now: NOW, dryRun: false, deps });

    expect(res.filed).toBe(true);
    expect(res.title).toBe("The Big Story");
    expect(res.path).toContain("authors/test-desk/posts/");
    // Cost summed across all three phases.
    expect(res.cost?.input_tokens).toBe(160);
    expect(res.cost?.output_tokens).toBe(235);

    expect(publish).toHaveBeenCalledTimes(1);
    const [calledPath, markdown] = publish.mock.calls[0];
    expect(calledPath).toContain(join("authors", "test-desk", "posts"));
    expect(markdown).toContain("The Big Story");
    // The drip date is tomorrow (no future posts queued) — 2026-06-27.
    expect(markdown).toMatch(/date: 2026-06-27T/);

    // Private memory gained a covered entry.
    const memoryPath = join(root, "ai", "agents", "test-desk", "memory.yaml");
    const mem = await readFile(memoryPath, "utf8");
    expect(mem).toContain("covered:");
    expect(mem).toContain("the-big-story");
  });

  it("dryRun: runs the pipeline but never publishes or touches memory", async () => {
    const { deps, publish } = happyDeps();
    const memoryPath = join(root, "ai", "agents", "test-desk", "memory.yaml");

    const res = await runAgent({ id: "test-desk", root, env: ENV, now: NOW, dryRun: true, deps });

    expect(res.filed).toBe(true);
    expect(res.title).toBe("The Big Story");
    expect(publish).not.toHaveBeenCalled();
    // No memory file was written.
    await expect(stat(memoryPath)).rejects.toThrow();
  });

  it("drips past a queued future post (one day after the backlog)", async () => {
    // Queue a future-dated post so drip must append after it.
    await writeFile(
      join(root, "authors", "test-desk", "posts", "2026-06-30T1300-test-desk-queued.md"),
      "---\ntitle: \"Queued\"\ndate: 2026-06-30T13:00:00-04:00\nauthor: \"test-desk\"\ntags: [\"test-desk\"]\nsummary: \"q\"\n---\nbody\n",
    );
    const { deps, publish } = happyDeps();
    await runAgent({ id: "test-desk", root, env: ENV, now: NOW, dryRun: false, deps });

    const markdown = publish.mock.calls[0][1] as string;
    // 2026-06-30T13:00-04:00 is 2026-06-30T17:00Z; +1 day at 13:00Z = 2026-07-01.
    expect(markdown).toMatch(/date: 2026-07-01T/);
  });
});
