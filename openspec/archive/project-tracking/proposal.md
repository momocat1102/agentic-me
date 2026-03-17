# Project Tracking

## Status
archived

## Motivation
從單一 Agent 追蹤擴展為跨 Agent 專案追蹤：能力型 Agent + 專案導向管理。支援專案 CRUD、進度追蹤、專家模式切換、截止日管理、10 個 subagent 定義。

## What Changes
- Projects API + Dashboard（列表頁 + 詳情頁 + summary 聚合）
- Progress 追蹤（parent-child 層級 + 進度百分比）
- Expert Mode：8 個專家知識檔 + /switch command
- 10 個 Subagent 定義（ai-engineer, debugger, research-analyst 等）
- Custom commands：kickoff, progress, review, done, overview
- Deadline 管理 API + Dashboard

## Implications
- Agent 按能力分，Project 按目標分
- /switch 改為「收尾→compact→注入專家知識」流程
- 專案 CLAUDE.md 模板自動生成
