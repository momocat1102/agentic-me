# Multi-Agent 框架中 Agent 與 Project 分離管理研究報告

> 研究日期：2026-03-07

## Executive Summary

開源 multi-agent 框架在 agent（角色）與 project（專案）的分離設計上，呈現出三大主流模式：(1) **角色定義與任務配置分離**（CrewAI、MetaGPT），(2) **Session Key 定址隔離**（OpenClaw），(3) **圖結構節點化**（LangGraph）。目前尚無框架完美解決「一個 agent 跨多個 project」的需求，但 OpenClaw 的 `agent:<agentId>:<key>` 定址模式和 VS Code 的 Agent HQ 多會話管理提供了值得參考的設計方向。

---

## 1. OpenClaw — 個人 AI Agent 框架

### 基本資訊
- **GitHub Stars**：163,000+（2026年1月底推出，史上成長最快的開源專案之一）
- **授權**：MIT
- **前身**：Clawdbot / Moltbot
- **官網**：https://openclaw.ai/

### 架構（五大元件）
| 元件 | 功能 |
|------|------|
| **Gateway** | 路由來自 Slack/WhatsApp/Telegram 等 12+ 通訊平台的訊息 |
| **Brain** | 使用 ReAct 推理迴圈協調 LLM 呼叫 |
| **Memory** | 以 Markdown 檔案儲存持久化上下文 |
| **Skills** | 外掛能力（shell、瀏覽器自動化、email、日曆等） |
| **Heartbeat** | 排程任務、監控收件匣 |

### Agent 與 Project 的關係
- **單 Agent Runtime 模型**：每個實例運行一個 agent runtime（衍生自 pi-mono）
- **Workspace 為核心**：agent 以單一 workspace 目錄為工作目錄，Bootstrap 檔案（AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md）定義 agent 身份與行為
- **Session Key 定址**：使用 `agent:<agentId>:<key>` 模式實現隔離
  - 例如：`agent:programmer:project-a` 和 `agent:reviewer:project-a`
  - 這個模式同時提供了 **專案隔離、角色分離、可定址性**
- **Agent-to-Agent 通訊**：
  - `agentToAgent` 工具 — 直接 agent 間訊息傳遞
  - `sessions_send()` — 同步或非同步的跨 agent 訊息
  - Webhook 路由 — 外部觸發指定 agent/session

### 工作流引擎（Lobster）
- 使用 **YAML 狀態機** 做確定性排程（而非讓 LLM 決定流程）
- 結構化輸出解析（JSON Schema 驗證）
- 迴圈原語（`maxIterations` + 條件判斷）
- 核心理念：「LLM 做創意工作，程式碼做管線控制」

### 對 Agentic Me 的啟示
- Session Key 的 `agent:role:project` 三段式定址模式非常值得參考
- 單 agent runtime + workspace 隔離的設計簡潔
- Lobster 的確定性工作流思路（YAML 狀態機）可用於取代純 LLM 路由

---

## 2. MetaGPT — 軟體公司模擬

### 架構特色
- 模擬真實軟體公司的 **SOP（標準作業流程）**
- 五個預定義角色：Product Manager、Architect、Project Manager、Engineer、QA Engineer
- 每個 agent 有明確的角色定義，透過 **結構化輸出** 串接下一個 agent

### Agent-Project 關係
- **一個 project = 一整條 SOP pipeline**
- Agent 角色是固定的（與 project 綁定）
- 輸入一行需求，輸出完整的 PRD / 設計 / 任務分解 / 程式碼 / 文件
- **不支援** 一個 agent 跨多個 project

### 設計模式：Assembly Line（裝配線）
```
需求 -> Product Manager -> Architect -> Project Manager -> Engineer -> QA
         (PRD)           (設計)       (任務分解)        (程式碼)    (測試)
```
- 每個 agent 的輸出是下一個 agent 的輸入
- 嚴格的單向流動，不支援動態路由

---

## 3. CrewAI — 角色協作框架

### 核心三層抽象
| 概念 | 說明 |
|------|------|
| **Agent** | 虛擬實體，有 role、goal、backstory |
| **Task** | Agent 執行的動作，有 description 和 expected_output |
| **Crew** | Agent + Task 的集合，定義執行流程 |

### Agent-Project 分離設計
- **YAML 配置分離**：agents.yaml 和 tasks.yaml 獨立定義
- **@CrewBase 裝飾器**：將定義與組裝乾淨分離
- **Flow 控制**：確定性骨幹（Flow）+ 不同層級的 agent 呼叫
- 每個 agent 在 Flow 定義的邊界內運作，不是自由漫遊

### 進階架構模式
```
Flow（確定性骨幹）
  |-- Step 1: 單一 LLM 呼叫
  |-- Step 2: 單一 Agent
  |-- Step 3: 完整 Crew（多 Agent 協作）
  |-- Step 4: 單一 LLM 呼叫
```

### 已知問題
- Agent 與 Task 的抽象邊界不夠清晰（社群有討論）
- Goal 與 Backstory 的分離也有混淆
- **不原生支援** 一個 agent 跨多個 project

---

## 4. LangGraph — 圖結構工作流

### 核心設計
- 以 **有向圖** 組織 agent 工作流
- 節點（Node）= Agent 或工具呼叫
- 邊（Edge）= 條件分支、循環、並行

### 關鍵 Orchestration Pattern

#### Supervisor 模式
```
Supervisor Agent
  |-- Agent A（專門任務）
  |-- Agent B（專門任務）
  |-- Agent C（專門任務）
```
- Supervisor 維護全域狀態，分派任務給專門 agent
- 每個 agent 有獨立的 scratchpad

#### 其他模式
- **Sequential**：線性流水線
- **Scatter-Gather**：並行處理後合併
- **Branching**：條件分支
- **Looping**：迭代直到滿足條件

### Agent-Project 關係
- Agent 定義為圖的節點，與 project 隸屬於同一個 StateGraph
- **共享持久化狀態**（Checkpointing）是其最大特色
- 適合需要動態調整的複雜工作流
- 不原生提供 project 層級的抽象

---

## 5. OpenAI Swarm / Agents SDK — Handoff 模式

### 核心概念
- **Agent**：封裝 instructions 和 functions
- **Handoff**：agent 之間傳遞控制權的特殊函數
- 輕量級，延遲最低

### 設計特色
- Agent 間透過 function call 做 handoff，不需要中央 supervisor
- 開發者必須明確定義 agent 互動路徑
- 與 OpenAI 模型綁定（vendor lock-in）

---

## 6. VS Code Agent HQ — IDE 層級的多 Agent 管理

### 2026 年的重大進展
- VS Code v1.109（2026年1月）引入多 Agent 協調
- 支援 GitHub Copilot、Claude、Codex 並行運作

### Agent-Project 關係管理
- **Agent HQ**：統一管理多個 agent session
- **Agent Sessions View**：在一個介面看所有 local / background / cloud agent sessions
- **Subagent 模式**：coordinator agent 委派工作給 specialist worker agents
- **Git Worktree 隔離**：每個 agent 用獨立的 worktree，避免衝突

### 工作空間隔離策略
```
Project Repo
  |-- main worktree (開發者)
  |-- worktree-agent-1 (Agent A 的隔離工作區)
  |-- worktree-agent-2 (Agent B 的隔離工作區)
```

---

## 7. 綜合比較：Agent-Project 分離模式

### 模式一：角色定義與任務配置分離（CrewAI, MetaGPT）
| 特性 | 說明 |
|------|------|
| Agent 定義 | YAML / Class，含 role, goal, backstory |
| Task 定義 | 獨立的 YAML / Class，含 description, expected_output |
| Project 概念 | = 一個 Crew / Pipeline 的執行實例 |
| 一 Agent 多 Project | 不原生支援，需要手動實例化多個 Crew |
| 一 Project 多 Agent | 原生支援（Crew 內含多個 Agent） |

### 模式二：Session Key 定址隔離（OpenClaw）
| 特性 | 說明 |
|------|------|
| Agent 定義 | Workspace 內的 Bootstrap 檔案 |
| Task 定義 | 透過訊息觸發或 Heartbeat 排程 |
| Project 概念 | Session Key 的第三段（`agent:role:project-id`） |
| 一 Agent 多 Project | 可行（同一 agentId 搭配不同 key） |
| 一 Project 多 Agent | 可行（同一 key 搭配不同 agentId） |

### 模式三：圖結構節點化（LangGraph）
| 特性 | 說明 |
|------|------|
| Agent 定義 | 圖的節點函數 |
| Task 定義 | 圖的邊和條件邏輯 |
| Project 概念 | = 一個 StateGraph 實例 |
| 一 Agent 多 Project | 節點函數可重用，但狀態不共享 |
| 一 Project 多 Agent | 原生支援（多節點） |

### 模式四：Handoff 鏈（OpenAI Swarm）
| 特性 | 說明 |
|------|------|
| Agent 定義 | instructions + functions |
| Task 定義 | 隱含在 handoff 路徑中 |
| Project 概念 | 無明確抽象 |
| 一 Agent 多 Project | 無原生支援 |
| 一 Project 多 Agent | 透過 handoff 鏈實現 |

---

## 8. 對 Agentic Me 系統的設計建議

### 目前 Agentic Me 的架構
- `agents.json` 註冊 agent
- Central Command 管理狀態和任務
- 每個 agent 是一個 Claude Code 實例，有獨立的 CLAUDE.md

### 可借鑑的設計模式

#### 1. OpenClaw 的 Session Key 定址（最值得參考）
```
// 現有：agent 和 project 沒有明確的定址關係
// 建議：引入類似 agent:role:project 的定址模式
{
  "agentId": "system-agent",
  "projectId": "system-agent",
  "sessionKey": "agent:system-agent:system-agent"
}
```

#### 2. CrewAI 的 YAML 配置分離
```yaml
# agents.yaml - 角色定義（跨 project 可重用）
system-agent:
  role: "系統管理者"
  goal: "維護 Agentic Me 基礎設施"
  tools: [bash, file-ops, mcp]

# projects.yaml - 專案配置（獨立於 agent）
system-agent-project:
  name: "System Agent"
  workspace: "/mnt/d/WorkSpace/system-agent"
  assigned_agents: ["system-agent"]
```

#### 3. LangGraph 的 Supervisor 模式
- Central Command 本質上已經是 Supervisor
- 可以加入更明確的任務分派和狀態追蹤圖

#### 4. VS Code 的 Git Worktree 隔離
- 多個 agent 同時在同一 repo 工作時，用 worktree 避免衝突

---

## Sources and References

1. [OpenClaw 官網](https://openclaw.ai/)
2. [OpenClaw Agent Runtime 文件](https://docs.openclaw.ai/concepts/agent)
3. [OpenClaw AGENTS.md (GitHub)](https://github.com/openclaw/openclaw/blob/main/AGENTS.md)
4. [Milvus - OpenClaw 完整指南](https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md)
5. [OpenClaw 多 Agent Pipeline 實作 (DEV)](https://dev.to/ggondim/how-i-built-a-deterministic-multi-agent-dev-pipeline-inside-openclaw-and-contributed-a-missing-4ool)
6. [Medium - OpenClaw 架構解析](https://medium.com/@cenrunzhe/openclaw-explained-how-the-hottest-agent-framework-works-and-why-data-teams-should-pay-attention-69b41a033ca6)
7. [OpenHands Software Agent SDK (arXiv)](https://arxiv.org/abs/2511.03690)
8. [OpenHands 官網](https://openhands.dev/)
9. [MetaGPT GitHub](https://github.com/FoundationAgents/MetaGPT)
10. [MetaGPT 多 Agent 架構解析](https://aiinovationhub.com/metagpt-multi-agent-framework-explained/)
11. [CrewAI Agents 文件](https://docs.crewai.com/en/concepts/agents)
12. [CrewAI Agentic Systems 架構](https://blog.crewai.com/agentic-systems-with-crewai/)
13. [LangGraph 多 Agent 協調指南](https://latenode.com/blog/ai-frameworks-technical-infrastructure/langgraph-multi-agent-orchestration/langgraph-multi-agent-orchestration-complete-framework-guide-architecture-analysis-2025)
14. [LangGraph 官網](https://www.langchain.com/langgraph)
15. [OpenAI Swarm 與其他框架比較 (Arize)](https://arize.com/blog/comparing-openai-swarm)
16. [2026 AI Agent 框架大比拚 (DEV)](https://dev.to/topuzas/the-great-ai-agent-showdown-of-2026-openai-autogen-crewai-or-langgraph-1ea8)
17. [VS Code Multi-Agent Development](https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development)
18. [VS Code Subagents 文件](https://code.visualstudio.com/docs/copilot/agents/subagents)
19. [Multi-Agent Systems 2026 完整指南 (DEV)](https://dev.to/eira-wexford/how-to-build-multi-agent-systems-complete-2026-guide-1io6)
20. [Git Worktrees for AI Coding (DEV)](https://dev.to/mashrulhaque/git-worktrees-for-ai-coding-run-multiple-agents-in-parallel-3pgb)
21. [Simon Willison - Parallel Coding Agents](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/)
22. [Turing - 2026 AI Agent 框架比較](https://www.turing.com/resources/ai-agent-frameworks)
