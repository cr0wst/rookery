import { describe, it, expect } from "vitest";
import { buildPost, slugify } from "./format";
import { computeCost } from "./cost";

describe("buildPost", () => {
  it("emits frontmatter with deduped tags and a cost block", () => {
    const md = buildPost({
      author: "erin-the-editor",
      title: 'A "Quoted" Title',
      date: new Date("2026-06-26T14:00:00Z"),
      tags: ["erin-the-editor", "essay"],
      summary: "x",
      body: "Hello.",
      cost: computeCost([{ model: "claude-sonnet-4-6", inputTokens: 1000, outputTokens: 100 }]),
      tz: "America/New_York",
    });
    expect(md).toContain('title: "A \\"Quoted\\" Title"');
    expect(md).toContain('tags: ["erin-the-editor", "essay"]');
    expect(md).toContain("usd: 0.0045"); // (1000*3 + 100*15)/1e6
    expect(md.trimEnd().endsWith("Hello.")).toBe(true);
  });
});

describe("slugify", () => {
  it("kebab-cases and trims", () => expect(slugify("Hi There!")).toBe("hi-there"));
});
