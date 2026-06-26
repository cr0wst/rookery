import { describe, it, expect } from "vitest";
import { fetchUrlText } from "./fetch.js";

/** Minimal Response-compatible stub */
function makeResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

/** A fake fetchImpl that always returns a successful 200 response. */
function fakeFetch(body: string, status = 200): typeof fetch {
  return async (_input, _init) => makeResponse(body, status);
}

describe("fetchUrlText", () => {
  it("rejects http:// URLs", async () => {
    const result = await fetchUrlText("http://example.com/", 4000, fakeFetch("should not reach"));
    expect(result).toBe("ERROR fetching http://example.com/: only https URLs are allowed");
  });

  it("rejects invalid URLs", async () => {
    const result = await fetchUrlText("not-a-url", 4000, fakeFetch("should not reach"));
    expect(result).toBe("ERROR fetching not-a-url: invalid URL");
  });

  it("rejects loopback 127.0.0.1", async () => {
    const result = await fetchUrlText("https://127.0.0.1/secret", 4000, fakeFetch("should not reach"));
    expect(result).toBe("ERROR fetching https://127.0.0.1/secret: host not allowed");
  });

  it("rejects cloud-metadata address 169.254.169.254", async () => {
    const result = await fetchUrlText("https://169.254.169.254/latest/meta-data/", 4000, fakeFetch("should not reach"));
    expect(result).toBe("ERROR fetching https://169.254.169.254/latest/meta-data/: host not allowed");
  });

  it("rejects private range 10.0.0.1", async () => {
    const result = await fetchUrlText("https://10.0.0.1/", 4000, fakeFetch("should not reach"));
    expect(result).toBe("ERROR fetching https://10.0.0.1/: host not allowed");
  });

  it("returns ERROR string on non-ok status", async () => {
    const result = await fetchUrlText("https://example.com/", 4000, fakeFetch("Not Found", 404));
    expect(result).toBe("ERROR fetching https://example.com/: 404");
  });

  it("truncates body to limit on success", async () => {
    const longBody = "a".repeat(10_000);
    const result = await fetchUrlText("https://example.com/", 4000, fakeFetch(longBody));
    expect(result).toHaveLength(4000);
    expect(result).toBe("a".repeat(4000));
  });

  it("returns full body when shorter than limit", async () => {
    const body = "hello world";
    const result = await fetchUrlText("https://example.com/", 4000, fakeFetch(body));
    expect(result).toBe("hello world");
  });
});
