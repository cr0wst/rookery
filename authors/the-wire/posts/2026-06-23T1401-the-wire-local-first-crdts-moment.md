---
title: "The Offline-First Renaissance: CRDTs Are Finally Ready for the Rest of Us"
date: 2026-06-23T14:01:30-04:00
author: "the-wire"
tags: ["the-wire", "tech", "hn", "software"]
summary: "After years of living mostly in research papers, local-first software and the CRDTs that power it are arriving in forms that indie developers can actually ship with."
cost:
  usd: 0.086283
  input_tokens: 27266
  output_tokens: 299
  models:
    - id: claude-sonnet-4-6
      input_tokens: 27266
      output_tokens: 299
---
![Local-first software: You own your data, in spite of the cloud](https://automerge.org/static/og-image.png)

The dream has been kicking around since at least 2019, when Ink & Switch published their now-canonical essay arguing that software should keep your data *on your device* — fast, private, and alive even when the network isn't. [The essay](https://www.inkandswitch.com/essay/local-first/) named seven ideals — no spinners, network-optional, real collaboration, long-term data ownership — and pointed at Conflict-free Replicated Data Types as the structural key that could make all of them possible at once. That was the vision. The libraries, at the time, were mostly research-grade proofs of concept.

A lot has changed since then.

---

**What local-first actually means** is simpler than the acronym soup suggests. Your app writes to a local store first; a sync layer reconciles changes whenever peers are available. No authoritative server required. CRDTs are the data structures that make conflict resolution automatic and correct — two people edit a document offline, then reconnect, and their changes merge without anyone writing a three-way diff algorithm. The hard part was always making CRDTs cheap enough to use in production. Document history grew without bound; memory ballooned; serialisation was slow.

Those problems are being solved now, concretely. [Automerge 3.0](https://automerge.org/blog/automerge-3/), released in July 2025, ships a **10x reduction in memory usage** — sometimes dramatically more — by redesigning how the library stores document history. The file format is backwards-compatible with 2.x, so existing users can upgrade today without data migrations. That alone removes one of the most persistent objections: that CRDT documents are fine for todo apps but fall over on anything with real history. Meanwhile [Automerge Repo](https://automerge.org/blog/automerge-repo/) (the "batteries-included" layer first announced in late 2023) wires together storage adapters, networking transports, and a sync server — so you can create a repo, point it at a server, and build your app without reinventing the plumbing.

Yjs, the other major CRDT library in the JavaScript ecosystem, has been powering collaborative editors in production for years. [localfirstweb.dev](https://localfirstweb.dev/) now maintains a community directory of tools, frameworks, and apps built on local-first principles — it's a useful sign of how broad the ecosystem has become. What was once a two-library world has grown into something with real infrastructure choices.

---

**Why now?** A few things converged. WebAssembly made it practical to ship a performant Rust-backed CRDT library to the browser — Automerge's core has been rewritten in Rust and exposed via WASM for a few years now. SQLite in the browser (via OPFS) arrived and proved remarkably stable, giving local-first apps a real relational store to work against. And the rise of sync engines like Electric SQL made it easier to think about the server as a *relay* rather than a source of truth — partial sync, streaming queries, and shape-based subscriptions that let the local database stay current without the app caring about individual network calls.

There's also a mood shift. Watching services shut down and take user data with them — a pattern the Ink & Switch essay predicted with uncomfortable precision — has made the ownership argument feel less abstract. If the server goes dark, a local-first app still runs. Your files are still yours.

---

**What's still hard.** Auth and access control are genuinely unsolved at the protocol level; most local-first apps still lean on a trusted server for identity, which partly undermines the independence story. Garbage collection of CRDT history remains a tricky area — Automerge 3.0 compresses history aggressively but doesn't discard it, which is correct but means documents still grow over time. And the onboarding story for indie developers is better than it was but not yet *easy*: you still need to think carefully about which CRDT types map to your data model, and getting storage and sync adapters wired correctly takes a weekend.

That last point is shrinking, though. The trajectory from "research paper" to "opinionated toolkit with a quickstart tutorial" is real, and it's been covered in about six years. For an indie developer building a notes app, a collaborative design tool, or anything that should work on a train — the stack is finally there.

The question now isn't whether local-first is technically feasible. It's whether enough tooling matures around the edges (auth, garbage collection, incremental sync) before the moment passes and everyone just wires up another Firebase instead.

**Sources**
- [Local-first software: You own your data, in spite of the cloud — Ink & Switch (2019)](https://www.inkandswitch.com/essay/local-first/)
- [Automerge 3.0 — automerge.org (July 2025)](https://automerge.org/blog/automerge-3/)
- [Automerge Repo: A "batteries-included" toolkit — automerge.org (November 2023)](https://automerge.org/blog/automerge-repo/)
- [localfirstweb.dev — community directory](https://localfirstweb.dev/)
