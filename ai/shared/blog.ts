import { parse } from "yaml";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Reading the rest of the Rookery before a desk writes.
 *
 * Two clearly separated pieces:
 *  1. `buildBlogContext` — pure, deterministic formatting of recent posts into a
 *     compact, tier-weighted context block for a system prompt. (TDD target.)
 *  2. `recentPosts` — the filesystem-backed read of the content repo's recent
 *     posts + frontmatter. Resilient: any single failure is skipped; total
 *     failure returns `[]` so a desk can still write.
 */

/** The minimal shape a desk needs to weigh a post it reads. */
export interface BlogPost {
  author: string; // content-repo author id (from frontmatter, else the path)
  title: string;
  summary?: string;
  date?: string;
  tags?: string[];
}

/**
 * Author trust tiers, keyed by content-repo author id. One place, easy to extend:
 *  - Tier 1 — Steve (human): editorial ground-truth / intent.
 *  - Tier 2 — Steve's Claude Code: the system's own voice.
 *  - Tier 3 — the desks: every other author (peers — useful, but verify).
 *
 * No recency decay, no confidence scaling. On conflict, defer up-tier.
 */
const TIER_BY_AUTHOR: Record<string, 1 | 2> = {
  cr0wst: 1,
  "personal-claude-code": 2,
};

/** The trust tier (1 highest) for a content-repo author id. Unknown → tier 3. */
export function trustTier(author: string): 1 | 2 | 3 {
  return TIER_BY_AUTHOR[author] ?? 3;
}

/** How many lines we show per tier in the context block. */
const PER_TIER_CAP = 6;

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Steve (human — editorial ground-truth)",
  2: "Personal Claude Code (the system's own voice)",
  3: "The desks (peers — useful, but verify)",
};

const PREAMBLE =
  "Weigh what you read by author trust: Steve > Personal Claude Code > the desks. " +
  "On conflict, defer up-tier. Don't repeat what's already covered — build on it and link it.";

/**
 * Format recent posts into a compact, tier-weighted context block for a system
 * prompt. Groups by tier, orders Tier1 → Tier2 → Tier3, caps per tier, omits
 * empty tiers, and is deterministic (stable input order within a tier). Returns
 * "" for no posts so callers can inject nothing on an empty read.
 */
export function buildBlogContext(posts: BlogPost[]): string {
  if (posts.length === 0) return "";

  // Stable partition: preserve the caller's order within each tier (the caller
  // hands them newest-first), so output is deterministic for a given input.
  const byTier: Record<1 | 2 | 3, BlogPost[]> = { 1: [], 2: [], 3: [] };
  for (const p of posts) byTier[trustTier(p.author)].push(p);

  const sections: string[] = [];
  for (const tier of [1, 2, 3] as const) {
    const rows = byTier[tier].slice(0, PER_TIER_CAP);
    if (rows.length === 0) continue; // omit empty tiers
    const lines = rows.map((p) => {
      const head = `"${p.title}"`;
      return p.summary ? `- ${head} — ${p.summary}` : `- ${head}`;
    });
    sections.push(`${TIER_LABELS[tier]}:\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return "";
  return `${PREAMBLE}\n\n${sections.join("\n\n")}`;
}

// ---------------------------------------------------------------------------

/** Split a markdown file's YAML frontmatter from its body. Returns the parsed
 *  frontmatter object (or {} if none / unparseable). */
function parseFrontmatter(text: string): Record<string, unknown> {
  // Frontmatter is a leading `---\n ... \n---` block. Tolerate a leading BOM.
  const m = text.replace(/^﻿/, "").match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try {
    const obj = parse(m[1]);
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Split a post's raw markdown into its body (everything after the leading
 * `---\n...\n---` frontmatter block). If there's no frontmatter, the whole text
 * is the body. Used by Erin (the Editor) to hand a model the ORIGINAL body to
 * copy-edit, without the frontmatter the renderer owns. Tolerates a leading BOM
 * and `\r\n`.
 */
export function splitFrontmatterBody(text: string): string {
  const m = text.replace(/^﻿/, "").match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  return m ? text.slice(m[0].length) : text;
}

/** The leading `YYYY-MM-DDThhmm` timestamp in a post filename, for sorting. */
function leadingStamp(path: string): string {
  const file = path.slice(path.lastIndexOf("/") + 1);
  const m = file.match(/^(\d{4}-\d{2}-\d{2}T\d{4})/);
  return m ? m[1] : "";
}

/**
 * Read recent published posts from disk and build a list for the desk to weigh.
 *
 * Walks `<root>/authors/<id>/posts/<file>.md`, parses frontmatter, returns
 * `BlogPost[]` newest-first by the leading filename timestamp. Excludes
 * `*.erin.md` sidecar files and any post with no `title`. Author = frontmatter
 * `author` else the `<id>` path segment.
 *
 * Fail-open: returns `[]` if `authors/` is missing or any other total failure.
 */
export async function recentPosts(root: string, limit = 12): Promise<BlogPost[]> {
  const authorsDir = join(root, "authors");
  let authors: string[] = [];
  try { authors = await readdir(authorsDir); } catch { return []; }
  const files: { path: string; id: string; file: string }[] = [];
  for (const id of authors) {
    let names: string[] = [];
    try { names = await readdir(join(authorsDir, id, "posts")); } catch { continue; }
    for (const file of names) {
      if (file.endsWith(".md") && !file.endsWith(".erin.md")) {
        files.push({ path: join(authorsDir, id, "posts", file), id, file });
      }
    }
  }
  files.sort((a, b) => leadingStamp(b.file).localeCompare(leadingStamp(a.file)));
  const out: BlogPost[] = [];
  for (const f of files.slice(0, limit)) {
    const fm = parseFrontmatter(await readFile(f.path, "utf8"));
    const title = typeof fm.title === "string" ? fm.title : "";
    if (!title) continue;
    const tags = Array.isArray(fm.tags) ? fm.tags.filter((t): t is string => typeof t === "string") : undefined;
    out.push({
      author: typeof fm.author === "string" && fm.author ? fm.author : f.id,
      title,
      summary: typeof fm.summary === "string" ? fm.summary : undefined,
      date: typeof fm.date === "string" ? fm.date : undefined,
      tags: tags && tags.length ? tags : undefined,
    });
  }
  return out;
}
