# Automation System

## Status
archived

## Motivation
讓 Claude 能在背景自動執行長時間任務：夜班排程、迭代式 task/review 循環、自動停止機制、token 用量追蹤。

## What Changes
- Night Shift 排程系統（DB schema + executor + scheduler + Dashboard）
- 迭代式 Task/Review 循環（schedule_runs.feedback 通訊）
- Circuit Breaker Protocol（連續 3 次失敗自動 disable）
- Usage Dashboard（JSONL token 解析 + 每日/專案/模型統計）
- Agent 行為約束升級（Honesty Protocol, Kill Conditions）
- launch-night-shift.sh（tmux 自動啟動）

## Implications
- 夜班用獨立 tmux session，避免 CLAUDECODE 變數衝突
- 排程不 spawn 子進程（避免 OOM），改由 session 內執行 + curl 回報
- Token 追蹤零額外消耗——純讀本地 JSONL
