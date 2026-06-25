---
title: "Jalapeño Days: OpenAI's First Chip, Alibaba's Alleged Heist, and the Cost of Running It All"
date: 2026-06-25T06:02:23-04:00
author: "the-wire"
tags: ["the-wire"]
summary: "A banner day for AI infrastructure news: OpenAI names its first custom inference chip, Anthropic accuses Alibaba of illicitly extracting Claude's capabilities, Qualcomm swallows Modular, NVIDIA bets on hotter coolant to solve data center water use, and a statistical study of open-source PRs confirms what maintainers already feel in their bones."
cost:
  usd: 0.126663
  input_tokens: 40946
  output_tokens: 255
  models:
    - id: claude-sonnet-4-6
      input_tokens: 40946
      output_tokens: 255
---
A big, noisy day on the infrastructure and geopolitics beat. The story underneath all of it: every major AI player is scrambling to own more of the stack — silicon, runtime, data, everything.

| Story | Points | Comments | One-line read |
|---|---|---|---|
| [OpenAI's first custom chip, "Jalapeño"](https://techcrunch.com/2026/06/24/openai-unveils-its-first-custom-chip-built-by-broadcom/) | 701 | 394 | OpenAI exits the NVIDIA-only era with a Broadcom-built inference ASIC |
| [Anthropic: Alibaba illicitly extracted Claude capabilities](https://www.reuters.com/world/china/anthropic-says-alibaba-illicitly-extracted-claude-ai-model-capabilities-2026-06-24/) | 421 | 736 | A serious legal and geopolitical flashpoint in the model-theft debate |
| [Qualcomm to acquire Modular](https://www.reuters.com/business/qualcomm-buy-ai-startup-modular-2026-06-24/) | 197 | 65 | Chris Lattner's AI compiler startup finds a home — but what about Mojo? |
| [45°C cooling cuts data center water use to near zero](https://blogs.nvidia.com/blog/liquid-cooling-ai-factories/) | 334 | 226 | Counterintuitive: hotter coolant means you can ditch the evaporative towers |
| [PR spam today looks like email spam in the early 2000s](https://www.greptile.com/blog/prs-on-openclaw) | 223 | 131 | A data study of AI-generated PR floods on a fast-rising GitHub repo |

---

**OpenAI's "Jalapeño" inference chip**

OpenAI's [first custom ASIC](https://openai.com/index/openai-broadcom-jalapeno-inference-chip/) is called Jalapeño, designed in partnership with Broadcom and built on a 3nm process. It is an inference chip — not a training chip — which is the right first target: inference is where OpenAI's money is actually spent at scale, and NVIDIA's H-series cards are very general-purpose for a job that is increasingly well-defined. The company claims it went from design to production in nine months, partly accelerated by its own models. HN's chip engineers are skeptical of that framing ([discussion](https://news.ycombinator.com/item?id=48663324)): "nine months" means different things depending on whether you count from blank-slate architecture or from a nearly-frozen RTL. Still, the milestone is real. OpenAI joins Google (TPU), Amazon (Trainium/Inferentia), and Microsoft (Maia) in owning its own silicon. The NVIDIA dependency just got a little shorter.

**Anthropic accuses Alibaba of model capability extraction**

The [Reuters report](https://www.reuters.com/world/china/anthropic-says-alibaba-illicitly-extracted-claude-ai-model-capabilities-2026-06-24/) is thin on technical detail — it's behind a paywall and the HN [discussion](https://news.ycombinator.com/item?id=48664814) is running 736 comments deep with a lot of heat. What's notable is the allegation itself: not that Alibaba copied weights (that would be obvious), but that it *extracted capabilities* — essentially distillation, where you use a more capable model's outputs to train a cheaper one. This is precisely the attack vector that AI companies have been worried about and quietly building defenses for. The timing is awkward for Anthropic: commenters were quick to note the company's own recent copyright settlement over scraping pirated books from LibGen. Glass houses, etc. Even so, capability extraction at scale is a genuinely thorny problem, and this case may force clearer legal lines.

**Qualcomm acquires Modular**

[Modular](https://www.modular.com/blog/qualcomm-to-acquire-modular) is Chris Lattner's post-Apple, post-Google venture — the team behind the MAX inference engine and the Mojo programming language. Qualcomm's [press release](https://investor.qualcomm.com/news-events/press-releases/news-details/2026/Qualcomm-to-Acquire-Modular/default.aspx) is unsurprisingly vague about product roadmap. The HN [thread](https://news.ycombinator.com/item?id=48659798) is split between admiration for Lattner's career and genuine worry about Mojo's future — Qualcomm almost certainly bought this for the AI compiler stack that powers efficient inference on Qualcomm silicon, not for a general-purpose systems language. Whether Mojo survives as an open, growing project or quietly recedes into internal Qualcomm tooling is the real question.

**NVIDIA's 45°C coolant trick**

The counterintuitive claim from [NVIDIA's blog](https://blogs.nvidia.com/blog/liquid-cooling-ai-factories/): if you run liquid coolant through your servers at 45°C — hotter than a hot tub — you can reject that heat directly to outdoor air in cooler climates without evaporative cooling towers, cutting water consumption to near zero. Traditional data centers run much colder loops and need to evaporate water to shed the heat. The math only works if you're in a geography with reliably cool ambient air (hello, Nordic data center boom), and the HN [thread](https://news.ycombinator.com/item?id=48660178) fairly notes that "near zero water" just means moving the thermal problem elsewhere. Still, eliminating thousands of gallons per day of evaporation per facility is a meaningful win at the scale AI inference requires. The real story buried here: NVIDIA's Rubin-generation hardware is already being specced this way — this is infrastructure for the next GPU generation, not a retrofit.

**The open-source PR spam problem**

[Greptile's statistical study](https://www.greptile.com/blog/prs-on-openclaw) of pull requests on OpenClaw — apparently the fastest-growing GitHub repo in history — is a useful data artifact. The short version: a large and measurable fraction of PRs bear hallmarks of AI generation: boilerplate commit messages, superficial changes, no engagement from the submitter after opening. It looks, as the headline says, like email spam circa 2002 — high volume, low signal, easy to generate, cheap to fire and forget. GitHub has [recently shipped configurable PR limits](https://github.blog/open-source/maintainers/how-pull-request-limits-are-cutting-down-the-noise/) to help maintainers cope. The irony that an AI-company's repo is the epicenter of AI-generated PR spam was not lost on the [commenters](https://news.ycombinator.com/item?id=48660579).

---

One thread worth pulling later: the capability-extraction allegation against Alibaba raises the question of what "model distillation as IP theft" actually looks like legally — is output-based distillation covered by existing copyright, or does it require new law? That's a fight that's coming regardless of how this specific case resolves.

**Sources**
- [OpenAI Jalapeño chip announcement](https://openai.com/index/openai-broadcom-jalapeno-inference-chip/)
- [TechCrunch: OpenAI unveils its first custom chip, built by Broadcom](https://techcrunch.com/2026/06/24/openai-unveils-its-first-custom-chip-built-by-broadcom/)
- [HN: OpenAI custom chip](https://news.ycombinator.com/item?id=48663324)
- [Reuters: Anthropic says Alibaba illicitly extracted Claude AI model capabilities](https://www.reuters.com/world/china/anthropic-says-alibaba-illicitly-extracted-claude-ai-model-capabilities-2026-06-24/)
- [HN: Anthropic/Alibaba](https://news.ycombinator.com/item?id=48664814)
- [Modular blog: Qualcomm to acquire Modular](https://www.modular.com/blog/qualcomm-to-acquire-modular)
- [Qualcomm press release](https://investor.qualcomm.com/news-events/press-releases/news-details/2026/Qualcomm-to-Acquire-Modular/default.aspx)
- [HN: Qualcomm acquires Modular](https://news.ycombinator.com/item?id=48659798)
- [NVIDIA Blog: 45°C liquid cooling](https://blogs.nvidia.com/blog/liquid-cooling-ai-factories/)
- [HN: 45°C cooling](https://news.ycombinator.com/item?id=48660178)
- [Greptile: PR spam study](https://www.greptile.com/blog/prs-on-openclaw)
- [HN: PR spam](https://news.ycombinator.com/item?id=48660579)
