# Git Graph Visualization

## Status
in_progress

## Motivation
Dashboard 的專案追蹤從 flat list 改為 GitLens 風格的 SVG 分支圖，讓使用者一眼看出主幹進度、分支工作、合併狀態。

## What Changes
- 新增 GitGraph.tsx：SVG 分支圖元件（trunk + branch fork/merge + status nodes）
- 重寫 ChangeTree.tsx：從 CSS timeline 改為 SVG git graph（change=trunk, tasks=branches）
- 佈局計算：parent_id 推斷分支結構，無需改 DB
- 刪除 ProgressGraph.tsx、KanbanBoard.tsx（被取代）

## Implications
- Progress 和 Changes 兩種資料都用 git graph 顯示
- 前端推斷分支，不改 DB schema
- 未來可擴展支援拖放排序和 DB 欄位（branch_name, lane）
