"use client";

import { useEffect, useState } from "react";

export type AiConnection = {
  provider: "deepseek" | "openai";
  apiKey: string;
  model: string;
  reasoningEffort: "high" | "max";
};

const STORAGE_KEY = "resume-tailor.ai-connection.v1";

const defaults = (): AiConnection => ({
  provider: "deepseek",
  apiKey: "",
  model: "deepseek-v4-flash",
  reasoningEffort: "max",
});

export function useAiConnection() {
  const [connection, setConnection] = useState<AiConnection>(defaults);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const candidate = JSON.parse(stored);
      if (
        (candidate?.provider === "deepseek" ||
          candidate?.provider === "openai") &&
        typeof candidate.apiKey === "string"
      ) {
        setConnection({
          provider: candidate.provider,
          apiKey: candidate.apiKey,
          model:
            typeof candidate.model === "string" && candidate.model.trim()
              ? candidate.model
              : candidate.provider === "deepseek"
                ? "deepseek-v4-flash"
                : "gpt-5.6-terra",
          reasoningEffort:
            candidate.reasoningEffort === "high" ? "high" : "max",
        });
      }
    } catch {
      /* Ignore a malformed browser-only session value. */
    }
  }, []);

  useEffect(() => {
    try {
      if (connection.apiKey.trim())
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Session storage may be unavailable. */
    }
  }, [connection]);

  return [connection, setConnection] as const;
}

export function ConnectionSettings({
  connection,
  setConnection,
}: {
  connection: AiConnection;
  setConnection: (next: AiConnection) => void;
}) {
  const update = (patch: Partial<AiConnection>) =>
    setConnection({ ...connection, ...patch });
  const switchProvider = (provider: AiConnection["provider"]) =>
    update({
      provider,
      model: provider === "deepseek" ? "deepseek-v4-flash" : "gpt-5.6-terra",
      reasoningEffort: provider === "deepseek" ? "max" : "high",
    });

  return (
    <details className="connection" open={!connection.apiKey.trim()}>
      <summary>
        <span>AI 连接设置</span>
        <small>
          {connection.apiKey.trim()
            ? `当前会话已配置 ${connection.provider === "deepseek" ? "DeepSeek" : "OpenAI"}`
            : "填写 key，或使用服务端环境配置"}
        </small>
      </summary>
      <div className="connection-body">
        <p>
          Key
          只保存在当前浏览器会话中；每次分析时临时发给服务端调用，不写入项目文件、数据库或运行日志。
        </p>
        <div className="connection-grid">
          <label>
            提供商
            <select
              value={connection.provider}
              onChange={(event) =>
                switchProvider(event.target.value as AiConnection["provider"])
              }
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label>
            模型
            <input
              value={connection.model}
              onChange={(event) => update({ model: event.target.value })}
              placeholder={
                connection.provider === "deepseek"
                  ? "deepseek-v4-flash"
                  : "gpt-5.6-terra"
              }
            />
          </label>
          <label className="connection-key">
            API Key
            <input
              type="password"
              autoComplete="off"
              value={connection.apiKey}
              onChange={(event) => update({ apiKey: event.target.value })}
              placeholder={
                connection.provider === "deepseek"
                  ? "DeepSeek API Key"
                  : "OpenAI API Key"
              }
            />
          </label>
          {connection.provider === "deepseek" && (
            <label>
              推理强度
              <select
                value={connection.reasoningEffort}
                onChange={(event) =>
                  update({
                    reasoningEffort: event.target
                      .value as AiConnection["reasoningEffort"],
                  })
                }
              >
                <option value="max">max（更充分推理）</option>
                <option value="high">high（更快）</option>
              </select>
            </label>
          )}
        </div>
        {connection.apiKey.trim() && (
          <button
            className="connection-clear"
            type="button"
            onClick={() => setConnection(defaults())}
          >
            清除当前会话 key
          </button>
        )}
      </div>
    </details>
  );
}
