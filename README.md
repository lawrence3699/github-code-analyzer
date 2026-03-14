# CodePrism

[中文版](#中文说明) | [English](#english)

---

<a name="english"></a>

## English

A Next.js-based tool for analyzing and visualizing GitHub repository structure using AI. Paste any public GitHub repo URL and get an interactive workspace with file tree browsing, syntax-highlighted code viewing, and AI-powered analysis that identifies languages, tech stack, entry points, and project summary.

### Features

- **Three-panel resizable workspace** — Draggable split handles between panels; toggle any panel visible/hidden from the header
- **AI-powered analysis** — Detects languages, frameworks, entry files, and generates a project summary (Claude CLI or Codex CLI)
- **File tree browser** — Searchable, collapsible file tree with auto-expand on search match
- **Syntax-highlighted code viewer** — 44+ languages, dark/light theme support (oneDark / oneLight)
- **Dark / Light theme** — Persisted in localStorage, no flash on page load
- **Chinese / English bilingual UI** — Full i18n with locale auto-detection
- **Work log panel** — Collapsible, timestamped logs with JSON detail expansion

### Screenshots

| Dark Mode | Light Mode |
|-----------|------------|
| Three-panel analysis workspace with draggable splitters | Toggle panels, switch themes in one click |

### Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict mode) |
| GitHub API | @octokit/rest |
| AI | Claude CLI (Haiku), Codex CLI (GPT-4o-mini) |
| Highlighting | react-syntax-highlighter (Prism) |
| Icons | lucide-react |
| Testing | Jest + ts-jest (150 tests, 10 suites) |

### Quick Start

```bash
# Clone the repository
git clone https://github.com/<your-username>/github-code-analyzer.git
cd github-code-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 and paste a GitHub repository URL (e.g., `https://github.com/facebook/react`).

### AI Providers

Both providers run via locally installed CLI tools — **no API keys required**.

| Provider | Model | CLI Command |
|----------|-------|-------------|
| Claude (default) | claude-haiku-4-5 | `claude -p --model <m> --output-format json` |
| Codex | GPT-4o-mini | `codex exec --json --skip-git-repo-check -` |

**Prerequisites**: Install [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) or [Codex CLI](https://github.com/openai/codex) and authenticate locally.

### Environment Variables

```env
GITHUB_TOKEN=           # Optional — increases GitHub API rate limit from 60 to 5000 req/hr
AI_PROVIDER=claude      # claude | codex (default: claude)
```

### Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout, inline script for theme
│   ├── page.tsx                    # Landing page with animated background
│   ├── analyze/page.tsx            # Analysis workspace (3-panel resizable)
│   └── api/                        # Server-side API routes
│       ├── github/                 # Repo info, file tree, file content
│       └── ai/analyze/route.ts    # AI analysis endpoint
├── components/
│   ├── landing/                    # Landing page components
│   ├── analyze/                    # Analysis page components
│   │   ├── LeftPanel.tsx           # Input + AI results + logs
│   │   ├── FileTreePanel.tsx       # Searchable file tree
│   │   ├── CodeViewerPanel.tsx     # Syntax-highlighted viewer
│   │   ├── SplitHandle.tsx         # Draggable panel divider
│   │   └── PanelToggle.tsx         # Header panel visibility toggles
│   └── ui/                         # Shared UI primitives
├── hooks/                          # Custom React hooks
│   ├── usePanelLayout.ts           # Panel widths, visibility, drag
│   ├── useTheme.ts                 # Dark/light theme
│   ├── useLocale.ts                # i18n locale
│   └── ...                         # Logger, GitHub, AI analysis
├── lib/                            # Pure utility functions
│   ├── panel-layout.ts             # Panel width/ratio math (97%+ coverage)
│   ├── ai/                         # AI provider system
│   └── ...                         # Validators, file filter, logger
└── i18n/                           # en.json + zh.json translations
```

### Development Commands

```bash
npm run dev            # Dev server (Turbopack)
npm run build          # Production build
npm run lint           # ESLint check
npm test               # Run 150 tests
npm run test:coverage  # Coverage report (core libs 98%+)
```

### Exposing to the Internet

To let others access your local instance:

```bash
# Option 1: ngrok (requires free account)
brew install ngrok
ngrok config add-authtoken <your-token>
npm run dev
ngrok http 3000

# Option 2: Cloudflare Tunnel (no account needed)
brew install cloudflared
npm run dev
cloudflared tunnel --url http://localhost:3000
```

### License

MIT

---

<a name="中文说明"></a>

## 中文说明

基于 Next.js 的 GitHub 仓库代码分析与可视化工具。粘贴任意公开 GitHub 仓库 URL，即可获得交互式工作区，包含文件树浏览、语法高亮代码查看，以及 AI 驱动的分析（识别编程语言、技术栈、入口文件并生成项目摘要）。

### 功能特性

- **三栏可拖拽工作区** — 面板之间可拖拽分割条调整宽度；顶栏按钮可切换任意面板的显示/隐藏
- **AI 智能分析** — 自动检测编程语言、框架、入口文件，生成中文项目摘要（Claude CLI 或 Codex CLI）
- **文件树浏览器** — 可搜索、可折叠的文件树，搜索时自动展开匹配目录
- **语法高亮代码查看** — 支持 44+ 种编程语言，深色/浅色主题切换（oneDark / oneLight）
- **深色 / 浅色主题** — 持久化存储在 localStorage，页面加载无闪烁
- **中英双语界面** — 完整的国际化支持，自动检测浏览器语言
- **工作日志面板** — 可折叠的带时间戳日志，支持 JSON 详情展开

### 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router，Turbopack） |
| 样式 | Tailwind CSS v4 |
| 语言 | TypeScript（严格模式） |
| GitHub API | @octokit/rest |
| AI | Claude CLI（Haiku）、Codex CLI（GPT-4o-mini） |
| 代码高亮 | react-syntax-highlighter（Prism） |
| 图标 | lucide-react |
| 测试 | Jest + ts-jest（150 个测试，10 个测试套件） |

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/<your-username>/github-code-analyzer.git
cd github-code-analyzer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000，粘贴 GitHub 仓库 URL（例如 `https://github.com/facebook/react`）。

### AI 提供商

两个提供商均通过本地安装的 CLI 工具运行——**无需 API 密钥**。

| 提供商 | 模型 | CLI 命令 |
|--------|------|----------|
| Claude（默认） | claude-haiku-4-5 | `claude -p --model <m> --output-format json` |
| Codex | GPT-4o-mini | `codex exec --json --skip-git-repo-check -` |

**前提条件**：安装 [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) 或 [Codex CLI](https://github.com/openai/codex) 并完成本地认证。

### 环境变量

```env
GITHUB_TOKEN=           # 可选 — 提升 GitHub API 速率限制（从 60 到 5000 请求/小时）
AI_PROVIDER=claude      # claude | codex（默认：claude）
```

### 开发命令

```bash
npm run dev            # 开发服务器（Turbopack）
npm run build          # 生产构建
npm run lint           # ESLint 检查
npm test               # 运行 150 个测试
npm run test:coverage  # 覆盖率报告（核心库 98%+）
```

### 暴露到公网

让其他人访问你本地运行的实例：

```bash
# 方案 1：ngrok（需免费注册）
brew install ngrok
ngrok config add-authtoken <你的token>
npm run dev
ngrok http 3000

# 方案 2：Cloudflare Tunnel（无需注册）
brew install cloudflared
npm run dev
cloudflared tunnel --url http://localhost:3000
```

### 许可证

MIT
