# ResumeTailor

一个独立、本地优先的 Web 工具，回答：**这份 JD 下，这份简历到底该讲哪几段经历？**

它不含岗位看板、投递跟踪、账号系统、主站导航或 Word 模板回写。输入是一份 JD、一份简历文本和可选的用户确认事实；输出先给事实证据与缺口，再给经历单元级的投递版建议。

## 最小闭环

1. 粘贴 JD；上传 `.docx` / `.pdf`（提取为文本后由用户核对）或直接粘贴简历；
2. 可选地记录回答过且明确确认的事实；
3. Step 1 查看 `resume_quote` / `user_confirmed` 证据、缺口和具体追问；
4. Step 2 查看建议保留的经历、位置、原文与改写，以及本次 omit；用户能逐段取舍、排序、编辑并复制草稿。

## Contract 与真实性边界

请求：`{ jdText, resumeText, userConfirmed: [{ question, answer }] }`。输出包含：

```text
{ summary, matches, gaps, questions,
  suggestions: [{ title, placement, action, original, revised,
    sourceEvidence, confirmedEvidence, jdEvidence, reason }], omit }
```

- `resume_quote` 必须逐字存在于简历；`user_confirmed` 必须逐字等于用户确认的回答；两者绝不混淆。
- 每个 AI 改写都要有连续的 `original`、JD 原文及可追溯证据。无依据的数字、角色或程度升级会被服务端契约丢弃。
- 用户在浏览器手动编辑后的文本不再是 AI 已校验输出，投递前必须由用户再次确认真实。

## 运行

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
pnpm test
pnpm build
```

默认使用 DeepSeek V4 Flash 的 thinking mode（`deepseek-v4-flash` + `DEEPSEEK_REASONING_EFFORT=max`）；也可通过 `AI_PROVIDER=openai` 切换到 OpenAI。环境变量 key 只由服务器端 `app/api/tailor/route.ts` 读取，绝不能使用 `NEXT_PUBLIC_*`。本项目没有数据库、分析日志或云同步。生产部署还需按实际组织的访问控制与数据保留规则完善保护。

### 在网页中填写 key

首次打开页面会看到“AI 连接设置”。在这里选择 DeepSeek 或 OpenAI，填写模型与 API key 后即可使用；浏览器会话中的连接优先于 `.env.local`。该 key 仅保存在当前浏览器会话的 `sessionStorage`，每次请求时临时传给本项目服务端，服务端不会将其写入文件、数据库或日志。若未填写，应用才使用部署者配置的环境变量。

提供商 API 地址固定为官方 DeepSeek / OpenAI 端点，因此界面没有可填写的 Base URI。

## 文件提取边界

`.docx` 使用 Mammoth 提取纯文本；`.pdf` 使用 pdf.js 提取文本层。扫描件、复杂分栏、图片文字和原始版式可能提取不完整；本工具不回写 Word 模板，也不承诺保留格式。提取后必须核对文本。

## 非目标

- 不做岗位追踪、投递管理、登录、云数据库、主站导航或 Word/PDF 模板导出；
- 不将岗位适配与“值不值得投”合成一个分数；后者由独立的 JobChoiceRanker 处理；
- 不创建 shared package：两个项目目前只通过各自的 JSON contract 保持边界。
