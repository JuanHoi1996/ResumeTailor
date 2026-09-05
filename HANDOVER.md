# Cursor Agent Handover — ResumeTailor

## 先读什么

1. `README.md`：产品范围、真实性 contract 与运行方式；
2. `docs/archives/`：已确认的 MVP 与连接设置决策；
3. `lib/resume-contract.js`、`app/api/tailor/route.ts`：服务端可验证的证据边界；
4. `app/connection-settings.tsx`、`lib/ai-provider.js`：AI 连接与凭据路径。

## 产品不可变边界

- 这是独立的简历编排工具：输入为 JD、简历文本与可选的用户确认事实；先输出证据/缺口/追问，再输出经历单元级建议。
- `resume_quote` 必须逐字出自简历；`user_confirmed` 必须逐字出自用户确认回答；两种来源绝不能混淆。
- AI 不得编造数字、角色、职责、程度或结果。每条改写都应保有连续 `original`、JD 引用和可追溯来源；不能证实的内容应成为缺口或追问。
- `omit` 仅代表本次不放，不贬低经历。用户手工编辑后的内容需要用户自行在投递前核实。
- 不把“岗位是否值得投”的排序逻辑混进本项目；那是 JobChoiceRanker 的职责。

## AI 连接与安全边界

- 前端连接设置保存在浏览器 `sessionStorage`，仅限当前会话；有 key 时，在本次 `/api/tailor` 请求里临时传给服务端。
- 服务端不得持久化或记录 key、JD、简历或用户确认事实；不要把任何 key 放进 `NEXT_PUBLIC_*`。
- 浏览器会话连接优先于 `.env.local` / 部署环境；没有浏览器 key 时才读取环境变量。
- 目前只支持 DeepSeek 与 OpenAI，且 API 端点固定。不要随意添加 Base URI 输入或任意 upstream URL。
- 默认配置：DeepSeek `deepseek-v4-flash` + `max` reasoning；OpenAI 走 Responses API。provider 相关修改应同步更新 `.env.example`、README 与 `tests/ai-provider.test.mjs`。

## 代码地图

- `app/page.tsx`：JD/简历输入、经历取舍与请求发起；
- `app/extract-resume.ts`：浏览器侧 `.docx` / `.pdf` 文本提取；
- `app/connection-settings.tsx`：连接设置 UI / sessionStorage；
- `app/api/tailor/route.ts`：请求拆分、模型调用、contract 校验；
- `lib/resume-contract.js`：证据、改写和来源不变量；
- `lib/ai-provider.js`：固定提供商适配器、超时和 JSON 输出；
- `tests/*.test.mjs`：contract 与 provider 单测。

## 开发与交付

```powershell
pnpm install
pnpm test
pnpm build
pnpm dev
```

- 每次改动后至少运行相关测试；改 API、类型、页面、文件提取或 provider 时运行 `pnpm build`。
- PDF / DOCX 只保证文本提取，不保证扫描件、复杂分栏、图片文字或原始版式；改动提取逻辑时要用脱敏样本人工核对。
- 不提交 `.env.local`、实际 key、真实 JD、个人简历、`node_modules` 或 `.next`。
- 有独立的产品/架构决策时，在 `docs/archives/YYYY-MM-DD-<topic>.md` 归档，写清目标、决策、非目标和验证方式。
- 当前主分支已推送到 GitHub；开始工作先确认 `git status --short --branch`，保留他人未提交修改。

## 当前已验证基线

- `main` 的浏览器会话连接设置提交：`5a61f73`；
- `pnpm test`：5/5 通过；
- `pnpm build`：通过（`/` 与 `/api/tailor`）。
