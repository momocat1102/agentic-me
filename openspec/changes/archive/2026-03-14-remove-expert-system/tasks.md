# Tasks

## Task 1: Server 端移除
- [x] 刪除 `server/src/routes/experts.ts`
- [x] 編輯 `server/src/index.ts`：移除 import 和 route 註冊
- [x] 編輯 `server/src/types/index.ts`：移除 Expert interface 和 AgentsConfig.experts

## Task 2: Dashboard 端移除
- [x] 編輯 `dashboard/src/lib/api.ts`：移除 Expert interface 和 api.experts.list()
- [x] 編輯 `dashboard/src/app/page.tsx`：移除 experts state、Promise.all 調整、專家模式 section、ExpertCard
- [x] 編輯 `dashboard/src/app/guide/page.tsx`：移除 experts 陣列、架構圖行、專家一覽、Expert vs Subagent 比較

## Task 3: 設定檔清理
- [x] 編輯 `agents.json`：移除 experts 陣列
- [x] 編輯 `CLAUDE.md`（專案）：移除專家模式進度項目

## Task 4: CLI 檔案刪除
- [x] 刪除 `~/.claude/commands/switch.md`
- [x] 刪除 `~/.claude/experts/` 目錄（9 個 .md 檔）

## Task 5: 全域及跨專案 CLAUDE.md 清理
- [x] 編輯 `~/.claude/CLAUDE.md`：移除專家切換段落
- [x] 編輯 5 個跨專案 CLAUDE.md：移除 /switch 引用

## Task 6: 文件更新
- [x] 編輯 `docs/agentic-me.md`：移除約 29 處 expert 相關段落

## Task 7: 驗證
- [x] `cd server && npx tsc --noEmit` — 通過
- [x] `cd dashboard && npm run build` — 通過（12 pages generated）
