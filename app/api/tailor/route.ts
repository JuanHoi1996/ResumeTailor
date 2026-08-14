import { validateTailorAnalysis, validateTailorInput } from "../../../lib/resume-contract.js";
import { completeJson } from "../../../lib/ai-provider.js";

const schema = { type: "object", additionalProperties: false, required: ["summary", "matches", "gaps", "questions", "suggestions", "omit"], properties: { summary: { type: "string" }, matches: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "source", "evidence", "jdEvidence", "explanation"], properties: { title: { type: "string" }, source: { type: "string" }, evidence: { type: "string" }, jdEvidence: { type: "string" }, explanation: { type: "string" } } } }, gaps: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "jdEvidence", "reason", "question"], properties: { title: { type: "string" }, jdEvidence: { type: "string" }, reason: { type: "string" }, question: { type: "string" } } } }, questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "why", "jdEvidence"], properties: { question: { type: "string" }, why: { type: "string" }, jdEvidence: { type: "string" } } } }, suggestions: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "placement", "action", "original", "revised", "sourceEvidence", "confirmedEvidence", "jdEvidence", "reason"], properties: { title: { type: "string" }, placement: { type: "string" }, action: { type: "string" }, original: { type: "string" }, revised: { type: "string" }, sourceEvidence: { type: "array", items: { type: "string" } }, confirmedEvidence: { type: "array", items: { type: "string" } }, jdEvidence: { type: "string" }, reason: { type: "string" } } } }, omit: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "original", "reason"], properties: { title: { type: "string" }, original: { type: "string" }, reason: { type: "string" } } } } } } as const;
const system = `你是事实受限的简历编排助手。先完成 Step 1：从 JD 原文和简历原文中给出证据、弱证据/缺口与具体追问；再完成 Step 2：以完整经历单元给出本次投递版的保留、顺序和改写。绝不编造数字、角色、程度、职责或结果。resume_quote 必须逐字来自简历；user_confirmed 必须逐字来自用户确认事实，二者不得混淆。每条改写必须有连续 original、JD 引用和对应证据。无法证实则列为缺口或追问，不得写入 revised。omit 仅表示本次不放，不贬低经历。只输出 JSON，不输出思维链。`;

export async function POST(request: Request) {
  try {
    const input = validateTailorInput(await request.json());
    const confirmedFacts = input.userConfirmed as { question: string; answer: string }[];
    const confirmed = confirmedFacts.length ? confirmedFacts.map((fact, i) => `${i + 1}. 问：${fact.question}\n答：${fact.answer}`).join("\n") : "（无）";
    const completion = await completeJson({
      systemPrompt: system,
      userPrompt: `【JD 原文】\n${input.jdText}\n\n【简历原文】\n${input.resumeText}\n\n【用户已确认事实】\n${confirmed}`,
      schema,
      schemaName: "grounded_resume_tailor",
      maxOutputTokens: 32000,
    });
    return Response.json({ analysis: validateTailorAnalysis(input, JSON.parse(completion.text)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "请求格式无效。" }, { status: 400 }); }
}
