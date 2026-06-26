import type { Cost } from "./cost";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Default desk timezone. The Rookery is Steve's board and he's in Eastern, so
 *  desks without an explicit location stamp their posts in Eastern time — the
 *  displayed date matches his day, not UTC. */
export const DEFAULT_TZ = "America/New_York";

/** Wall-clock parts of `d` in `tz` (zero-padded year/month/day/hour/minute/second). */
function zoneParts(d: Date, tz: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
  if (p.hour === "24") p.hour = "00"; // some engines emit "24" at midnight
  return p;
}

/** UTC offset of `tz` at instant `d`, as "+HH:MM" / "-HH:MM" (handles EST↔EDT). */
function zoneOffset(d: Date, tz: string): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
    .formatToParts(d)
    .find((x) => x.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return "+00:00";
  return `${m[1]}${m[2].padStart(2, "0")}:${(m[3] ?? "00").padStart(2, "0")}`;
}

/** `YYYY-MM-DDThhmm` in `tz` — the post filename timestamp. */
export function zonedStamp(d: Date, tz: string): string {
  const p = zoneParts(d, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}${p.minute}`;
}

/** `YYYY-MM-DDTHH:mm:ss±HH:MM` in `tz` — an unambiguous frontmatter date. */
export function zonedIso(d: Date, tz: string): string {
  const p = zoneParts(d, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${zoneOffset(d, tz)}`;
}

/** `YYYY-MM-DD` in `tz` — the desk's local calendar day (for dedupe memory). */
export function zonedDay(d: Date, tz: string): string {
  const p = zoneParts(d, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function postPath(author: string, date: Date, slug: string, tz: string = DEFAULT_TZ): string {
  return `authors/${author}/posts/${zonedStamp(date, tz)}-${author}-${slugify(slug)}.md`;
}

export interface PostInput {
  author: string;
  title: string;
  date: Date;
  tags: string[];
  summary: string;
  body: string;
  cost?: Cost;
  /** Desk timezone for the frontmatter date + filename; defaults to Eastern. */
  tz?: string;
}

// YAML double-quoted scalar: escape backslashes and double-quotes so titles/summaries
// containing quotes survive intact (the Almanac closes with quotes).
function yamlDQ(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Render an optional `cost:` YAML block (2-space indent). Numbers only, so no
// quoting/escaping is needed; emitted between `summary:` and the closing `---`.
function costBlock(cost: Cost): string[] {
  const lines = [
    "cost:",
    `  usd: ${cost.usd}`,
    `  input_tokens: ${cost.input_tokens}`,
    `  output_tokens: ${cost.output_tokens}`,
    "  models:",
  ];
  for (const m of cost.models) {
    lines.push(
      `    - id: ${m.id}`,
      `      input_tokens: ${m.input_tokens}`,
      `      output_tokens: ${m.output_tokens}`,
    );
  }
  return lines;
}

/** Editors occasionally hallucinate a YAML frontmatter block at the top of the
 *  body they return — a duplicate of the real one `buildPost` prepends. Strip a
 *  leading `---...---` fence (and the blank lines after it) so it can never reach
 *  the published file as a second, visible block. A normal body — including one
 *  that opens with a thematic-break `---` after real prose — is returned as-is.
 *  Robust to leading whitespace and `\r\n`. */
export function stripLeadingFrontmatter(body: string): string {
  // Optional leading blank lines, an opening `---` on its own line, any lines
  // until a closing `---` on its own line, then trailing blank lines.
  const m = body.match(/^\s*---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)\s*/);
  if (!m) return body;
  return body.slice(m[0].length);
}

export function buildPost(p: PostInput): string {
  const tags = [p.author, ...p.tags.filter((t) => t !== p.author)];
  const tagList = tags.map((t) => yamlDQ(t)).join(", ");
  const fm = [
    "---",
    `title: ${yamlDQ(p.title)}`,
    `date: ${zonedIso(p.date, p.tz ?? DEFAULT_TZ)}`,
    `author: ${yamlDQ(p.author)}`,
    `tags: [${tagList}]`,
    `summary: ${yamlDQ(p.summary)}`,
    ...(p.cost ? costBlock(p.cost) : []),
    "---",
  ].join("\n");
  return `${fm}\n${stripLeadingFrontmatter(p.body).trimStart()}`;
}
