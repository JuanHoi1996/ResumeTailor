const clean = (value) => String(value ?? "").trim();
const fold = (value) => clean(value).replace(/[\s\u00a0\u3000]+/gu, " ");
const numericTokens = (value) => clean(value).match(/\d+(?:\.\d+)?%?/gu) ?? [];
const upgradeTerms = ["主导", "牵头", "独立负责", "精通", "熟练", "实时", "显著", "大幅", "成功推动", "全面", "深度参与", "端到端", "从0到1", "从 0 到 1"];
const exactQuote = (source, quote) => { const value = clean(quote); if (!value) return ""; if (String(source).includes(value)) return value; const compactSource = fold(source); const compactQuote = fold(value); return compactQuote && compactSource.includes(compactQuote) ? value : ""; };
const quotes = (source, items, maximum = 8) => [...new Set((Array.isArray(items) ? items : []).map((item) => exactQuote(source, item)).filter(Boolean))].slice(0, maximum);
const evidenceIsGrounded = (evidence, revised) => { const allowedNumbers = new Set(evidence.flatMap(numericTokens)); return numericTokens(revised).every((number) => allowedNumbers.has(number)) && upgradeTerms.every((term) => !revised.includes(term) || evidence.some((quote) => quote.includes(term))); };

export function validateTailorInput(raw) {
  const jdText = clean(raw?.jdText); const resumeText = clean(raw?.resumeText);
  const userConfirmed = (Array.isArray(raw?.userConfirmed) ? raw.userConfirmed : []).flatMap((fact) => { const question = clean(fact?.question); const answer = clean(fact?.answer); return question && answer ? [{ question: question.slice(0, 800), answer: answer.slice(0, 4000) }] : []; }).slice(0, 12);
  if (jdText.length < 20) throw new Error("请粘贴至少 20 字的 JD。 ");
  if (resumeText.length < 80) throw new Error("请提供至少 80 字的简历文本。 ");
  return { jdText: jdText.slice(0, 16000), resumeText: resumeText.slice(0, 40000), userConfirmed };
}

export function validateTailorAnalysis({ resumeText, jdText, userConfirmed }, raw) {
  const confirmed = userConfirmed.map((fact) => fact.answer);
  const evidence = (source, value) => source === "user_confirmed" ? (confirmed.includes(clean(value)) ? clean(value) : "") : exactQuote(resumeText, value);
  const matches = (Array.isArray(raw?.matches) ? raw.matches : []).flatMap((item) => { const source = item?.source === "user_confirmed" ? "user_confirmed" : "resume_quote"; const quote = evidence(source, item?.evidence); const jdEvidence = exactQuote(jdText, item?.jdEvidence); return quote && jdEvidence ? [{ title: clean(item?.title) || "已匹配证据", source, evidence: quote, jdEvidence, explanation: clean(item?.explanation) }] : []; }).slice(0, 8);
  const gaps = (Array.isArray(raw?.gaps) ? raw.gaps : []).flatMap((item) => { const jdEvidence = exactQuote(jdText, item?.jdEvidence); return jdEvidence ? [{ title: clean(item?.title) || "证据缺口", jdEvidence, reason: clean(item?.reason) || "当前材料未提供可靠证据。", question: clean(item?.question) }] : []; }).slice(0, 8);
  const questions = (Array.isArray(raw?.questions) ? raw.questions : []).flatMap((item) => { const jdEvidence = exactQuote(jdText, item?.jdEvidence); const question = clean(item?.question); return jdEvidence && question ? [{ question, why: clean(item?.why), jdEvidence }] : []; }).slice(0, 8);
  const suggestions = (Array.isArray(raw?.suggestions) ? raw.suggestions : []).flatMap((item) => { const original = exactQuote(resumeText, item?.original); const sourceEvidence = quotes(resumeText, item?.sourceEvidence); const confirmedEvidence = (Array.isArray(item?.confirmedEvidence) ? item.confirmedEvidence : []).map(clean).filter((value) => confirmed.includes(value)).slice(0, 6); const jdEvidence = exactQuote(jdText, item?.jdEvidence); const revised = clean(item?.revised); const allEvidence = [...new Set([original, ...sourceEvidence, ...confirmedEvidence].filter(Boolean))]; if (!original || !jdEvidence || !revised || !evidenceIsGrounded(allEvidence, revised)) return []; return [{ title: clean(item?.title) || "经历单元", placement: ["前置", "中位", "后置"].includes(clean(item?.placement)) ? clean(item.placement) : "中位", action: ["原文保留", "重写", "压缩"].includes(clean(item?.action)) ? clean(item.action) : "重写", original, revised, sourceEvidence: allEvidence, confirmedEvidence, jdEvidence, reason: clean(item?.reason) }]; }).slice(0, 8);
  const omit = (Array.isArray(raw?.omit) ? raw.omit : []).flatMap((item) => { const original = exactQuote(resumeText, item?.original); return original ? [{ title: clean(item?.title) || "本次不放", original, reason: clean(item?.reason) || "与当前 JD 的相关性较低。" }] : []; }).slice(0, 8);
  return { summary: clean(raw?.summary) || "已完成事实受限的经历级编排。", matches, gaps, questions, suggestions, omit };
}
