# Browser-session AI connection v0.2

## 目标

降低首次使用门槛：用户不必编辑 `.env.local` 也能在 Web UI 中为一次浏览器会话配置 DeepSeek 或 OpenAI。

## 决策

- 连接设置包含提供商、模型、API key，以及 DeepSeek 的 `high` / `max` 推理强度；默认仍为 `deepseek-v4-flash` + `max`。
- API key 仅保存在浏览器 `sessionStorage`，有 key 时随当前请求临时发送；不写入项目文件、数据库或应用日志。
- 浏览器会话连接优先于服务器环境变量；未填写 key 时才使用 `.env.local` / 部署环境。
- 服务端只接受 DeepSeek 和 OpenAI，并使用固定官方 API 端点；不提供 Base URI 输入以避免将该服务变成任意上游请求入口。

## 非目标

- 不添加账号、持久化连接、多人共享 key、用量管理或供应商代理。
- 不改变“事实受限”的证据 contract 或任何简历改写规则。

## 验证

运行 provider 单元测试与 production build；测试覆盖浏览器会话凭据优先于服务器环境变量。
