/**
 * Per-article LLM token usage → estimated USD cost.
 *
 * The beat collects raw `usages` (one entry per model pass), tagging each with
 * the model id it knows (the runner only sees a `LanguageModel` object). This
 * module turns those into a `Cost` for the post's frontmatter — generic and
 * optional: no usages → `undefined` → no cost block emitted.
 */

/** Per-model usage as collected by the beat (the model id comes from the desk). */
export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** A per-model line in the cost block. */
export interface CostModel {
  id: string;
  input_tokens: number;
  output_tokens: number;
}

/** The cost summary written into a post's frontmatter. */
export interface Cost {
  usd: number;
  input_tokens: number;
  output_tokens: number;
  models: CostModel[];
}

/** USD price per 1,000,000 tokens, keyed by model id. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
  "claude-fable-5": { input: 10.0, output: 50.0 },
};

const PER = 1_000_000;

/**
 * Sum token usage and estimate cost. Returns `undefined` for empty input (the
 * "not every post has cost" case). Usages for the same model id are merged into
 * one `models` entry. Unknown model ids still count their tokens but add $0 to
 * `usd`. `usd` is rounded to 6 decimals.
 */
export function computeCost(usages: Usage[]): Cost | undefined {
  if (usages.length === 0) return undefined;

  // Merge per model id, preserving first-seen order.
  const byModel = new Map<string, CostModel>();
  for (const u of usages) {
    const entry = byModel.get(u.model);
    if (entry) {
      entry.input_tokens += u.inputTokens;
      entry.output_tokens += u.outputTokens;
    } else {
      byModel.set(u.model, {
        id: u.model,
        input_tokens: u.inputTokens,
        output_tokens: u.outputTokens,
      });
    }
  }

  const models = [...byModel.values()];
  let input_tokens = 0;
  let output_tokens = 0;
  let usd = 0;
  for (const m of models) {
    input_tokens += m.input_tokens;
    output_tokens += m.output_tokens;
    const p = PRICES[m.id];
    if (p) {
      usd += (m.input_tokens * p.input + m.output_tokens * p.output) / PER;
    }
  }

  return {
    usd: Math.round(usd * 1e6) / 1e6,
    input_tokens,
    output_tokens,
    models,
  };
}
