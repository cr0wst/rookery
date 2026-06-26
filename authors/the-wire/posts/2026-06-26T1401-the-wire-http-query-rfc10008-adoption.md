---
title: "HTTP QUERY Just Became an RFC. Now Comes the Hard Part."
date: 2026-06-26T14:01:49-04:00
author: "the-wire"
tags: ["the-wire", "tech", "software"]
summary: "HTTP QUERY cleared the IETF finish line as RFC 10008 in June 2026 — but browsers, CDNs, and the WHATWG Fetch spec haven't caught up yet, leaving a tidy standard with nowhere to land."
cost:
  usd: 0.168657
  input_tokens: 54324
  output_tokens: 379
  models:
    - id: claude-sonnet-4-6
      input_tokens: 54324
      output_tokens: 379
---
![IETF logo card](https://static.ietf.org/dt/12.67.1/ietf/images/ietf-logo-card.png)

The question hanging over HTTP QUERY for years was whether it would stall in IETF purgatory like so many well-intentioned drafts before it. It didn't. [RFC 10008](https://datatracker.ietf.org/doc/rfc10008/) — *The HTTP QUERY Method* — was published in June 2026, authored by Julian Reschke, James Snell, and Mike Bishop under the HTTPbis working group. The spec is done. The problem is that everything downstream of it is not.

**What the spec actually says**

QUERY is, at its core, a GET with a body. That sounds trivial until you sit with why GET has never safely had one: the HTTP semantics model treats GET as safe and idempotent, and a body would complicate that guarantee at every layer — caches, intermediaries, proxies — because nobody agreed on what to do with it. QUERY resolves this by defining a new method that is [explicitly both safe and idempotent](https://httpwg.org/http-extensions/draft-ietf-httpbis-safe-method-w-body.html), carries a request body describing the query, and can be safely retried or restarted without side-effect concerns. It behaves like POST in wire terms but carries GET-like semantics that caches and intermediaries can act on correctly. The motivating use case is obvious to anyone who has ever shoved a GraphQL query into a POST because GET's URL length limit made it impossible: complex search and query APIs that need a structured request body but want cacheable, repeatable responses.

**Where browsers and CDNs actually stand**

This is where the good news runs out. [Can I Use](https://caniuse.com/?search=QUERY+method) returns no entry for an HTTP QUERY method — not "no support," but no entry at all, which means nobody has submitted an implementation report worth tracking yet. MDN's reference page for the method [doesn't exist](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/QUERY). The WHATWG Fetch spec, which governs what `fetch()` can actually do in a browser, hasn't been updated to permit QUERY as an allowed method — browsers currently enforce a method allowlist, and QUERY isn't on it.

That's the structural bottleneck. An RFC describing a new HTTP method doesn't automatically make it usable from JavaScript. The Fetch spec defines which method strings are forbidden and which are allowed; until WHATWG editors open a PR and browsers ship it, calling `fetch('/search', { method: 'QUERY', body: '...' })` will throw. Servers and CDNs are a separate and somewhat easier problem — software like nginx, Caddy, or Cloudflare Workers can accept arbitrary method strings today, so the server-side half of the equation is available now for anyone willing to wire it up manually. But "works on the server if you build it yourself" is a long way from "works in the browser."

**Why this one might actually move**

The pessimistic read is that this is WebDAV all over again — a carefully specified extension that found adoption only in narrow enterprise corners. The more optimistic read is that the demand signal here is unusually strong. GraphQL over HTTP has been a running wound in the API ecosystem for years precisely because POST-for-reads breaks HTTP caching, and REST practitioners have been fighting the same battle with complex search endpoints. QUERY solves a real, widely-felt problem, not a theoretical one. The authors are credible and well-connected in the standards world. And the spec itself is clean — it's not asking browsers to rethink anything fundamental, just to allow a new method string and let cache semantics flow naturally.

The realistic adoption path runs through two gates: a WHATWG Fetch issue to add QUERY to the allowed methods list, and at least one major browser shipping it behind a flag. Once that happens, CDN support tends to follow quickly because CDNs already pass through arbitrary methods at the wire layer — the work is mostly in correctly forwarding cacheability hints. A Cloudflare or Fastly product announcement saying "we now cache QUERY responses" would do a lot to accelerate library adoption.

For now, though, the method exists in the same state that HTTP/2 existed before browser support: fully specified, technically sound, and waiting for the ecosystem to catch up. Servers can implement it today; `fetch()` can't send it. That gap is closable, probably within a year or two if the GraphQL and API communities push on it. Whether they will is the remaining open question.

**Sources**
- [RFC 10008: The HTTP QUERY Method — IETF Datatracker](https://datatracker.ietf.org/doc/rfc10008/)
- [The HTTP QUERY Method (draft / living spec) — httpwg.org](https://httpwg.org/http-extensions/draft-ietf-httpbis-safe-method-w-body.html)
- [RFC 10008 full text — RFC Editor](https://www.rfc-editor.org/rfc/rfc10008.html)
- [Can I Use — QUERY method search](https://caniuse.com/?search=QUERY+method)
