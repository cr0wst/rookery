import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readMemory,
  writeMemory,
  readBoard,
  appendBoardNote,
  type Memory,
  type BoardNote,
} from "./memory";

let tmpDir: string;

async function setup() {
  tmpDir = await mkdtemp(join(tmpdir(), "rookery-memory-test-"));
}

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

describe("readMemory", () => {
  it("returns empty defaults when file does not exist", async () => {
    await setup();
    const path = join(tmpDir, "nonexistent.yaml");
    const mem = await readMemory(path);
    expect(mem).toEqual({ covered: [], ideas: [], likes: [], dislikes: [], notes: "" });
  });

  it("does not throw when file is missing", async () => {
    await setup();
    const path = join(tmpDir, "missing.yaml");
    await expect(readMemory(path)).resolves.toBeDefined();
  });
});

describe("writeMemory + readMemory round-trip", () => {
  it("round-trips a populated Memory", async () => {
    await setup();
    const path = join(tmpDir, "memory.yaml");
    const mem: Memory = {
      covered: [{ date: "2026-06-26", slug: "first-post", topic: "AI blogging" }],
      ideas: ["Write about memory patterns", "Explore YAML serialization"],
      likes: ["concise prose", "good hooks"],
      dislikes: ["jargon", "listicles"],
      notes: "Remember to check the brief before drafting.",
    };

    await writeMemory(path, mem);
    const result = await readMemory(path);

    expect(result).toEqual(mem);
  });

  it("writes a header comment with the given title", async () => {
    await setup();
    const path = join(tmpDir, "memory-titled.yaml");
    const mem: Memory = { covered: [], ideas: [], likes: [], dislikes: [], notes: "" };

    await writeMemory(path, mem, "Custom Agent");

    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path, "utf8");
    expect(raw.startsWith("# Custom Agent — working memory.")).toBe(true);
  });
});

describe("readBoard", () => {
  it("returns empty array when file does not exist", async () => {
    await setup();
    const path = join(tmpDir, "board.yaml");
    const notes = await readBoard(path);
    expect(notes).toEqual([]);
  });
});

describe("appendBoardNote", () => {
  it("appends two notes and readBoard returns them in order", async () => {
    await setup();
    const path = join(tmpDir, "board.yaml");

    const note1: BoardNote = { text: "First lead", by: "Steve", ts: "2026-06-26T10:00:00Z" };
    const note2: BoardNote = { text: "Second idea", by: "Erin", ts: "2026-06-26T11:00:00Z" };

    await appendBoardNote(path, note1);
    await appendBoardNote(path, note2);

    const notes = await readBoard(path);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual(note1);
    expect(notes[1]).toEqual(note2);
  });

  it("writes a header comment on the board file", async () => {
    await setup();
    const path = join(tmpDir, "board-header.yaml");
    await appendBoardNote(path, { text: "test", by: "Steve", ts: "2026-06-26T00:00:00Z" });

    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path, "utf8");
    expect(raw.startsWith("# Rookery memo board")).toBe(true);
  });
});
