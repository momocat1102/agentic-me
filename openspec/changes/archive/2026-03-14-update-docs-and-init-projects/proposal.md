## Why

剛完成的 `streamline-project-lifecycle` change 定義了完整的兩層指令體系和使用者旅程，但這些設計決策還沒有反映到使用指南（agentic-me.md）上。此外，有 6 個既有專案尚未初始化 OpenSpec，導致這些專案無法使用 `/opsx:*` commands。

## What Changes

- **更新 agentic-me.md**：加入完整使用者旅程架構圖（兩層循環、Scenario A-D、指令速查表）
- **更新 Dashboard Guide 頁面**（`dashboard/src/app/guide/page.tsx`）：同步更新日常工作流程、完整工作流、OpenSpec 段落
- **為 6 個既有專案執行 `openspec init`**：agentic-me, code-agent, evolve-agent, foxconn-report, lab-weekly, main-agent
- **同步更新既有專案的 CLAUDE.md**：將 Commands 段落更新為新的兩層指令指引（移除 `/switch`、`/review`、`/overview`）

## Capabilities

### New Capabilities
- `docs-user-journey`: 在 agentic-me.md 中記錄使用者旅程和指令體系

### Modified Capabilities
（無既有 spec 需修改）

## Impact

- 檔案變更：`docs/agentic-me.md`（更新使用指南）、`dashboard/src/app/guide/page.tsx`（Dashboard Guide 頁面）
- 6 個專案各自新增：`openspec/` 目錄 + `.claude/commands/opsx/` + `.claude/skills/openspec-*/`
- 6 個專案各自更新：`CLAUDE.md`（Commands 段落）
