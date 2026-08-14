const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

export class AiConfigurationError extends Error {}
export class AiUpstreamError extends Error {}

export function getAiConfiguration(environment = process.env) {
  const provider = String(environment.AI_PROVIDER || "deepseek").trim().toLowerCase();
  if (provider === "deepseek") {
    const apiKey = String(environment.DEEPSEEK_API_KEY || "").trim();
    if (!apiKey) throw new AiConfigurationError("服务端尚未配置 DEEPSEEK_API_KEY。");
    const effort = String(environment.DEEPSEEK_REASONING_EFFORT || "max").trim().toLowerCase();
    if (effort !== "high" && effort !== "max") {
      throw new AiConfigurationError("DEEPSEEK_REASONING_EFFORT 必须是 high 或 max。");
    }
    return { provider, apiKey, model: String(environment.DEEPSEEK_MODEL || "deepseek-v4-flash"), effort };
  }
  if (provider === "openai") {
    const apiKey = String(environment.OPENAI_API_KEY || "").trim();
    if (!apiKey) throw new AiConfigurationError("服务端尚未配置 OPENAI_API_KEY。");
    return { provider, apiKey, model: String(environment.OPENAI_MODEL || "gpt-5.6-terra"), effort: "low" };
  }
  throw new AiConfigurationError("AI_PROVIDER 必须是 deepseek 或 openai。");
}

const outputText = (payload) => {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
};

const deepSeekPrompt = (systemPrompt, schema) => `${systemPrompt}\n\n输出要求：只输出一个合法 JSON 对象，不要输出 Markdown、解释或代码块。该 JSON 必须完全符合以下 JSON Schema：\n${JSON.stringify(schema)}`;

export async function completeJson({ systemPrompt, userPrompt, schema, schemaName, maxOutputTokens }) {
  const config = getAiConfiguration();
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 600000);
  const signal = AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs >= 10000 ? timeoutMs : 600000);

  if (config.provider === "openai") {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        store: false,
        reasoning: { effort: config.effort },
        input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
      }),
      signal,
    });
    if (!response.ok) throw new AiUpstreamError(`模型服务暂不可用（${response.status}）。`);
    const text = outputText(await response.json());
    if (!text) throw new AiUpstreamError("模型没有返回可用结果。");
    return { text, provider: config.provider, model: config.model };
  }

  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: deepSeekPrompt(systemPrompt, schema) }, { role: "user", content: userPrompt }],
      thinking: { type: "enabled" },
      reasoning_effort: config.effort,
      response_format: { type: "json_object" },
      max_tokens: maxOutputTokens,
      stream: false,
    }),
    signal,
  });
  if (!response.ok) throw new AiUpstreamError(`模型服务暂不可用（${response.status}）。`);
  const payload = await response.json();
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
  const text = typeof choice?.message?.content === "string" ? choice.message.content : "";
  if (choice?.finish_reason === "length" || !text) throw new AiUpstreamError("模型输出被截断或为空，请重试或提高输出 token 上限。");
  return { text, provider: config.provider, model: config.model };
}
