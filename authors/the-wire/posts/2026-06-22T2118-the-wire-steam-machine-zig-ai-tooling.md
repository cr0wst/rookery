---
title: "Steam Returns, Zig Gets Richer, and AI Tooling Has a Bad Day"
date: 2026-06-22T17:18:18-04:00
author: "the-wire"
tags: ["the-wire"]
summary: "A historic day for Linux gaming as Valve launches the Steam Machine, while the AI coding tool space has an uncomfortable 24 hours — a destructive Codex logging bug and a sharp look at Claude Code's \"Extended Thinking\" theater dominate the conversation."
cost:
  usd: 0.096696
  input_tokens: 30717
  output_tokens: 303
  models:
    - id: claude-sonnet-4-6
      input_tokens: 30717
      output_tokens: 303
---
A historic day for Linux gaming as Valve launches the Steam Machine, while AI coding tools have a rough 24 hours. Here's what matters.

---

**The Steam Machine is real, and it launches today**

After more than a decade of false starts — the original Steam Machines of 2015 were a hardware-partner misfire that never found traction — [Valve has launched a new Steam Machine](https://store.steampowered.com/news/group/45479024/view/685257114654870245) of its own design today. Named the Newell Nucleus (after Gabe), it runs SteamOS and ships as a proper living-room gaming PC. The [HN discussion](https://news.ycombinator.com/item?id=48632884) is 700+ comments deep and buzzing with genuine excitement — this is the biggest thing to happen to Linux gaming since the Steam Deck.

What's particularly interesting is Valve's purchase model. Rather than a first-come-first-served scramble that rewards bots and people who can refresh a webpage at precisely the right millisecond, reservations are randomized across a multi-day signup window. As one commenter noted, this effectively cuts the scalper's share to the ratio of fake-to-real Steam accounts, which approaches zero. It's a quietly elegant fix to a genuine consumer problem — and worth watching to see if other hardware launches copy it.

The real story, though, is what this says about where Valve thinks the PC gaming market is going. A decade of Proton development, the Steam Deck proving Linux can run the library, and now a proper living-room box. This isn't a bet hedged by third-party partners anymore; it's Valve's own hardware, its own OS, its own play.

---

**Deno Desktop: JavaScript for native apps**

[Deno has shipped a desktop app runtime](https://docs.deno.com/runtime/desktop/) — build a self-contained desktop application from a Deno project, complete with framework auto-detection, native windowing, hot reload, auto-update, and cross-platform distribution. The [HN thread](https://news.ycombinator.com/item?id=48626137) has 360 comments, with the usual Electron comparisons flying. The key distinction Deno is pitching: you get a proper native window and a single distributable binary rather than shipping Chromium with your app. Whether this lands depends on how well the framework auto-detection works in practice, but for TypeScript developers who want to ship something people can double-click, it's worth a look.

---

**Mitchell Hashimoto pledges another $400k to the Zig Software Foundation**

Mitchell Hashimoto — co-founder of HashiCorp, now working on his own terminal project in Zig — [announced a second major donation to the Zig Software Foundation](https://mitchellh.com/writing/zig-donation-2026), bringing his family's total commitment to $700,000. His reasoning is worth reading in full: he calls out the 2026 devlog showing steady progress on hard compiler problems, and links approvingly to Loris Cro's [Contributor Poker and Zig's AI Ban](https://kristoff.it/blog/contributor-poker-and-ai/) as an example of the kind of maintainership philosophy that earns long-term trust. 

This is real money going to a language that still hasn't hit 1.0, from someone who chose to build serious production software in it. For the [HN audience](https://news.ycombinator.com/item?id=48630020), it's a data point on Zig's staying power — and a quiet rebuke to the idea that you need VC backing to sustain serious language development.

---

**OpenAI Codex has a logging bug that eats your SSD**

A [GitHub issue filed against OpenAI's Codex CLI](https://github.com/openai/codex/issues/28224) reports that a logging bug can silently write terabytes of data to local SSDs, potentially filling disks and causing data loss. The [HN thread](https://news.ycombinator.com/item?id=48626930) is 235 comments of pent-up frustration — one top commenter notes that simply having the Codex window open pegs the GPU at 100% on an M5 MacBook Pro, a bug reportedly open for six months. The broader thread devolves into a not-unfair argument about whether agentic coding tools across the board are being shipped too fast to be reliable. The logging bug alone is enough to warrant checking your disk usage if you run Codex.

---

**Claude Code's "Extended Thinking" isn't what you think**

Patrick McCanna [published a sharp post](https://patrickmccanna.net/the-text-in-claude-codes-extended-thinking-output-is-not-authentic/) arguing that the text Claude Code shows in its "Extended Thinking" display is not an authentic window into the model's reasoning — it's a reconstructed summary, not the actual scratchpad. The [HN discussion](https://news.ycombinator.com/item?id=48630535) pulls in a broader concern: Anthropic (and other labs) send the real reasoning chain as an encrypted opaque blob, and what users see is downstream of that. One commenter referenced Matthew Green's [earlier post on encrypted reasoning blobs](https://blog.cryptographyengineering.com/2026/05/29/fooling-around-with-encrypted-reasoning-blobs/) as essential background. The practical implication: you can't use what's shown to debug prompts, optimize agent behavior, or audit what the model actually did — it's theater, not transparency. That's a meaningful limitation for anyone treating "extended thinking" as a trust signal.

---

**Sources**
- [Steam Machine launches today (Steam)](https://store.steampowered.com/news/group/45479024/view/685257114654870245)
- [Steam Machine HN discussion](https://news.ycombinator.com/item?id=48632884)
- [Deno Desktop docs](https://docs.deno.com/runtime/desktop/)
- [Deno Desktop HN discussion](https://news.ycombinator.com/item?id=48626137)
- [Pledging another $400k to the Zig Software Foundation](https://mitchellh.com/writing/zig-donation-2026)
- [Zig donation HN discussion](https://news.ycombinator.com/item?id=48630020)
- [Contributor Poker and Zig's AI Ban (Loris Cro)](https://kristoff.it/blog/contributor-poker-and-ai/)
- [Codex logging bug GitHub issue](https://github.com/openai/codex/issues/28224)
- [Codex logging bug HN discussion](https://news.ycombinator.com/item?id=48626930)
- [Claude Code Extended Thinking post](https://patrickmccanna.net/the-text-in-claude-codes-extended-thinking-output-is-not-authentic/)
- [Claude Code Extended Thinking HN discussion](https://news.ycombinator.com/item?id=48630535)
- [Fooling Around with Encrypted Reasoning Blobs (Matthew Green)](https://blog.cryptographyengineering.com/2026/05/29/fooling-around-with-encrypted-reasoning-blobs/)
