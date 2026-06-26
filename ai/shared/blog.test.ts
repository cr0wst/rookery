import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recentPosts, buildBlogContext, trustTier } from "./blog";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

async function makeFixtureTree(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rookery-blog-test-"));

  // authors/cr0wst/posts/
  await mkdir(join(root, "authors", "cr0wst", "posts"), { recursive: true });
  await writeFile(
    join(root, "authors", "cr0wst", "posts", "2026-06-20T1000-cr0wst-hi.md"),
    [
      "---",
      "title: Hello from Steve",
      "author: cr0wst",
      "summary: Steve says hi.",
      "date: 2026-06-20",
      "---",
      "",
      "Body content here.",
    ].join("\n"),
  );

  // authors/erin-the-editor/posts/
  await mkdir(join(root, "authors", "erin-the-editor", "posts"), { recursive: true });
  await writeFile(
    join(root, "authors", "erin-the-editor", "posts", "2026-06-22T0900-erin-the-editor-x.md"),
    [
      "---",
      "title: Erin Writes",
      "author: erin-the-editor",
      "summary: Erin shares thoughts.",
      "---",
      "",
      "Content.",
    ].join("\n"),
  );

  // .erin.md sidecar — should be excluded
  await writeFile(
    join(root, "authors", "erin-the-editor", "posts", "2026-06-22T0900-erin-the-editor-x.erin.md"),
    [
      "---",
      "title: This is a sidecar",
      "author: erin-the-editor",
      "---",
      "",
      "Sidecar content.",
    ].join("\n"),
  );

  // A post with no title — should be skipped
  await mkdir(join(root, "authors", "some-desk", "posts"), { recursive: true });
  await writeFile(
    join(root, "authors", "some-desk", "posts", "2026-06-18T0800-some-desk-notitle.md"),
    [
      "---",
      "author: some-desk",
      "summary: No title here.",
      "---",
      "",
      "This post has no title and should be skipped.",
    ].join("\n"),
  );

  return root;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let tmpRoot: string | undefined;

afterEach(async () => {
  if (tmpRoot) {
    await rm(tmpRoot, { recursive: true, force: true });
    tmpRoot = undefined;
  }
});

describe("recentPosts", () => {
  it("returns posts newest-first by leading filename timestamp", async () => {
    tmpRoot = await makeFixtureTree();
    const posts = await recentPosts(tmpRoot);
    // Erin (2026-06-22) is newer than Steve (2026-06-20)
    expect(posts.length).toBe(2);
    expect(posts[0].title).toBe("Erin Writes");
    expect(posts[1].title).toBe("Hello from Steve");
  });

  it("excludes .erin.md sidecar files", async () => {
    tmpRoot = await makeFixtureTree();
    const posts = await recentPosts(tmpRoot);
    const titles = posts.map((p) => p.title);
    expect(titles).not.toContain("This is a sidecar");
  });

  it("skips posts with no title", async () => {
    tmpRoot = await makeFixtureTree();
    const posts = await recentPosts(tmpRoot);
    // some-desk post has no title and should be absent
    expect(posts.every((p) => p.title !== "")).toBe(true);
    expect(posts.find((p) => p.author === "some-desk")).toBeUndefined();
  });

  it("uses frontmatter author when present, else the id segment", async () => {
    tmpRoot = await makeFixtureTree();
    const posts = await recentPosts(tmpRoot);
    const stevePosts = posts.filter((p) => p.author === "cr0wst");
    expect(stevePosts).toHaveLength(1);
    expect(stevePosts[0].summary).toBe("Steve says hi.");
  });

  it("returns [] when authors/ directory is missing (fail-open)", async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "rookery-blog-empty-"));
    const posts = await recentPosts(tmpRoot);
    expect(posts).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    tmpRoot = await makeFixtureTree();
    const posts = await recentPosts(tmpRoot, 1);
    expect(posts.length).toBe(1);
    expect(posts[0].title).toBe("Erin Writes"); // newest first
  });
});

describe("trustTier", () => {
  it("places cr0wst in tier 1", () => {
    expect(trustTier("cr0wst")).toBe(1);
  });

  it("places personal-claude-code in tier 2", () => {
    expect(trustTier("personal-claude-code")).toBe(2);
  });

  it("places unknown authors in tier 3", () => {
    expect(trustTier("erin-the-editor")).toBe(3);
    expect(trustTier("anyone-else")).toBe(3);
  });
});

describe("buildBlogContext", () => {
  it("returns empty string for no posts", () => {
    expect(buildBlogContext([])).toBe("");
  });

  it("places cr0wst in tier 1 section", () => {
    const ctx = buildBlogContext([
      { author: "cr0wst", title: "Steve's Post", summary: "Steve writes." },
      { author: "erin-the-editor", title: "Erin's Post" },
    ]);
    expect(ctx).toContain("Steve (human — editorial ground-truth):");
    expect(ctx).toContain('"Steve\'s Post" — Steve writes.');
    // Tier 3 section for erin
    expect(ctx).toContain("The desks (peers — useful, but verify):");
    expect(ctx).toContain('"Erin\'s Post"');
  });

  it("omits empty tiers", () => {
    const ctx = buildBlogContext([
      { author: "erin-the-editor", title: "Only Erin" },
    ]);
    expect(ctx).not.toContain("Steve (human");
    // The preamble always mentions "Personal Claude Code", so check for the section heading
    expect(ctx).not.toContain("Personal Claude Code (the system's own voice):");
    expect(ctx).toContain("The desks");
  });

  it("includes the trust-weighting preamble", () => {
    const ctx = buildBlogContext([{ author: "cr0wst", title: "Hello" }]);
    expect(ctx).toContain("Weigh what you read by author trust");
  });
});
