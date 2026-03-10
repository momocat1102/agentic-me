# Agentic Me

[English](README.md) | 繁體中文

一套建立在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 之上的個人 AI Agent 系統。將你的 Claude Code CLI 打造成具備持久記憶、專家模式、專案追蹤、自動背景執行的多 Agent 生產力系統。

## 功能特色

**Central Command** — 儀表板 + REST API，管理 Agent、任務、專案
- 即時 Agent 活動追蹤
- 專案進度儀表板
- 任務歷史紀錄與分析
- WebSocket 即時更新

**專家模式** — 用 `/switch` 在 9 種 AI 專家角色之間切換
- AI 工程師、研究員、全端工程師、簡報專家、除錯專家、程式碼審查、數據分析師、論文寫手、UI/UX 設計師

**記憶系統** — 跨 Session 的持久知識儲存，基於 [memcp](https://github.com/mohamedali/memcp)
- 圖資料庫儲存，支援 BM25 + 語意搜尋
- Context 壓縮前自動知識提取
- 長對話漸進式記憶提醒
- 記憶範圍：全域（跨專案）與專案專屬

**夜班模式** — 自動背景任務執行
- 在 tmux session 中啟動長時間任務
- Circuit Breaker：連續失敗自動停止
- 儀表板即時監控

**Slash Commands** — 9 個生產力指令
| 指令 | 說明 |
|------|------|
| `/kickoff` | 建立新專案（資料夾 + CLAUDE.md + 註冊） |
| `/switch <expert>` | 切換專家模式，自動收尾 |
| `/progress` | 查看與更新專案進度 |
| `/done` | 結束工作，回報進度 + 知識提取 |
| `/review` | 每日/每週工作回顧 |
| `/overview` | 所有專案進度總覽 |
| `/standup` | 每日站會：昨天回顧 + 今天計畫 |
| `/night-shift` | 啟動自動背景任務 |
| `/night-report` | 檢視夜班執行結果 |

**13 個 Subagent** — 派遣專門 Agent 處理獨立任務
- AI 工程師、除錯器、程式碼審查、研究分析師、專案管理、Python 專家、科學研究員、簡報製作、技術寫手、品質檢查、重構專家、進度回顧、網路搜尋

## 快速開始

### 前置需求
- **Node.js** 20+（最低 18）
- **Python** 3.10+
- **Claude Code CLI**（[安裝指南](https://docs.anthropic.com/en/docs/claude-code)）

### 安裝

```bash
git clone https://github.com/user/agentic-me.git
cd agentic-me
bash scripts/setup.sh
```

安裝腳本會自動：
1. 安裝 npm 依賴並建置 server
2. 建立 Python venv 並安裝 memcp
3. 將 slash commands、專家模式、agents、hooks 複製到 `~/.claude/`
4. 註冊 MCP servers（Central Command + memcp）
5. 設定 Claude Code 的 hooks

### 啟動 Central Command

```bash
bash start.sh
```

- 儀表板：http://localhost:3000
- API：http://localhost:4000

### 驗證安裝

開啟新的 Claude Code session，你應該會看到：
- 啟動時注入記憶（如果有已儲存的記憶）
- `/overview` 指令可用
- `/switch ai-engineer` 載入專家模式
- memcp 工具可呼叫（`memcp_ping`）

## 架構

```
┌─────────────────────────────────────────────────────┐
│                    Claude Code CLI                    │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │Commands │  │ Experts  │  │ Agents │  │ Hooks  │ │
│  │ 9 .md   │  │ 9 .md    │  │13 .md  │  │ 6 .sh  │ │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └───┬────┘ │
│       │            │            │            │       │
│  ┌────┴────────────┴────────────┴────────────┴────┐ │
│  │              MCP Servers                        │ │
│  │  ┌──────────────────┐  ┌─────────────────┐     │ │
│  │  │ Central Command  │  │     memcp       │     │ │
│  │  │ (Node.js)        │  │   (Python)      │     │ │
│  │  └────────┬─────────┘  └────────┬────────┘     │ │
│  └───────────┼─────────────────────┼──────────────┘ │
└──────────────┼─────────────────────┼────────────────┘
               │                     │
        ┌──────┴──────┐       ┌──────┴──────┐
        │  SQLite DB  │       │  Graph DB   │
        │  (tasks,    │       │  (memories, │
        │   projects) │       │   contexts) │
        └──────┬──────┘       └─────────────┘
               │
        ┌──────┴──────┐
        │  Dashboard  │
        │  (Next.js)  │
        │  :3000      │
        └─────────────┘
```

## 設定

### 新增 Agent

1. 編輯 `agents.json` — 加入 `id`、`name`、`role`、`path`
2. Agent 會自動出現在儀表板

### 新增專家模式

1. 建立 `~/.claude/experts/my-expert.md`
2. 在 `agents.json` 的 `experts` 陣列中加入條目
3. 用 `/switch my-expert` 啟動

### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `CC_PORT` | `4000` | Central Command API port |
| `CC_WS_PORT` | `4001` | WebSocket port |
| `CC_API_URL` | `http://localhost:4000` | API URL（hooks 使用） |
| `WORKSPACE_DIR` | `$HOME/workspace` | 專案資料夾位置 |
| `MEMCP_DATA_DIR` | `$HOME/.memcp` | memcp 資料目錄 |
| `AGENTIC_ME_DIR` | （安裝時設定） | Repo 安裝路徑 |

## 解除安裝

```bash
bash scripts/uninstall.sh
```

移除 Claude 設定檔、MCP 條目、hooks 和環境變數。Repo 目錄會保留。

## 致謝

- **memcp** — 記憶系統，作者 [Mohamed ali May](https://github.com/mohamedali/memcp)，MIT 授權
- 基於 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic 開發

## 授權

MIT — 見 [LICENSE](LICENSE)
