# OpenSpec Integration

## Status
archived

## Motivation
將 OpenSpec 的 spec-driven development 方法論全面整合進 Agentic Me 系統，讓專案追蹤從手動回報改為以 openspec 檔案為 source of truth，Dashboard 作為純可視化層。

## What Changes
- 新增 7 個 /opsx:* 命令（onboard, propose, ff, apply, verify, archive, sync）
- 後端 API 增強（status 解析、lifecycle 管理、change 建立）
- Dashboard 新增 ChangeTree 樹狀圖組件
- 既有命令（done, standup, progress, kickoff）加入 spec-aware 功能

## Implications
- 所有新專案都會自動建立 openspec 結構
- 進度追蹤從 DB-first 轉為 file-first（import-tasks 單向同步）
- Agent 需要學習使用 /opsx:* 工作流
