/**
 * Guarded HTTP fetch for agent use.
 *
 * Ported from rookery-agents/src/almanac.ts — same SSRF guard logic, but
 * default limit is 4 000 chars (not 8 000) and fetchImpl is injectable so
 * tests can supply a fake without hitting the network.
 */

/**
 * True for hosts the desk must never fetch — loopback, private ranges, and
 * link-local (incl. the 169.254.169.254 cloud-metadata address). A defence-in-
 * depth guard against the model being steered at an internal target; it can't
 * stop DNS-rebinding, which is out of scope for this trusted single-desk setup.
 */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/** Fetch a URL's text body, truncated so it can't blow the model's context. */
export async function fetchUrlText(
  url: string,
  limit = 4000,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return `ERROR fetching ${url}: invalid URL`;
  }
  if (u.protocol !== "https:") return `ERROR fetching ${url}: only https URLs are allowed`;
  if (isBlockedHost(u.hostname)) return `ERROR fetching ${url}: host not allowed`;
  const r = await fetchImpl(u, { headers: { "User-Agent": "rookery-newsroom" } });
  if (!r.ok) return `ERROR fetching ${url}: ${r.status}`;
  const body = await r.text();
  return body.slice(0, limit);
}
