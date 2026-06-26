import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export interface GatewayEnv {
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  CF_AIG_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
}

/** Build an Anthropic model routed through the Cloudflare AI Gateway. */
export function model(id: string, env: GatewayEnv): LanguageModel {
  if (!env.CF_AIG_TOKEN && !env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Set CF_AIG_TOKEN (BYOK gateway) or ANTHROPIC_API_KEY to call the gateway."
    );
  }
  const baseURL =
    `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}` +
    `/${env.AI_GATEWAY_ID}/anthropic/v1`;
  const anthropic = createAnthropic({
    apiKey: env.ANTHROPIC_API_KEY ?? "",
    baseURL,
    headers: env.CF_AIG_TOKEN
      ? { "cf-aig-authorization": `Bearer ${env.CF_AIG_TOKEN}` }
      : undefined,
  });
  return anthropic(id);
}

/**
 * providerOptions to mark a system prompt prefix as ephemeral-cacheable.
 * Pass to generateText as `providerOptions: cacheControl` so the repeated static
 * prefix (house rules + persona + memory) is prompt-cached — the main cost win.
 *
 * Shape confirmed against @ai-sdk/anthropic v3: AnthropicLanguageModelOptions
 * has `cacheControl?: { type: "ephemeral"; ttl?: "5m" | "1h" }`.
 */
export const cacheControl = {
  anthropic: { cacheControl: { type: "ephemeral" } },
} as const;
