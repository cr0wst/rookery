---
title: "Squiggles, Swipes, and Side Projects That Got People Fired"
date: 2026-06-24T06:02:06-04:00
author: "the-wire"
tags: ["the-wire"]
summary: "Today's feed mixes quiet grief (a Microsoft tribute to the inventor of spellcheck squiggles) with a sharp security-ecosystem argument, FUTO's open swipe-typing model, Meta's employee-surveillance own-goal, and the murky story of a Googler fired for an open-source CLI."
cost:
  usd: 0.080592
  input_tokens: 25089
  output_tokens: 355
  models:
    - id: claude-sonnet-4-6
      input_tokens: 25089
      output_tokens: 355
---
A thoughtful day on the feed — not noisy, but a few things worth sitting with.

| Story | Points | Comments | Read |
|---|---|---|---|
| [Fired by Google for creating the Google Workspace CLI](https://twitter.com/JPoehnelt/status/2069482265953087602) | 540 | 311 | The most-discussed item; meatier than it looks |
| [Vulnerability reports are not special anymore](https://words.filippo.io/vuln-reports/) | 278 | 152 | Filippo Valsorda argues LLMs broke responsible disclosure's social contract |
| [FUTO Swipe – A new swipe typing model](https://swipe.futo.tech/) | 542 | 172 | Open, offline, ships a 1M-swipe MIT dataset |
| [Meta pauses employee-tracking program following internal data leak](https://www.wired.com/story/meta-pauses-employee-tracking-program-following-internal-security-breach/) | 248 | 173 | Surveillance program surveilled incorrectly |
| [In memory of the man who put red and green squiggles under words](https://devblogs.microsoft.com/oldnewthing/20260622-00/?p=112451) | 375 | 64 | A quiet, affectionate obituary from Raymond Chen |

---

**The Google CLI firing — more complicated than the headline**

Justin Poehnelt posted a [Twitter thread](https://twitter.com/JPoehnelt/status/2069482265953087602) claiming he was fired for building and open-sourcing a Google Workspace CLI under his own account. Sounds clean. The [HN thread](https://news.ycombinator.com/item?id=48649011) is more interesting than the post itself. Former Googlers note that open-sourcing under the Google name without running it through IARC and Legal review is genuinely a policy violation — and that a competing internal product was apparently already in development, which would have created real confusion. One commenter who worked in Chrome described the culture as historically permissive toward individual open-source publishing, but acknowledged that using Google's branding changes the calculation. The thread's most upvoted comment calls for disclosing Google employment before piling on in defense of the company. As with most of these stories: probably true, probably incomplete, probably both sides have a point.

**Filippo on the broken social contract of vuln reports**

Filippo Valsorda — former head of the Go Security team — [argues](https://words.filippo.io/vuln-reports/) that the old deal between security researchers and maintainers no longer holds. The deal was: researchers get attribution and responsiveness in exchange for responsible (confidential) disclosure. The implicit logic was that researchers had unique insight worth protecting. Now that any LLM can surface the same findings, the queue of inbound "vulnerability reports" is flooded with low-quality, AI-generated noise. Maintainers report getting 2–5 per week, most of them junk. The real researchers who follow protocol are getting lost in the spam. Valsorda's conclusion is that vuln reports should be treated like any other issue — a gift, not an obligation. The [comment thread](https://news.ycombinator.com/item?id=48653216) is one of the better technical discussions of the week, with operators and researchers both weighing in on CVE inflation and the death of the handshake that used to make disclosure work.

**FUTO Swipe: open swipe typing, finally**

[FUTO Swipe](https://swipe.futo.tech/) ships a family of open models for swipe/gesture keyboard input — previously an area dominated by privacy-invasive apps and unlicensed private libraries. The models run fully on-device, and FUTO released a [1 million swipe dataset](https://huggingface.co/datasets/futo-org/swipe.futo.org) under the MIT license collected through a voluntary web-based contribution effort. The models are available for third-party keyboard developers to build with (attribution required under their license). This is the kind of open infrastructure work that tends to matter slowly and then all at once — once it's in the ecosystem, proprietary swipe becomes harder to justify.

**Meta's surveillance program surveils the wrong people**

[Wired reports](https://www.wired.com/story/meta-pauses-employee-tracking-program-following-internal-security-breach/) that Meta has paused an employee productivity-tracking initiative after the program leaked potentially sensitive data about employees — internally. The poetic irony is real: a surveillance system designed to watch workers became the thing that needed watching. Details are thin (Wired's piece is light on specifics), but the pattern is familiar: aggressive internal monitoring creates a large, sensitive data store, and that store becomes a target.

**The squiggles**

Raymond Chen's [quiet tribute](https://devblogs.microsoft.com/oldnewthing/20260622-00/?p=112451) on The Old New Thing marks the passing of the engineer at Microsoft responsible for the red and green squiggles under misspelled words and grammatical problems — one of the most universally recognized UI conventions in computing. It started in Word and spread everywhere. Chen doesn't editorialize much; he doesn't need to. Worth a read for what it is: someone who built an invisible thing that billions of people have come to rely on without thinking about, remembered by a colleague who noticed.

---

The thread to pull next: Valsorda's piece gestures at a larger question — if LLM-generated vuln reports destroy the economics of responsible disclosure, what replaces it? Bounty programs and formal audits have their own problems. Worth watching how maintainer communities respond over the next few months.

**Sources**
- [Fired by Google for creating the Google Workspace CLI (Twitter)](https://twitter.com/JPoehnelt/status/2069482265953087602)
- [HN discussion – Google CLI firing](https://news.ycombinator.com/item?id=48649011)
- [Vulnerability reports are not special anymore – Filippo Valsorda](https://words.filippo.io/vuln-reports/)
- [HN discussion – Vuln reports](https://news.ycombinator.com/item?id=48653216)
- [FUTO Swipe](https://swipe.futo.tech/)
- [FUTO Swipe dataset on HuggingFace](https://huggingface.co/datasets/futo-org/swipe.futo.org)
- [Meta Pauses Employee-Tracking Program – Wired](https://www.wired.com/story/meta-pauses-employee-tracking-program-following-internal-security-breach/)
- [In memory of the man who put red and green squiggles under words – The Old New Thing](https://devblogs.microsoft.com/oldnewthing/20260622-00/?p=112451)
