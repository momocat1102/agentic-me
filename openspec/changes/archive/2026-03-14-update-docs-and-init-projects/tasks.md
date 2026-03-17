## 1. 更新使用指南（docs + Dashboard）

- [x] 1.1 讀取現有 `docs/agentic-me.md`，找到指令/工作流相關段落
- [x] 1.2 加入兩層循環架構圖和 Scenario A-D
- [x] 1.3 更新指令速查表，移除 `/switch`、`/review`、`/overview` 引用
- [x] 1.4 更新 Dashboard Guide 頁面 `dashboard/src/app/guide/page.tsx`：
  - 更新「日常工作流程」段落（移除 `/review`，改為 4 commands）
  - 更新「完整工作流」7 步驟為新的兩層指令體系
  - 更新 OpenSpec 工作流段落，加入使用者旅程圖

## 2. 為既有專案初始化 OpenSpec

- [x] 2.1 在 agentic-me 執行 `openspec init --tools claude`
- [x] 2.2 在 code-agent 執行 `openspec init --tools claude`
- [x] 2.3 在 evolve-agent 執行 `openspec init --tools claude`
- [x] 2.4 在 foxconn-report 執行 `openspec init --tools claude`
- [x] 2.5 在 lab-weekly 執行 `openspec init --tools claude`
- [x] 2.6 在 main-agent 執行 `openspec init --tools claude`

## 3. 更新既有專案 CLAUDE.md

- [x] 3.1 更新 agentic-me CLAUDE.md Commands 段落
- [x] 3.2 更新 code-agent CLAUDE.md Commands 段落
- [x] 3.3 更新 evolve-agent CLAUDE.md Commands 段落
- [x] 3.4 更新 foxconn-report CLAUDE.md Commands 段落
- [x] 3.5 更新 lab-weekly CLAUDE.md Commands 段落
- [x] 3.6 更新 main-agent CLAUDE.md Commands 段落
- [x] 3.7 更新 macs-coder CLAUDE.md Commands 段落（已有 openspec，只更新 CLAUDE.md）
- [x] 3.8 更新 master-thesis CLAUDE.md Commands 段落（已有 openspec，只更新 CLAUDE.md）

## 4. 驗證

- [x] 4.1 確認所有 9 個專案都有 `openspec/` 目錄
- [x] 4.2 確認所有 9 個專案 CLAUDE.md 無 `/switch`、`/review`、`/overview` 引用
