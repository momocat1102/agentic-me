## Context

`streamline-project-lifecycle` 已完成，定義了兩層指令體系。現在需要把設計文件中的使用者旅程更新到 agentic-me.md，並為尚未初始化的 6 個專案執行 openspec init。

## Goals / Non-Goals

**Goals:**
- agentic-me.md 有完整、最新的使用者指南
- 所有 9 個專案都有 OpenSpec 環境
- 所有專案 CLAUDE.md 使用統一的 Commands 格式

**Non-Goals:**
- 不改 openspec CLI 行為
- 不改 Central Command
- 不為既有專案建立 openspec/specs/overview.md（那需要了解每個專案的 roadmap）

## Decisions

### Decision 1: agentic-me.md 更新範圍

將 streamline-project-lifecycle 的 design.md 中的 "Complete User Journey" 章節整合到 agentic-me.md 的適當位置，包括：
- 兩層循環架構圖
- Scenario A-D
- 指令速查表（Scenario D）

### Decision 2: openspec init 使用 core profile

對所有專案統一使用 `openspec init --tools claude`（core profile，delivery mode both）。

### Decision 3: CLAUDE.md 只更新 Commands 段落

不重寫整個 CLAUDE.md，只找到並替換 Commands / Work Guidelines 相關段落為新格式。
