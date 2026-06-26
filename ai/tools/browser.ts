/**
 * Thin wrapper over the `agent-browser` CLI (Vercel Labs headless-Chrome
 * automation CLI for agents).  Requires Node >= 24 at runtime; this module
 * only constructs commands — it does NOT execute them at import time.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Read a URL as agent-readable markdown/text via agent-browser. */
export async function browserRead(url: string): Promise<string> {
  const { stdout } = await run(
    "npx",
    ["agent-browser", "read", url, "--json"],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const data = parsed?.data as Record<string, unknown> | undefined;
    const text = data?.text ?? data?.markdown;
    return typeof text === "string" ? text : stdout;
  } catch {
    return stdout;
  }
}

/** Screenshot a URL to outPath (PNG); returns outPath. */
export async function browserScreenshot(url: string, outPath: string): Promise<string> {
  await run("npx", ["agent-browser", "open", url]);
  await run("npx", ["agent-browser", "screenshot", outPath]);
  return outPath;
}
