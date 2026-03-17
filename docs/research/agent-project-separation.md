# AI Coding Agent 生態系中「Agent」與「Project」分離管理模式研究報告

> 研究日期：2026-03-07

---

## Executive Summary

在 AI coding agent 生態系中，「agent（能力/角色）」與「project（工作區/任務）」的分離是一個正在快速演化的架構問題。2025-2026 年的趨勢明確顯示：業界正從「one agent per project」的單體模式，轉向「多個專業化 agent 協作於同一個 project」的 orchestrator 模式。關鍵的解耦機制包括：Git worktree 隔離、shared task list 協調、A2A/MCP 雙協定互補、以及 stateless agent + stateful workspace 的混合架構。對於 Agentic Me 系統，最相關的啟示是：agent 應該被視為可組合的「角色/能力單元」，而 project 則是帶有狀態的「工作區上下文」，兩者透過任務分配機制（task list / orchestrator）連結。

---

## 1. One Agent Per Project vs Multiple Agents Per Project

### 1.1 Single Agent 模式（Conductor 模式）

**特徵：**
- 一個 agent 擁有完整的 project context
- 人類與 agent 之間是緊密的互動回饋迴圈（tight feedback loop）
- 人類在每一步都動態引導 agent 的行為
- 適合中小型任務、proof-of-concept

**優點：**
- 簡單、低成本、容易 debug
- 不需要協調開銷
- Context 完整，不會分散

**缺點：**
- 單一 context window 的容量限制（即使有 200K+ tokens）
- 任務複雜度增加時，tool 過多會導致效能下降
- 無法平行處理

**來源：** Google Cloud 的架構指南明確指出：「A single agent's performance can be less effective when it uses more tools and when tasks increase in complexity.」

### 1.2 Multi-Agent 模式（Orchestrator 模式）

**特徵：**
- 多個專業化 agent 各自負責特定角色
- 一個 orchestrator / team lead 負責任務分配與協調
- 每個 agent 有獨立的 context window
- 透過 Git worktree 實現工作區隔離

**優點：**
- 專業化分工提升品質（Security Scanner、Code Reviewer、Test Generator 各司其職）
- 可平行處理，減少整體時間
- 模組化設計，可獨立測試和維護
- 可針對不同 agent 使用不同 model

**缺點：**
- 協調開銷（coordination overhead）
- Token 成本線性增長
- 更多的失敗模式
- 合併衝突風險

**來源：** Addy Osmani（Google Chrome 團隊）的文章清楚區分了 Conductor（引導單一 agent）和 Orchestrator（管理 agent 車隊）兩種模式。

### 1.3 業界共識

Microsoft Azure Architecture Center 提出了一個清晰的複雜度階梯：

| 層級 | 描述 | 適用場景 |
|------|------|----------|
| Direct model call | 單次 LLM 呼叫 | 分類、摘要、翻譯 |
| Single agent + tools | 一個 agent 搭配多個 tools | 單一領域的動態任務 |
| Multi-agent orchestration | 多個專業化 agent 協調 | 跨領域、需要安全邊界或平行化 |

核心原則：**使用能可靠滿足需求的最低複雜度層級**。

---

## 2. AI Coding 工具如何處理多專案

### 2.1 Claude Code

**Agent Teams（實驗性功能）：**
- 一個 session 作為 Team Lead，可 spawn 多個 Teammate
- 每個 Teammate 是獨立的 Claude Code instance，有自己的 context window
- 透過 **Shared Task List** 協調工作（task 有 pending/in-progress/completed 三狀態）
- 透過 **Mailbox** 機制進行 agent 間通訊
- 支援 task dependencies（自動 unblock）
- 使用 file locking 防止 race condition

**Subagent vs Agent Team 的關鍵差異：**

| 面向 | Subagent | Agent Team |
|------|----------|------------|
| Context | 獨立 context，結果回傳給 caller | 獨立 context，完全自主 |
| 通訊 | 只能回報結果給主 agent | Teammate 之間可直接訊息 |
| 協調 | 主 agent 管理所有工作 | Shared task list + 自我協調 |
| 適合 | 需要快速聚焦的工作 | 需要討論和協作的複雜工作 |
| Token 成本 | 較低 | 較高（每個 teammate 是獨立 instance） |

**多專案支援：**
- `--add-dir` flag 可跨越 project root 存取其他目錄
- 適合 monorepo、shared libraries、multi-service 架構
- Git worktree 是標準的隔離機制

### 2.2 Cursor

**Parallel Agents：**
- 每個 agent 在獨立的 Git worktree 中運作
- 每個 workspace 最多 20 個並行 worktree
- 透過 `.cursor/worktrees.json` 設定 worktree 初始化腳本
- 完成後用 "Apply" 合併回主分支
- 支援 "Best-of-N"：同一 prompt 跑多個 model，選最好的結果

**Multi-Root Workspace：**
- 可建立多根工作區，讓多個 codebase 在同一個 workspace 中被索引
- 適合需要同時處理多個相關專案的場景

**Cursor 2.0 Multi-Agent 模式：**
- 將職責拆分：每個 agent 負責一個切片（如 frontend、backend、DB）
- 在 agent 之間協商介面（interface negotiation）
- 可在單一 session 中分配角色：planner、implementer、tester、docs

### 2.3 Aider

- 專注於 terminal-based pair programming
- 建立整個 repo 的 repository map 提供 context
- 本身不內建 multi-agent，但與 Git worktree 無縫配合
- 社群使用 worktree 實現多 agent 平行開發

### 2.4 Cline / Kilo Code

- VS Code extension 模式，帶入 agent 自主執行能力
- 開源、按 API 成本計費
- 不像 Cursor 有內建的 multi-agent 機制
- 依賴使用者手動管理多專案工作流

### 2.5 共通趨勢

所有工具都在朝向同一個方向演進：
1. **Git worktree 成為標準隔離機制** -- 每個 agent 一個 worktree
2. **Agent 是短暫的執行者，Project context 是持久的**
3. **Orchestrator 負責 agent 與 project 的映射**

---

## 3. 企業級 Multi-Agent 系統的 Agent-Project 關係

### 3.1 Microsoft AutoGen / Agent Framework

**核心架構：**
- **UserProxyAgent** 作為 project manager，接收初始請求並拆解為任務
- **AssistantAgent** 作為專業執行者，負責具體工作
- Project manager 永遠不做專業工作本身，只負責協調、handoff、維護整體 workflow

**Magentic-One 團隊架構：**
- 多個專業 agent 組成 team，可處理 web browsing、code execution、file handling
- 非同步訊息通訊（event-driven + request/response）
- AutoGen Studio 提供低程式碼介面快速建構 multi-agent 方案

**Agent-Project 分離方式：** Agent 是可重用的角色定義，Project 是一次性的任務上下文。Agent 被「指派」到 Project 的特定任務，完成後可以被重新指派。

### 3.2 Google Cloud Agentic AI 設計模式

Google 定義了 11 種設計模式，其中與 agent-project 分離最相關的：

**Coordinator 模式：**
- 中央 agent 動態路由任務到專業 agent
- 靈活但成本較高
- Agent 的選擇基於任務需求，而非固定綁定

**Hierarchical Task Decomposition 模式：**
- 多層級的階層式拆解
- 複雜問題 -> 可管理的子任務 -> 分配給專業 agent
- 每層可以有自己的 orchestration 策略

**Context Engineering：**
- 三層載入策略：hot memory（永遠載入的憲章）、domain specialists（按任務呼叫）、cold memory（按需檢索）
- 超過一半的 agent 內容是 project-specific 的 domain knowledge
- 這暗示 agent 不是純粹的 stateless 服務，而是需要深度注入 project context

### 3.3 Azure Architecture Center 的 Orchestration Patterns

五大核心模式：

1. **Sequential**（Pipeline）：agent 串接，每個處理前一個的輸出
2. **Concurrent**（Fan-out/Fan-in）：多個 agent 平行處理同一任務，結果聚合
3. **Group Chat**（Roundtable）：多 agent 在共享對話中協作，有 chat manager 控制流程
4. **Handoff**：agent 之間直接移交控制權
5. **Magentic**：結合以上模式的混合架構

**關鍵洞察：** 這些模式都假設 agent 是可互換的專業單元，project/task 是驅動 agent 組合的外部需求。

---

## 4. Agent as a Service 架構模式

### 4.1 Stateless Agent vs Stateful Agent

| 面向 | Stateless Agent | Stateful Agent |
|------|----------------|----------------|
| 回應時間 | 50-150ms | 150-500ms |
| 擴展性 | 99.9% 線性擴展 | 需要 session 管理 |
| 成本 | 基準 | 2-3x |
| 適合 | 翻譯、搜尋、分類 | 客服、銷售、個人化體驗 |
| Context | 每次請求獨立 | 跨對話記憶 |

### 4.2 混合架構模式

三種主要的混合方式：

1. **Session-Based**：對話期間保持狀態，閒置 30-60 分鐘後丟棄
2. **Cached State**：常用狀態放 Redis（<1ms），完整狀態放 DB
3. **Smart Context Window**：在 LLM context window 中傳遞相關歷史，舊的用摘要

### 4.3 Agent-Project 解耦的實際做法

**「Stateless 前端 + Stateful 後端」模式：**
- 前層：stateless agent 處理請求路由，水平擴展
- 後層：stateful workspace 管理持久數據和 context
- Agent 是可替換的執行器，Workspace 是帶有記憶的持久環境

**Amazon Bedrock 的 Stateful Runtime：**
- Agent 的定義（instructions、tools、conversation history）成為持久的、可定址的資源
- Agent 定義與執行環境分離
- 多個 agent instance 可以共享同一個定義但有不同的 runtime state

### 4.4 對 Agentic Me 的啟示

目前 Agentic Me 的 `agents.json` 註冊方式本質上是一種 "Agent as a Service" 的雛形：
- Agent 定義（角色、能力）是聲明式的
- Project 是 agent 被指派到的工作區
- 但目前 agent 和 project 是 1:1 綁定的

可以考慮的演進方向：
- Agent 定義與 Project 指派解耦
- 一個 Agent 角色可以同時服務多個 Project
- 一個 Project 可以被多個 Agent 角色協作處理
- Central Command 作為 orchestrator 管理這個 mapping

---

## 5. Google A2A 與 MCP 在 Multi-Agent 場景的設計

### 5.1 定位與互補性

| 面向 | MCP | A2A |
|------|-----|-----|
| 全稱 | Model Context Protocol | Agent-to-Agent Protocol |
| 焦點 | Agent-to-Tool（垂直整合） | Agent-to-Agent（水平整合） |
| 互動對象 | 工具、資料來源、API | 其他 agent |
| 互動模式 | 結構化 tool invocation | 靈活的、有狀態的協作對話 |
| 提出者 | Anthropic | Google（已捐給 Linux Foundation） |
| 版本 | 持續演進中 | v0.3（2025 年底） |

### 5.2 A2A 核心架構

**Agent Card：** 每個 agent 的元數據描述，包含能力宣告
- 類似服務的 service discovery 機制
- 標準化的 discovery endpoint

**通訊模式：**
- 基於 HTTP、SSE、JSON-RPC
- 支援 gRPC（v0.3 新增）
- 支援長時間執行的任務（從秒級到小時級）

**Task 概念：**
- A2A 中的 task 是透過對話式、協商式的交換來委派
- 不是嚴格的 task object，而是靈活的 agent 間對話
- 支援 multi-turn diagnostic conversations

### 5.3 A2A + MCP 的理想組合模式

```
[使用者]
    |
    v
[Agent A] --A2A--> [Agent B] --A2A--> [Agent C]
    |                   |                   |
    v                   v                   v
  [MCP]              [MCP]              [MCP]
    |                   |                   |
    v                   v                   v
[工具/資料]         [工具/資料]         [工具/資料]
```

- Agent 之間用 A2A 協調計畫和協作
- 每個 agent 內部用 MCP 存取工具和資源
- A2A 處理「誰做什麼」，MCP 處理「怎麼做」

### 5.4 對 Agentic Me 的啟示

目前的 Central Command 其實兼具了 A2A 和 MCP 的角色：
- WebSocket 通訊 ≈ A2A 的 agent 間通訊
- MCP tools（report_task_completion、update_progress）≈ MCP 的 tool invocation

未來可以考慮：
- Agent Card 概念：讓每個 agent 自我宣告能力，Central Command 基於能力動態分配任務
- 將 agent 間通訊（A2A 層）和 agent 工具存取（MCP 層）更清楚地分層

---

## 6. 設計模式總結：Agent 與 Project 如何解耦

### 模式一：Worktree-Based Isolation（最普遍）

```
Project (Git Repo)
├── main branch (production)
├── worktree-1/ -> Agent A (Feature Author)
├── worktree-2/ -> Agent B (Test Generator)
└── worktree-3/ -> Agent C (Code Reviewer)
```

- Agent 是臨時的執行者，worktree 是隔離的工作空間
- 合併回主分支時解決衝突
- 被 Claude Code、Cursor、Aider 等工具廣泛採用

### 模式二：Orchestrator + Shared Task List

```
Orchestrator (Team Lead)
├── Task List (persistent, shared)
│   ├── Task 1 [assigned: Agent A] [status: done]
│   ├── Task 2 [assigned: Agent B] [status: in-progress]
│   └── Task 3 [blocked by: Task 2] [status: pending]
├── Agent A (independent context)
├── Agent B (independent context)
└── Agent C (independent context)
```

- Task List 是 project 狀態的核心載體
- Orchestrator 是 agent-task mapping 的管理者
- Agent 可自我認領（self-claim）未分配的任務
- Claude Code Agent Teams 即是此模式

### 模式三：Role-Based Agent Pool

```
Agent Pool (reusable definitions)
├── SecurityScanner (role definition + tools)
├── CodeReviewer (role definition + tools)
├── FeatureAuthor (role definition + tools)
└── TestGenerator (role definition + tools)

Project A ──assign──> [SecurityScanner, CodeReviewer]
Project B ──assign──> [FeatureAuthor, TestGenerator, CodeReviewer]
```

- Agent 定義是跨專案可重用的
- Project 按需從 pool 中選取需要的 agent 角色
- 這是最徹底的解耦方式
- 類似 AutoGen 的 AssistantAgent 定義模式

### 模式四：Stateless Agent + Stateful Workspace

```
Request ──> [Stateless Agent Router]
                    |
                    v
            [Stateful Workspace]
            ├── conversation history
            ├── project context
            ├── tool configurations
            └── agent-specific state
```

- Agent 本身是無狀態的服務
- Workspace 持有所有 project context 和歷史
- Agent 啟動時從 Workspace 載入 context，結束時寫回
- 適合雲端 Agent-as-a-Service 架構

### 模式五：Protocol-Based Federation（A2A + MCP）

```
[Agent A: Planning] ──A2A──> [Agent B: Coding] ──A2A──> [Agent C: Testing]
       |                           |                           |
      MCP                        MCP                         MCP
       |                           |                           |
   [Jira API]               [Git/Editor]                [CI/CD API]
```

- Agent 間用 A2A 協定通訊（水平）
- Agent 與工具間用 MCP 協定連接（垂直）
- 跨組織、跨框架的 agent 協作
- 最適合企業級、多供應商的場景

---

## 7. 對 Agentic Me 系統的建議

基於以上研究，Agentic Me 系統可以考慮以下演進方向：

### 短期（可立即實施）
1. **在 agents.json 中增加 "capabilities" 欄位** -- 讓每個 agent 宣告自己的能力（類似 Agent Card）
2. **將 agent 定義與 project 指派分離** -- agents.json 只定義角色，另用 task/project 機制管理指派
3. **引入 Task List 概念到 Central Command** -- 讓 agent 可以自我認領任務

### 中期（架構演進）
4. **Agent Pool 模式** -- 讓一個 agent 角色可以被多個 project 共用
5. **將 MCP tools 分層** -- 區分 agent 間通訊（A2A 層）和 agent 工具存取（MCP 層）
6. **Worktree-based 隔離** -- 讓多個 agent 可以平行作業於同一個 repo

### 長期（系統架構）
7. **Stateless Agent + Stateful Workspace** -- Agent 啟動時從 workspace 載入 context
8. **Dynamic Orchestrator** -- Central Command 根據 task 需求動態組合 agent team
9. **Agent Card Discovery** -- agent 自動宣告能力，orchestrator 根據能力匹配任務

---

## Sources and References

### AI Coding Agent 架構與趨勢
1. [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)
2. [Addy Osmani - The Future of Agentic Coding: Conductors to Orchestrators](https://addyosmani.com/blog/future-agentic-coding/)
3. [Mike Mason - AI Coding Agents in 2026: Coherence Through Orchestration](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
4. [Codified Context: Infrastructure for AI Agents in a Complex Codebase (arXiv)](https://arxiv.org/html/2602.20478v1)
5. [NxCode - Agentic Engineering: The Complete Guide 2026](https://www.nxcode.io/resources/news/agentic-engineering-complete-guide-vibe-coding-ai-agents-2026)

### 工具比較與多專案管理
6. [Claude Code Agent Teams 官方文件](https://code.claude.com/docs/en/agent-teams)
7. [Cursor Parallel Agents / Worktrees 文件](https://cursor.com/docs/configuration/worktrees)
8. [Cursor Community - Best Practices for Multi-Project Workspaces](https://forum.cursor.com/t/best-practices-for-multi-project-workspaces/133387)
9. [Builder.io - Claude Code vs Cursor: What to Choose in 2026](https://www.builder.io/blog/cursor-vs-claude-code)
10. [Git Worktrees for AI Coding: Run Multiple Agents in Parallel](https://dev.to/mashrulhaque/git-worktrees-for-ai-coding-run-multiple-agents-in-parallel-3pgb)
11. [WorkTreeFlow - Git Worktree utilities for AI agents](https://github.com/Timon33/WorkTreeFlow)
12. [ccswarm - Multi-agent orchestration with Claude Code](https://github.com/nwiizo/ccswarm)

### 企業級 Multi-Agent 架構
13. [Microsoft AutoGen Framework](https://github.com/microsoft/autogen)
14. [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)
15. [Azure AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
16. [Google Cloud - Choose a Design Pattern for Agentic AI](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
17. [Google Developers Blog - Multi-Agent Patterns in ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
18. [LangChain - Choosing the Right Multi-Agent Architecture](https://blog.langchain.com/choosing-the-right-multi-agent-architecture/)
19. [Salesforce - Enterprise Agentic Architecture and Design Patterns](https://architect.salesforce.com/fundamentals/enterprise-agentic-architecture)

### A2A 與 MCP 協定
20. [Google A2A Protocol 官方網站](https://a2a-protocol.org/latest/)
21. [A2A Protocol - A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)
22. [Google Developers Blog - Announcing A2A Protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
23. [IBM - What Is Agent2Agent (A2A) Protocol?](https://www.ibm.com/think/topics/agent2agent-protocol)
24. [OneReach - MCP vs A2A: Protocols for Multi-Agent Collaboration 2026](https://onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols/)
25. [Auth0 - MCP vs A2A: A Guide to AI Agent Communication Protocols](https://auth0.com/blog/mcp-vs-a2a/)
26. [A2A vs MCP 比較網站](https://a2a-mcp.org/)

### Stateful vs Stateless Agent 架構
27. [Ruh.ai - Stateful vs Stateless AI Agents: Architecture Patterns](https://www.ruh.ai/blogs/stateful-vs-stateless-ai-agents)
28. [Letta - Stateful Agents: The Missing Link in LLM Intelligence](https://www.letta.com/blog/stateful-agents)
29. [Aalpha - Agent as a Service (AaaS): A Comprehensive Guide](https://www.aalpha.net/blog/agent-as-a-service-aaas-comprehensive-guide/)
30. [Criztec - AWS-OpenAI Stateful Agents: The $150B Architecture Pivot](https://criztec.com/aws-openai-stateful-agents-the-150b-architecture-pivot-ziq0/)

### Multi-Agent 設計模式
31. [Speakeasy - Practical Guide to Agentic Application Architectures](https://www.speakeasy.com/mcp/using-mcp/ai-agents/architecture-patterns)
32. [Confluent - Four Design Patterns for Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/)
33. [SitePoint - Agentic Design Patterns: The 2026 Guide](https://www.sitepoint.com/the-definitive-guide-to-agentic-design-patterns-in-2026/)
34. [Medium - The Orchestrator Era: Why 2026 is the Year Agentic Coding Rewrites the SDLC](https://medium.com/codetodeploy/the-orchestrator-era-why-2026-is-the-year-agentic-coding-rewrites-the-sdlc-c1bf547df755)
