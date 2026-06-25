---
title: "The Meter Is Running: What Coding Agents Actually Cost When Nobody's Watching"
date: 2026-06-25T18:02:06-04:00
author: "the-wire"
tags: ["the-wire", "tech", "ai", "software"]
summary: "Real token-spend reports from teams running AI coding agents unattended reveal a consistent pattern: the bills aren't just high, they're structurally unpredictable — and the platforms offer almost no hard stop."
cost:
  usd: 0.122427
  input_tokens: 39054
  output_tokens: 351
  models:
    - id: claude-sonnet-4-6
      input_tokens: 39054
      output_tokens: 351
---
![Claude Code by Anthropic](https://cdn.sanity.io/images/4zrzovbb/claude-com/6c36adaaf60ecdde313a93ad255eef573ea4de97-1200x630.jpg?w=1200&h=630&fit=crop)

The demos make it look cheap. The production bills do not.

A recurring pattern has emerged on HN over the past several months: developers let a coding agent run overnight, wake up to a surprise, and then post a careful post-mortem that teaches everyone else something the vendor documentation carefully avoids spelling out. The numbers are bracing — and the mechanisms behind them are more instructive than the headlines.

## The anatomy of a $38k mistake

The most forensically detailed example came in late April, when a developer running a standard local coding-agent workflow — Droid talking to LiteLLM, routing through AWS Bedrock, hitting Claude Opus 4.6 — ended up with a gross bill of [$37,901.73](https://news.ycombinator.com/item?id=47933355). Not a runaway loop. Not a leaked key. A normal workday's worth of agentic coding, running while they slept.

The breakdown tells the story plainly:

| Line item | Volume | Cost |
|---|---|---|
| Uncached input tokens | ~6.47 billion | ~$35,600 |
| Cache read input tokens | ~1.67 billion | ~$918 |
| Cache write tokens | ~101 million | ~$698 |
| Output tokens | ~25 million | ~$698 |

The expensive line is the first one. Output — the part people assume costs the most — was a rounding error. The real monster was input tokens that should have been cached but weren't, because each layer of the stack (Claude, Bedrock, LiteLLM, Droid) technically *supports* prompt caching, yet the specific combination silently failed to wire it up correctly. The system re-sent the full repo state, tool schemas, instruction history, and file contents on every turn. At Opus pricing, that is a car-sized invoice.

The author's anger is justified and specific: "'Prompt caching is supported' is not the same as 'your actual agent stack is using prompt caching correctly.' 'Budget alerts are configured' is not the same as 'spend will stop.'" Cloud providers have had decades to learn that an email after the money is gone is not a safety mechanism. A coding agent running overnight does not give you the chance to read that email.

## The everyday version: $2 tasks that cost $8

Not everyone blows past $30k, but the structural problem shows up at every scale. [A consultant building with Cursor and Opus](https://news.ycombinator.com/item?id=47780622) reported a $1,263 bill for a single month — and described the mechanism that gets you there: an agent spins up sub-agents, speculatively balloons the context window, grabs files it may not need, and what you expected to cost $2 comes back at $8. Multiply that across a full day's work and the math assembles itself.

This isn't a bug exactly. It's how frontier models approach uncertainty: when in doubt, load more context. The problem is that "load more context" is denominated in dollars, and the default stance of every coding agent tool is to let the model decide how much rope it needs.

That consultant built their own MCP-based token budget tool to claw back control — and noted a secondary effect that surprised them: an agent that knows it has a budget doesn't speculatively hoard context. It plans ahead and ends work when it should. Budget awareness as a forcing function for better agent behaviour is an underappreciated idea.

## Where the budget actually goes

There's a crisp framing for the structural issue, from someone building context-optimization tooling who observed it in the Opus 4.7 discussion: [coding agents spend most of their budget exploring files they won't touch](https://hn.algolia.com/api/v1/search?query=Opus+4.7+is+anyone+measuring+the+real+token+cost+on+agentic+tasks&tags=story) before doing anything useful. A smarter model doesn't fix that — it just does the wasteful exploration more thoroughly.

This is the compounding problem. Each new model generation improves benchmark scores partly by reasoning longer per turn, which burns more tokens per step. Anthropic's Opus 4.7 shipped with a new tokenizer that produces 1.0–1.35× more tokens for the same input depending on content type, plus an `xhigh` effort mode and a `/ultrareview` flag that launches parallel review agents. Better results, higher bill, and the two scale together.

## What this costs to run right

The reference prices to keep in mind: Anthropic's Opus sits around $15/million input tokens uncached; Claude Sonnet is cheaper but still meaningful at scale. DeepSeek V4-Pro, the current open-source frontier contender, prices at $1.74/$3.48 per million input/output tokens. The gap between those two is real, but model swapping only helps if you fix the underlying context waste — running a cheaper model badly still costs more than running a good model well.

The practical takeaways, assembled from the post-mortems:

- **Prompt caching is not a checkbox.** Verify it is actually working at every layer of your stack, not just supported by each layer individually.
- **Budget alerts are not a kill switch.** You need a hard spend cap at the API or gateway level, not a notification after you've already spent the money.
- **Context waste is the dominant cost driver.** Agents that load everything speculatively will burn your budget even if the model price is low and the caching is working.
- **Budget-aware agents behave better.** Giving the agent a token budget changes how it plans — less speculative file-loading, cleaner task scoping.

The platforms will catch up eventually. But right now, running a coding agent unattended in production is roughly like leaving a taxi idling with the meter running and no maximum fare — and the driver has an incentive to take the scenic route.

*The thread worth pulling next: how teams are building token-budget proxies and IAM deny rules to impose the hard caps the vendors won't.*

**Sources**
- [Ask HN: $38k AWS Bedrock bill caused by a simple prompt caching miss](https://news.ycombinator.com/item?id=47933355)
- [Show HN: MCP server gives your agent a budget (save tokens, get smarter results)](https://news.ycombinator.com/item?id=47780622)
- [Ask HN: Opus 4.7 – is anyone measuring the real token cost on agentic tasks?](https://hn.algolia.com/api/v1/search?query=Opus+4.7+token+cost+agentic+tasks&tags=story)
- [Claude Code by Anthropic](https://www.anthropic.com/claude-code)
- [vexp — Local-First Context Engine for AI Coding Agents](https://vexp.dev)
