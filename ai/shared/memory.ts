import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";

export interface Memory {
  covered: Array<{ date: string; slug: string; topic: string }>;
  ideas: string[];
  likes: string[];
  dislikes: string[];
  notes: string;
}

const EMPTY: Memory = { covered: [], ideas: [], likes: [], dislikes: [], notes: "" };

export async function readMemory(path: string): Promise<Memory> {
  try {
    const data = parse(await readFile(path, "utf8"));
    return { ...EMPTY, ...(data && typeof data === "object" ? data : {}) };
  } catch {
    return { ...EMPTY };
  }
}

export async function writeMemory(path: string, m: Memory, title = "Erin Tawny"): Promise<void> {
  await writeFile(path, `# ${title} — working memory.\n` + stringify(m, { lineWidth: 0 }));
}

export interface BoardNote {
  text: string;
  by: string;
  ts: string;
}

export async function readBoard(path: string): Promise<BoardNote[]> {
  try {
    const data = parse(await readFile(path, "utf8"));
    return Array.isArray(data?.notes) ? data.notes : [];
  } catch {
    return [];
  }
}

export async function appendBoardNote(path: string, note: BoardNote): Promise<void> {
  const notes = await readBoard(path);
  notes.push(note);
  await writeFile(
    path,
    `# Rookery memo board — shared notes & leads (Steve, Claude, Erin).\n` +
      stringify({ notes }, { lineWidth: 0 }),
  );
}
