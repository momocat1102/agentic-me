# Claude Code 多 Agent / 多專案最佳實踐 -- 深度研究報告

> 研究日期：2026-03-07

## Executive Summary

Claude Code 目前提供三層遞進的多 Agent 機制：**Subagents**（單 session 內的輕量委派）、**Agent Teams**（多 session 協作實驗功能）、以及 **Git Worktree** 隔離（檔案系統級平行開發）。多專案管理則透過 `--add-dir` 跨目錄掛載、階層式 CLAUDE.md、以及 `~/.claude/agents/` vs `.claude/agents/` 的 scope 分離來實現。社群中已有多個生產級多 Agent 協調系統（Agent Farm、ccswarm、ruflo 等），可作為 Agentic Me 系統的參考架構。

---

## 1. Claude Code 的三種多 Agent 機制

### 1.1 Subagents（子代理）-- 單 session 內委派

**定位**：輕量、快速、上下文隔離的工作者，只向父 agent 回報結果。

**核心特性**：
- 每個 subagent 擁有獨立的 context window，不繼承父對話歷史
- 結果摘要回傳給主 agent，不汙染主對話上下文
- 支援前景（阻塞）和背景（並行）執行
- 不能巢狀（subagent 不能再生成 subagent）
- 可用 `isolation: worktree` 讓 subagent 在獨立 git worktree 中工作

**定義方式**：
1. **檔案式**：在 `.claude/agents/` 或 `~/.claude/agents/` 放 Markdown + YAML frontmatter
2. **程式式（Agent SDK）**：透過 `agents` 參數在 `query()` 中定義 `AgentDefinition`
3. **CLI 參數**：`claude --agents '{JSON}'`（僅當次 session 有效）

**Frontmatter 重要欄位**：
| 欄位 | 說明 |
|------|------|
| `name` | 唯一識別名（小寫+連字號） |
| `description` | Claude 根據此欄位決定何時委派 |
| `tools` | 允許使用的工具（白名單） |
| `disallowedTools` | 禁用的工具（黑名單） |
| `model` | sonnet / opus / haiku / inherit |
| `permissionMode` | default / acceptEdits / dontAsk / bypassPermissions / plan |
| `skills` | 注入的 skill 內容（非繼承，需明確列出） |
| `memory` | 持久記憶 scope：user / project / local |
| `isolation` | 設為 `worktree` 可在獨立 git worktree 中運行 |
| `hooks` | 生命週期 hook（PreToolUse / PostToolUse / Stop） |
| `background` | 設為 true 則始終在背景執行 |
| `maxTurns` | 最大 agentic turns |

**內建 Subagents**：
- **Explore**：使用 Haiku，唯讀，用於 codebase 搜尋
- **Plan**：唯讀研究，用於 plan mode
- **general-purpose**：全工具，用於複雜多步驟任務
- **Bash**：獨立 context 中的命令執行

**持久記憶（memory 欄位）**：
- `user` scope → `~/.claude/agent-memory/<name>/`（跨專案）
- `project` scope → `.claude/agent-memory/<name>/`（可 check in）
- `local` scope → `.claude/agent-memory-local/<name>/`（不 check in）
- 啟用後 subagent 會自動讀寫 `MEMORY.md`，前 200 行注入系統提示

**最佳使用場景**：
- 隔離高產出操作（跑測試、抓文件、處理 log）
- 平行研究（多個 subagent 同時探索不同方向）
- 鏈式工作流（code-reviewer → optimizer）
- 需要強制工具限制的場景

**來源**：[官方 Subagents 文件](https://code.claude.com/docs/en/sub-agents) / [Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)

---

### 1.2 Agent Teams（代理團隊）-- 多 session 協作

**定位**：多個獨立 Claude Code instance 組成團隊，支援互相通訊和共享任務。

**狀態**：實驗性功能，預設關閉，需設定 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。

**核心架構**：
| 元件 | 角色 |
|------|------|
| **Team Lead** | 主 session，建立團隊、分配任務、統合結果 |
| **Teammates** | 獨立 Claude Code instance，各有自己的 context window |
| **Task List** | 共享任務清單，支援狀態追蹤（pending/in-progress/completed）和依賴關係 |
| **Mailbox** | Agent 間的訊息系統，支援點對點和廣播 |

**儲存位置**：
- Team 設定：`~/.claude/teams/{team-name}/config.json`
- 任務清單：`~/.claude/tasks/{team-name}/`

**與 Subagents 的關鍵差異**：

| 面向 | Subagents | Agent Teams |
|------|-----------|-------------|
| Context | 獨立，結果回傳給呼叫者 | 完全獨立 |
| 通訊 | 只能向主 agent 回報 | 隊友間可直接訊息 |
| 協調 | 主 agent 管理所有工作 | 共享任務清單 + 自我協調 |
| 適合場景 | 只需結果的聚焦任務 | 需要討論和協作的複雜工作 |
| Token 成本 | 較低 | 較高（每個隊友都是獨立 instance） |

**顯示模式**：
- **In-process**：所有隊友在主終端機中，`Shift+Down` 切換
- **Split panes**：每個隊友獨立窗格（需 tmux 或 iTerm2）

**進階功能**：
- **Plan Approval**：要求隊友先提計畫，Lead 審核後才能實作
- **直接對話**：可跳過 Lead 直接與任何隊友溝通
- **自動認領**：隊友完成任務後自動認領下一個未指派的任務
- **Hook 整合**：`TeammateIdle` 和 `TaskCompleted` hook 可強制品質門檻

**最佳實踐**：
- 團隊大小控制在 3-5 人
- 每個隊友分配 5-6 個任務
- 確保隊友間的工作不會互相衝突（避免同時編輯同一檔案）
- spawn 時要給足夠的上下文（隊友不繼承 Lead 的對話歷史）
- 新手先從研究和審查類任務開始

**適合場景**：
- 多角度平行研究
- 競爭性假設的除錯
- 跨層協調（前端/後端/測試各由不同隊友負責）
- 平行 code review（安全/效能/測試覆蓋）

**限制**：
- 不支援 session 恢復（`/resume` 無法恢復 in-process 隊友）
- 一個 session 只能管理一個 team
- 不支援巢狀 team
- Lead 固定，不能轉移
- Split panes 不支援 VS Code 終端機、Windows Terminal、Ghostty

**來源**：[官方 Agent Teams 文件](https://code.claude.com/docs/en/agent-teams) / [Agent Teams 完整指南](https://claudefa.st/blog/guide/agents/agent-teams)

---

### 1.3 Git Worktree -- 檔案系統級隔離

**定位**：讓多個 Claude Code session 在同一 repo 的不同分支上同時工作，零干擾。

**基本用法**：
```bash
# 使用 --worktree (-w) flag 啟動隔離 session
claude --worktree feature-auth    # 建立 worktree + 分支 + 啟動 Claude
claude -w bugfix-login            # 另一個終端機，另一個任務
```

**Subagent 整合**：
在 subagent frontmatter 中加入 `isolation: worktree`，讓 subagent 在獨立 worktree 中工作。

**清理機制**：
- 無變更 → 自動刪除 worktree 和分支
- 有變更 → 提示保留或移除

**最佳實踐**：
- 將 `.claude/worktrees/` 加入 `.gitignore`
- 每個新 worktree session 中執行 `/init`
- 定期從 main 分支合併更新，避免過度分歧

**incident.io 實戰案例**：
- 四個月內從零到同時跑 4-5 個 agent
- 建了自訂 bash function `w` 簡化 worktree 管理
- 結合 Plan Mode 確保平行作業安全
- 使用語音輸入（SuperWhisper）快速提供上下文
- 一個 JavaScript 編輯器增強：10 分鐘完成（原估 2 小時）

**來源**：[incident.io 部落格](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees) / [Dev.to Worktree 指南](https://dev.to/datadeer/part-2-running-multiple-claude-code-sessions-in-parallel-with-git-worktree-165i) / [Claude Code 常見工作流](https://code.claude.com/docs/en/common-workflows)

---

## 2. 多專案管理機制

### 2.1 CLAUDE.md 階層系統

Claude Code 載入 CLAUDE.md 的順序與優先級：

```
~/.claude/CLAUDE.md                    # 全域（所有專案）
/project-root/CLAUDE.md                # 專案根目錄
/project-root/.claude/CLAUDE.md        # 專案 .claude 目錄（等效）
/project-root/packages/frontend/CLAUDE.md  # 子目錄（monorepo 套件）
```

**重點**：
- 越深層（越具體）的 CLAUDE.md 優先級越高
- 每個 CLAUDE.md 建議控制在 200 行以內
- CLAUDE.md 是 living document，架構變更時要同步更新
- Monorepo 中每個 package 可以有自己的 CLAUDE.md

### 2.2 `--add-dir` 跨目錄擴展

```bash
# 啟動時掛載額外目錄
claude --add-dir ../backend-api --add-dir ~/shared/libraries

# 互動模式中動態新增
/add-dir /path/to/another/project
```

**特性**：
- 每個額外目錄的 CLAUDE.md 和 `.claude/rules/` 都會被載入
- 等於讓 Claude 同時了解多個專案的上下文
- 適合微服務、跨 repo 開發、共享 library 的場景
- 不需重啟 session 就能擴展工作空間

**來源**：[ClaudeLog --add-dir 指南](https://claudelog.com/faqs/--add-dir/) / [Polyrepo Synthesis](https://rajiv.com/blog/2025/11/30/polyrepo-synthesis-synthesis-coding-across-multiple-repositories-with-claude-code-in-visual-studio-code/)

### 2.3 Skills 與 Agents 的 Scope 分離

**Skills 層級**（優先級由高到低）：
1. Enterprise level（企業）
2. User level：`~/.claude/skills/`（個人，跨專案）
3. Project level：`.claude/skills/`（專案，可 check in）
4. 子目錄自動發現：`packages/frontend/.claude/skills/`

**Agents 層級**（優先級由高到低）：
1. `--agents` CLI flag（當次 session）
2. `.claude/agents/`（專案級）
3. `~/.claude/agents/`（使用者級）
4. Plugin 的 `agents/` 目錄

**重點**：同名時高優先級覆蓋低優先級。

**來源**：[官方 Skills 文件](https://code.claude.com/docs/en/skills) / [Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)

---

## 3. 社群多 Agent 系統案例

### 3.1 multiagent-claude（TuskAW）

**GitHub**：[TuskAW/multiagent-claude](https://github.com/TuskAW/multiagent-claude)

- 提供多 agent 開發環境的設定 prompt
- Sub agent 專注於研究和規劃，留主要實作給 parent agent
- 包含記憶系統（Memory System）
- 使用 sub agents + commands 的組合

### 3.2 Claude Code Agent Farm（Dicklesworthstone）

**GitHub**：[Dicklesworthstone/claude_code_agent_farm](https://github.com/Dicklesworthstone/claude_code_agent_farm)

- 同時運行 20+ Claude Code agent
- 自動化 bug 修復、best-practice 掃描
- 基於鎖的協調機制（Lock-based coordination）
- 即時 tmux 監控

### 3.3 ccswarm（nwiizo）

**GitHub**：[nwiizo/ccswarm](https://github.com/nwiizo/ccswarm)

- 多 agent 協作框架，專用 Claude Code CLI
- 任務委派基礎設施 + 模板化 scaffolding
- Git worktree 隔離實現平行開發
- Agent 只建立計畫不直接修改程式碼（安全層）

### 3.4 ruflo（ruvnet）

**GitHub**：[ruvnet/ruflo](https://github.com/ruvnet/ruflo)

- 企業級 agent 協調平台
- 分散式 swarm intelligence
- RAG 整合 + 原生 Claude Code 整合
- 自主工作流協調

### 3.5 wshobson/agents

**GitHub**：[wshobson/agents](https://github.com/wshobson/agents)

- 112 個專門化 AI agent + 16 個多 agent 工作流協調器
- 146 個 agent skills + 79 個開發工具
- 組織成 72 個聚焦的單一用途 plugin

### 3.6 Swarm Orchestration Skill（kieranklaassen）

**Gist**：[Claude Code Swarm Orchestration Skill](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)

- 完整的多 agent 協調指南
- 涵蓋 TeammateTool、Task 系統、所有模式
- 模式包括：平行專家、Pipeline、自組織 Swarm、計畫審批工作流
- 詳細的訊息系統（JSON inbox）說明

---

## 4. Agent SDK 的 Agent/Project 分離機制

### 4.1 程式化定義（推薦做法）

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Review the auth module",
  options: {
    allowedTools: ["Read", "Grep", "Glob", "Task"],
    agents: {
      "code-reviewer": {
        description: "Expert code review specialist.",
        prompt: "You are a code review specialist...",
        tools: ["Read", "Grep", "Glob"],
        model: "sonnet"
      }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

### 4.2 動態 Agent 配置

可根據執行時條件動態生成 AgentDefinition：
```typescript
function createSecurityAgent(level: "basic" | "strict"): AgentDefinition {
  return {
    description: "Security code reviewer",
    prompt: `You are a ${level === "strict" ? "strict" : "balanced"} security reviewer...`,
    tools: ["Read", "Grep", "Glob"],
    model: level === "strict" ? "opus" : "sonnet"
  };
}
```

### 4.3 Subagent 繼承與隔離

| Subagent 接收到的 | Subagent 不會接收的 |
|---|---|
| 自己的 system prompt + Task prompt | 父對話歷史或工具結果 |
| 專案的 CLAUDE.md | 父 agent 的 system prompt |
| 工具定義（繼承或子集） | Skills（除非明確列出） |

### 4.4 Subagent 恢復機制

- 透過 `session_id` 和 `agentId` 可恢復已完成的 subagent
- 恢復後保留完整對話歷史
- Transcript 獨立於主對話存儲，不受 compaction 影響

**來源**：[Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) / [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) / [Anthropic Engineering Blog](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

---

## 5. 對 Agentic Me 系統的啟示與建議

### 5.1 目前系統 vs Claude Code 原生能力對照

| Agentic Me 元件 | Claude Code 對應功能 |
|---|---|
| Central Command Server | Agent Teams（Task List + Mailbox） |
| Dashboard 狀態追蹤 | tmux split panes / in-process 模式 |
| agents.json 註冊 | `.claude/agents/` + `~/.claude/agents/` |
| Hook 系統 | Claude Code Hooks（settings.json） |
| 進度追蹤 MCP | Agent Teams Task List |
| 記憶系統（memcp） | Subagent `memory` 欄位 + MEMORY.md |

### 5.2 可能的演進方向

1. **短期**：善用 `~/.claude/agents/` 定義各 agent 的 subagent 檔案，讓 Claude Code 原生支援 agent 委派
2. **中期**：實驗 Agent Teams 功能，評估是否能取代 Central Command 的部分協調功能
3. **長期**：考慮用 Agent SDK 建立程式化的 agent 協調層，整合 memcp 記憶系統

### 5.3 多專案組織建議

```
~/.claude/
  CLAUDE.md                    # 全域指令（語言、偏好）
  agents/                      # 跨專案通用 agent
    web-search-agent.md
    code-reviewer.md
  skills/                      # 跨專案通用 skill
  agent-memory/                # 跨專案 agent 記憶

/project-A/.claude/
  agents/                      # 專案 A 專用 agent
  skills/                      # 專案 A 專用 skill
  CLAUDE.md                    # 專案 A 指令

/project-B/.claude/
  agents/                      # 專案 B 專用 agent
  skills/
  CLAUDE.md
```

---

## Sources and References

### 官方文件
1. [Orchestrate teams of Claude Code sessions - Agent Teams](https://code.claude.com/docs/en/agent-teams)
2. [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
3. [Subagents in the SDK - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/subagents)
4. [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
5. [Extend Claude with skills](https://code.claude.com/docs/en/skills)
6. [Common workflows - Claude Code Docs](https://code.claude.com/docs/en/common-workflows)

### 部落格與教學
7. [incident.io - Shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)
8. [Parallel Vibe Coding: Using Git Worktrees with Claude Code](https://www.dandoescode.com/blog/parallel-vibe-coding-with-git-worktrees)
9. [Claude Code Agent Teams: The Complete Guide 2026](https://claudefa.st/blog/guide/agents/agent-teams)
10. [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
11. [Polyrepo Synthesis with Claude Code](https://rajiv.com/blog/2025/11/30/polyrepo-synthesis-synthesis-coding-across-multiple-repositories-with-claude-code-in-visual-studio-code/)
12. [Anthropic Engineering: Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
13. [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
14. [Claude Code --add-dir Guide](https://claudelog.com/faqs/--add-dir/)
15. [How to Set Up and Use Claude Code Agent Teams (Medium)](https://darasoba.medium.com/how-to-set-up-and-use-claude-code-agent-teams-and-actually-get-great-results-9a34f8648f6d)
16. [Claude Code and Subagents: Build Your First Multi-Agent Workflow (Medium)](https://medium.com/@techofhp/claude-code-and-subagents-how-to-build-your-first-multi-agent-workflow-3cdbc5e430fa)
17. [Git Worktree + Claude Code: 10x Developer Productivity](https://dev.to/kevinz103/git-worktree-claude-code-my-secret-to-10x-developer-productivity-520b)

### GitHub 專案與社群資源
18. [TuskAW/multiagent-claude](https://github.com/TuskAW/multiagent-claude) - Multi-agent 設定 prompt + 記憶系統
19. [Dicklesworthstone/claude_code_agent_farm](https://github.com/Dicklesworthstone/claude_code_agent_farm) - 20+ agent 平行協調
20. [nwiizo/ccswarm](https://github.com/nwiizo/ccswarm) - Git worktree 隔離的多 agent 框架
21. [ruvnet/ruflo](https://github.com/ruvnet/ruflo) - 企業級 agent 協調平台
22. [wshobson/agents](https://github.com/wshobson/agents) - 112 agent + 72 plugin 的完整系統
23. [FlorianBruniaux/claude-code-ultimate-guide](https://github.com/FlorianBruniaux/claude-code-ultimate-guide) - Agent Teams 工作流指南
24. [Claude Code Swarm Orchestration Skill (Gist)](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)
25. [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)
26. [anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) - 官方 SDK 範例
27. [catlog22/Claude-Code-Workflow](https://github.com/catlog22/Claude-Code-Workflow) - JSON 驅動的多 agent 框架
28. [GitHub Issue #4689: Dynamic Context Management for Multi-Project Workflows](https://github.com/anthropics/claude-code/issues/4689)
29. [GitHub Issue #3146: Configure Additional Directories via Settings Files](https://github.com/anthropics/claude-code/issues/3146)
