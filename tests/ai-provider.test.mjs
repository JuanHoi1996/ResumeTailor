import assert from "node:assert/strict";
import test from "node:test";
import { AiConfigurationError, getAiConfiguration } from "../lib/ai-provider.js";

test("defaults to DeepSeek V4 Flash with max reasoning", () => {
  assert.deepEqual(getAiConfiguration({ DEEPSEEK_API_KEY: "test-key" }), {
    provider: "deepseek",
    apiKey: "test-key",
    model: "deepseek-v4-flash",
    effort: "max",
  });
});

test("accepts an explicit OpenAI provider and rejects invalid DeepSeek effort", () => {
  assert.equal(getAiConfiguration({ AI_PROVIDER: "openai", OPENAI_API_KEY: "test-key" }).model, "gpt-5.6-terra");
  assert.throws(
    () => getAiConfiguration({ DEEPSEEK_API_KEY: "test-key", DEEPSEEK_REASONING_EFFORT: "low" }),
    AiConfigurationError,
  );
});

test("uses a transient browser connection instead of server environment credentials", () => {
  assert.deepEqual(getAiConfiguration(
    { AI_PROVIDER: "openai", OPENAI_API_KEY: "server-key" },
    { provider: "deepseek", apiKey: "browser-key", model: "deepseek-v4-flash", reasoningEffort: "max" },
  ), { provider: "deepseek", apiKey: "browser-key", model: "deepseek-v4-flash", effort: "max" });
});
