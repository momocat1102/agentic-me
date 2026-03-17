## Context

目前有 6 個專案管理 commands，其中 done/review/progress 三者在「看進度」和「更新進度」上高度重疊。standup 和 kickoff 仍引用已移除的 `/switch` 專家模式。使用者不確定何時該用哪個指令。更關鍵的是，OpenSpec 的 change 工作流（explore → propose → apply → archive）和我們的 session 管理 commands 之間的關係沒有被明確定義。

現有 commands（全域，`~/.claude/commands/`）：
- `kickoff.md` — 建專案（已含 openspec init）
- `standup.md` — 晨會
- `progress.md` — 看/更新進度
- `review.md` — 日/週回顧
- `done.md` — 收工
- `overview.md` — 全域狀態

OpenSpec commands（專案級，`.claude/commands/opsx/`，由 `openspec init` 產生）：
- `/opsx:explore` — 探索想法，不寫程式碼
- `/opsx:propose` — 建立 change（proposal + specs + design + tasks）
- `/opsx:apply` — 實作 change 的 tasks
- `/opsx:archive` — 歸檔已完成的 change

## Complete User Journey

### 兩層循環架構

```
┌─ 外層：Session 循環（每次開 Claude Code 就是一個 session）───────────┐
│                                                                     │
│   /standup ──→ 工作 ──→ /done ──→ 關閉 Claude ──→ /standup ...      │
│                  │                                                   │
│                  ▼                                                   │
│   ┌─ 內層：Change 循環（一個 change 可能跨多個 session）──────────┐   │
│   │                                                              │   │
│   │   explore ──→ propose ──→ apply ──→ archive                  │   │
│   │      │                      │          │                     │   │
│   │      │            （可能跨 session）     │                     │   │
│   │      │                      │          │                     │   │
│   │      └──── next change ─────┴──────────┘                     │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   不需要 change 的工作（quick fix、探索、一次性任務）                    │
│   → 直接跟 Claude 對話，不走 OpenSpec                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario A: 從零開始建專案

```
使用者                              系統
──────                              ──────
在任意目錄開 Claude Code
輸入 /kickoff
  ├─ 討論專案目標、時程             ← Claude 引導對話
  ├─ 規劃 milestones               ← Claude 建議 3-6 phases
  └─ 確認建立                      → 建立 /mnt/d/WorkSpace/my-project/
                                    → CLAUDE.md（含 command 指引）
                                    → openspec init（specs/ + changes/ + .claude/）
                                    → openspec/specs/overview.md（roadmap）
                                    → Central Command 註冊 + milestones
                                    → memcp 記憶

提示：「用 VS Code 打開 my-project 資料夾，開始工作」

使用者打開 /mnt/d/WorkSpace/my-project/
Claude 自動載入 CLAUDE.md + .claude/skills + .claude/commands
→ 專案 ready，可以直接開始工作
```

### Scenario B: 每日工作 session（最典型的流程）

```
使用者                              系統
──────                              ──────
打開專案資料夾的 Claude Code
輸入 /standup
  │
  ├─ 看到全域概覽                   ← 所有專案進度 + deadlines
  ├─ 看到 active changes            ← "add-feature: 3/7 tasks done"
  ├─ 選擇今天要做什麼               ← 選專案 / 選 change / 新任務
  └─ 獲得行動建議                   ← 推薦 skill 或 subagent
      │
      ▼
┌─ 工作階段（三種模式）─────────────────────────────────────────┐
│                                                               │
│  模式 1：繼續既有 change                                       │
│  「繼續做 add-feature」                                        │
│  → /opsx:apply add-feature                                    │
│  → 逐個完成 tasks，自動勾選 checkbox                           │
│  → 做完 → /opsx:archive add-feature                           │
│                                                               │
│  模式 2：開始新 change                                         │
│  「我想加一個暗黑模式」                                         │
│  → /opsx:explore（想清楚要做什麼）                              │
│  → /opsx:propose add-dark-mode（產出 proposal+specs+design+tasks）│
│  → /opsx:apply add-dark-mode（開始實作）                        │
│  → 今天做不完？沒關係，下次 /standup 會看到進度                   │
│                                                               │
│  模式 3：Quick task（不需要 change）                            │
│  「幫我修這個 typo」「查一下這個 API 怎麼用」                     │
│  → 直接跟 Claude 對話                                          │
│  → 不走 OpenSpec，/done 時 task log 仍會記錄                    │
│                                                               │
│  隨時可用：                                                    │
│  - /progress — 查看/更新 milestones                            │
│  - 直接問 Claude 任何問題                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
      │
      ▼
輸入 /done
  ├─ 1. 摘要本次工作                ← Claude 回顧對話
  ├─ 2. Sync OpenSpec tasks         ← 勾選完成的 tasks
  │     └─ 全部完成？建議 archive   ← 「add-feature 全部完成，要 archive 嗎？」
  ├─ 3. Task log                    → report_task_completion 到 CC
  ├─ 4. 進度更新                    ← 預覽 → 確認 → 寫入 CC
  └─ 5. 知識提取                    → memcp_remember
```

### Scenario C: Change 跨 session 的連續性

```
Session 1（週一下午）
─────────────────────
/standup → 選「開始新功能」
/opsx:propose add-export → 產生 4 個 artifacts
/opsx:apply add-export → 完成 tasks 1.1, 1.2, 2.1（共 3/7）
/done → sync tasks（3/7 ✓）→ task log → 知識提取

Session 2（週二上午）
─────────────────────
/standup → 看到「add-export: 3/7 tasks」
選擇繼續 → /opsx:apply add-export
完成 2.2, 3.1, 3.2, 3.3（全部 7/7 ✓）
/opsx:archive add-export → delta specs 合併到主 specs
/done → sync tasks → task log → 知識提取

Session 3（週二下午）
─────────────────────
/standup → add-export 已歸檔，不再顯示
開始下一個 change 或做其他事...
```

### Scenario D: 不同入口的使用者意圖

```
使用者意圖                    該用什麼
──────────                    ──────────
「我要開一個新專案」           → /kickoff
「我今天要做什麼」             → /standup
「現在進度到哪了」             → /progress
「我想加一個新功能」           → /opsx:explore → /opsx:propose
「繼續做昨天的 change」        → /opsx:apply <name>
「這個 change 做完了」         → /opsx:archive <name>
「幫我修一個小 bug」           → 直接對話（不需要 change）
「我做完了要下班了」           → /done
「這週做了什麼、下週做什麼」    → progress-reviewer subagent
```

## Goals / Non-Goals

**Goals:**
- 精簡為 4 個 session commands，各有明確且不重疊的職責
- 明確定義 session commands 和 OpenSpec commands 的關係
- kickoff 產出的專案一開箱即用
- done 輕量化，只做 session 收尾
- 清除所有過時引用

**Non-Goals:**
- 不改 Central Command server/dashboard（純 command 層調整）
- 不改 OpenSpec CLI 本身或 opsx commands 的內容
- 不改 subagent 定義
- 不改 MCP tools

## Decisions

### Decision 1: 兩層指令體系 — Session Commands + OpenSpec Commands

明確區分兩類指令的職責：

**Session Commands**（我們的，全域 `~/.claude/commands/`）管理「什麼時候做」：
| Command | 觸發時機 | 職責 |
|---------|---------|------|
| `/kickoff` | 一次性 | 建專案，產出 ready-to-work 環境 |
| `/standup` | 每個 session 開始 | 回顧、規劃、選方向 |
| `/progress` | 工作中隨時 | 查看/更新 Central Command milestones |
| `/done` | 每個 session 結束 | 記錄、同步、提取知識 |

**OpenSpec Commands**（OpenSpec 的，專案級 `.claude/commands/opsx/`）管理「做什麼改動」：
| Command | 觸發時機 | 職責 |
|---------|---------|------|
| `/opsx:explore` | 有想法想釐清時 | 思考、調查、不寫程式 |
| `/opsx:propose` | 決定要做時 | 建立 change + artifacts |
| `/opsx:apply` | 開始/繼續實作時 | 逐步完成 tasks |
| `/opsx:archive` | change 全部完成時 | 歸檔、合併 specs |

兩者的接合點：
- `/standup` 顯示 active changes 狀態，引導使用者進入 OpenSpec 流程
- `/done` 同步 OpenSpec tasks 的完成狀態到 Central Command
- `/kickoff` 執行 `openspec init` 初始化專案的 OpenSpec 環境

### Decision 2: 保留 4 個 session commands，移除 2 個

保留：kickoff, standup, progress, done
移除：review, overview

**理由：**
- `/overview` 的功能（看全域狀態）完全是 `/standup` Step 1 的子集
- `/review` 的功能拆分：回顧昨天 → standup，session 收尾 → done，深度週回顧 → progress-reviewer subagent 按需派遣
- 4 個 commands 形成清晰的 session 生命週期：建立 → 開始 → 工作中 → 結束

**替代方案考慮：**
- 保留 review 但重新定位為「週回顧」→ 使用頻率太低，不值得獨立 command，subagent 更合適
- 合併 standup + progress → 功能差異大（全域 vs 單專案），不適合合併

### Decision 3: Done 的精確職責邊界

Done 只做 5 件事（按順序）：
1. 摘要本次工作
2. 同步 OpenSpec tasks（+ 建議 archive 已完成的 changes）
3. report_task_completion
4. 確認進度更新
5. 知識提取

**明確不做：**
- 不分析 gap（→ standup/progress）
- 不建議下一步（→ standup）
- 不做 subagent 派遣（→ standup）

### Decision 4: Standup 吸收 overview + review 的回顧功能

Standup 的新結構：
1. **全域概覽**（吸收 overview）：所有專案進度 + Agent 狀態 + 近期 tasks + deadlines
2. **活躍 Changes**（新增）：各專案的 OpenSpec active changes 狀態及完成度
3. **今日規劃**：選擇要做的專案/任務（含「繼續 change X」選項）
4. **行動建議**：推薦 subagent 或 skill（取代 `/switch`）

### Decision 5: Kickoff 中 /switch 引用改為兩層指令指引

CLAUDE.md 模板的指令參考段落改為：
```markdown
## Commands

### Session 管理
- `/standup` — 開始工作，回顧進度，規劃方向
- `/progress` — 查看/更新 milestones
- `/done` — 結束 session，記錄工作

### Change 工作流（OpenSpec）
- `/opsx:explore` — 探索想法，不寫程式
- `/opsx:propose <name>` — 建立 change
- `/opsx:apply <name>` — 實作 change
- `/opsx:archive <name>` — 歸檔完成的 change
```

### Decision 6: 不是所有工作都需要 change

Quick fix、探索性對話、一次性任務可以直接跟 Claude 對話，不需要走 OpenSpec。
判斷標準：
- 需要 change：涉及多步驟實作、會改變系統行為、需要追蹤進度
- 不需要 change：改 typo、查資料、寫文件、討論想法、一次性腳本

`/done` 的 task log 無論有沒有 change 都會記錄本次工作。

## Risks / Trade-offs

- [習慣成本] 已習慣 `/review` 的使用者需要改用 `/standup` 或 subagent → 低風險，目前只有一位使用者
- [功能遺失] `/review` 的「建議下一步」功能在 `/done` 中移除 → Mitigation: standup 承接此功能，且 progress-reviewer subagent 可深度分析
- [overview 消失] 有人可能只想快速看狀態不想做 standup 流程 → Mitigation: standup 的 Step 1 結束後可直接選「Nothing」退出
- [兩層指令認知成本] 使用者需要理解 session commands vs OpenSpec commands 的區別 → Mitigation: CLAUDE.md 明確分組，standup 自然引導進入 OpenSpec 流程
