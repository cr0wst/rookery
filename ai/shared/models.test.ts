import { describe, it, expect } from "vitest";
import { model, cacheControl } from "./models.js";

const BASE_ENV = {
  AI_GATEWAY_ACCOUNT_ID: "a",
  AI_GATEWAY_ID: "g",
};

describe("model()", () => {
  it("throws when both CF_AIG_TOKEN and ANTHROPIC_API_KEY are absent", () => {
    expect(() => model("claude-haiku-4-5", BASE_ENV)).toThrow();
  });

  it("returns a truthy LanguageModel when CF_AIG_TOKEN is set", () => {
    expect(
      model("claude-haiku-4-5", { ...BASE_ENV, CF_AIG_TOKEN: "t" })
    ).toBeTruthy();
  });

  it("returns a truthy LanguageModel when ANTHROPIC_API_KEY is set", () => {
    expect(
      model("claude-haiku-4-5", { ...BASE_ENV, ANTHROPIC_API_KEY: "sk-test" })
    ).toBeTruthy();
  });
});

describe("cacheControl", () => {
  it("has the expected shape for Anthropic prompt caching", () => {
    expect(cacheControl).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("has anthropic.cacheControl.type === 'ephemeral'", () => {
    expect(cacheControl.anthropic.cacheControl.type).toBe("ephemeral");
  });
});
