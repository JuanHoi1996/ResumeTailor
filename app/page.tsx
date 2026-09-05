"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { extractResumeText } from "./extract-resume";
import { ConnectionSettings, useAiConnection } from "./connection-settings";
type Fact = { question: string; answer: string };
type Suggestion = {
  title: string;
  placement: string;
  action: string;
  original: string;
  revised: string;
  sourceEvidence: string[];
  confirmedEvidence: string[];
  jdEvidence: string;
  reason: string;
  selected: boolean;
};
type Analysis = {
  summary: string;
  matches: {
    title: string;
    source: string;
    evidence: string;
    jdEvidence: string;
    explanation: string;
  }[];
  gaps: {
    title: string;
    jdEvidence: string;
    reason: string;
    question: string;
  }[];
  questions: { question: string; why: string; jdEvidence: string }[];
  suggestions: Omit<Suggestion, "selected">[];
  omit: { title: string; original: string; reason: string }[];
};
const rank: Record<string, number> = { 前置: 0, 中位: 1, 后置: 2 };
const isResumeFile = (file: File) => /\.(docx|pdf)$/i.test(file.name);
const draggingFiles = (event: { dataTransfer: DataTransfer }) =>
  Array.from(event.dataTransfer.types).includes("Files");
export default function Home() {
  const [connection, setConnection] = useAiConnection();
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const [resumeDragging, setResumeDragging] = useState(false);
  const resumeDragDepth = useRef(0);
  const importFile = async (file?: File) => {
    if (!file) return;
    setFileMessage("正在提取文本…");
    try {
      const text = await extractResumeText(file);
      if (text.length < 80)
        throw new Error("提取文本过短，请核对文件或改为粘贴。 ");
      setResumeText(text);
      setFileMessage(
        `已从 ${file.name} 提取 ${text.length} 字；请在下方核对后再分析。`,
      );
    } catch (e) {
      setFileMessage(e instanceof Error ? e.message : "文件解析失败");
    }
  };
  const takeDroppedResume = (files: FileList) => {
    const file = [...files].find(isResumeFile);
    if (file) {
      void importFile(file);
      return;
    }
    if (files.length) setFileMessage("仅支持 .docx / .pdf，或直接粘贴简历文本。");
  };
  useEffect(() => {
    const preventNavigate = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", preventNavigate);
    window.addEventListener("drop", preventNavigate);
    return () => {
      window.removeEventListener("dragover", preventNavigate);
      window.removeEventListener("drop", preventNavigate);
    };
  }, []);
  const run = async () => {
    setBusy(true);
    setError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jdText, resumeText, userConfirmed: facts, connection: connection.apiKey.trim() ? connection : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const next = payload.analysis as Analysis;
      setAnalysis(next);
      setSuggestions(
        next.suggestions.map((item) => ({ ...item, selected: true })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败");
    } finally {
      setBusy(false);
    }
  };
  const ordered = useMemo(
    () =>
      [...suggestions]
        .filter((item) => item.selected)
        .sort((a, b) => rank[a.placement] - rank[b.placement]),
    [suggestions],
  );
  const copy = async () => {
    const text = [
      "# 本次投递版经历区（草稿）",
      "",
      "以下改写保留来源标记；请在投递前核对用户编辑。",
      "",
      ...ordered.flatMap((item, i) => [
        `## ${i + 1}. [${item.placement}] ${item.title}`,
        item.revised,
        "",
        `证据：${item.sourceEvidence.join(" / ")}`,
        item.confirmedEvidence.length
          ? `用户确认：${item.confirmedEvidence.join(" / ")}`
          : "",
        "",
      ]),
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text);
  };
  return (
    <main>
      <header>
        <p className="eyebrow">GROUNDED RESUME TAILOR</p>
        <h1>这份 JD 下，这份简历该讲哪几段经历？</h1>
        <p>
          先看证据、弱证据、缺口与追问；再决定经历单元的保留、顺序、改写与取舍。AI
          只能使用简历原文或你明确确认的事实。
        </p>
      </header>
      <ConnectionSettings connection={connection} setConnection={setConnection} />
      <div className="grid">
        <section className="panel">
          <h2>1. JD</h2>
          <textarea
            rows={15}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="粘贴完整 JD 原文…"
          />
        </section>
        <section
          className={`panel resume-drop${resumeDragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            resumeDragDepth.current += 1;
            setResumeDragging(true);
          }}
          onDragOver={(event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            resumeDragDepth.current -= 1;
            if (resumeDragDepth.current <= 0) {
              resumeDragDepth.current = 0;
              setResumeDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            resumeDragDepth.current = 0;
            setResumeDragging(false);
            takeDroppedResume(event.dataTransfer.files);
          }}
        >
          <h2>2. 简历</h2>
          <label className="upload">
            {resumeDragging ? "松开即可提取文本" : "拖入或选择 .docx / .pdf"}
            <input
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {fileMessage && <small>{fileMessage}</small>}
          <textarea
            rows={13}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="上传后核对文本，或直接粘贴简历正文…"
          />
        </section>
      </div>
      <section className="panel">
        <h2>可选：用户已确认事实</h2>
        <p>
          只有你明确确认的回答才会作为 <code>user_confirmed</code>{" "}
          传给模型；它绝不会伪装成简历原文。
        </p>
        <div className="facts">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="对应哪个追问？"
          />
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="你确认的事实"
          />
          <button
            onClick={() => {
              if (question.trim() && answer.trim()) {
                setFacts((all) => [
                  ...all,
                  { question: question.trim(), answer: answer.trim() },
                ]);
                setQuestion("");
                setAnswer("");
              }
            }}
          >
            确认并加入
          </button>
        </div>
        {facts.map((fact, i) => (
          <p className="fact" key={`${fact.question}-${i}`}>
            <b>user_confirmed</b> · {fact.answer}
            <button
              onClick={() => setFacts((all) => all.filter((_, n) => n !== i))}
            >
              移除
            </button>
          </p>
        ))}
      </section>
      <button
        className="primary"
        disabled={
          busy || jdText.trim().length < 20 || resumeText.trim().length < 80
        }
        onClick={run}
      >
        {busy ? "正在完成证据核对与经历编排…" : "开始事实受限分析"}
      </button>
      {error && <p className="error">{error}</p>}
      {analysis && (
        <section className="results">
          <h2>Step 1 · 证据与追问</h2>
          <p>{analysis.summary}</p>
          <div className="three">
            <article className="panel">
              <h3>已有证据</h3>
              {analysis.matches.map((item, i) => (
                <div key={i}>
                  <b>{item.title}</b>
                  <p>
                    <code>{item.source}</code>：{item.evidence}
                  </p>
                  <small>JD：“{item.jdEvidence}”</small>
                </div>
              )) || <p>未返回可靠证据。</p>}
            </article>
            <article className="panel">
              <h3>证据缺口</h3>
              {analysis.gaps.map((item, i) => (
                <div key={i}>
                  <b>{item.title}</b>
                  <p>{item.reason}</p>
                  <small>JD：“{item.jdEvidence}”</small>
                </div>
              )) || <p>未返回缺口。</p>}
            </article>
            <article className="panel">
              <h3>具体追问</h3>
              {analysis.questions.map((item, i) => (
                <div key={i}>
                  <b>{item.question}</b>
                  <p>{item.why}</p>
                  <small>JD：“{item.jdEvidence}”</small>
                </div>
              )) || <p>暂无追问。</p>}
            </article>
          </div>
          <div className="section-head">
            <div>
              <h2>Step 2 · 投递版经历编排</h2>
              <p>
                选择、排序、编辑后复制草稿；手工编辑内容须由你在投递前核实。
              </p>
            </div>
            <button onClick={() => void copy()}>复制已选草稿</button>
          </div>
          {suggestions.map((item, index) => (
            <article
              className="panel suggestion"
              key={`${item.title}-${index}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) =>
                    setSuggestions((all) =>
                      all.map((row, i) =>
                        i === index
                          ? { ...row, selected: e.target.checked }
                          : row,
                      ),
                    )
                  }
                />{" "}
                本次保留
              </label>
              <select
                value={item.placement}
                onChange={(e) =>
                  setSuggestions((all) =>
                    all.map((row, i) =>
                      i === index ? { ...row, placement: e.target.value } : row,
                    ),
                  )
                }
              >
                <option>前置</option>
                <option>中位</option>
                <option>后置</option>
              </select>
              <b>
                {item.title} · {item.action}
              </b>
              <small>JD：“{item.jdEvidence}”</small>
              <div className="diff">
                <div>
                  <strong>原文经历块</strong>
                  <p>{item.original}</p>
                </div>
                <div>
                  <strong>投递版（可编辑）</strong>
                  <textarea
                    value={item.revised}
                    onChange={(e) =>
                      setSuggestions((all) =>
                        all.map((row, i) =>
                          i === index
                            ? { ...row, revised: e.target.value }
                            : row,
                        ),
                      )
                    }
                    rows={8}
                  />
                </div>
              </div>
              <p>理由：{item.reason}</p>
              <small>resume_quote：{item.sourceEvidence.join(" / ")}</small>
              {item.confirmedEvidence.length > 0 && (
                <small>
                  user_confirmed：{item.confirmedEvidence.join(" / ")}
                </small>
              )}
            </article>
          ))}
          {analysis.omit.length > 0 && (
            <article className="panel">
              <h3>本次建议不放</h3>
              {analysis.omit.map((item, i) => (
                <p key={i}>
                  <b>{item.title}</b>：{item.reason}
                </p>
              ))}
            </article>
          )}
        </section>
      )}
    </main>
  );
}
