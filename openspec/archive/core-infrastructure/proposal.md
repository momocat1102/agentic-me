# Core Infrastructure

## Status
archived

## Motivation
建立 Agentic Me 系統的基礎設施：Central Command server、Dashboard、Agent 註冊機制、MCP 整合，作為所有後續功能的基礎平台。

## What Changes
- Hono 後端 + SQLite (WAL mode) + WebSocket 廣播
- Next.js Dashboard + Tailwind CSS，透過 rewrite proxy 串接 server
- Agent 註冊系統 (agents.json + REST API)
- MCP Server 提供 report_task_completion、update_progress 等 tools
- Graceful shutdown (SIGTERM → WAL checkpoint)
- tmux 管理腳本 (start.sh / stop.sh / restart.sh)

## Implications
- Server port 4000、Dashboard port 3000、WebSocket port 4001
- DB 檔案位於 server/data/central-command.db
- 所有 Agent 可透過 MCP tools 回報進度
