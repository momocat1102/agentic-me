#!/usr/bin/env python3
"""Migrate memories from memory-lancedb-pro to memcp.

Reads the 11 existing memories and writes them into memcp's graph DB.
"""

import sys
sys.path.insert(0, "/home/chunyen/.claude/mcp-servers/memcp/src")

from memcp.core.memory import remember

# Importance mapping: lancedb 1-5 → memcp low/medium/high/critical
IMPORTANCE_MAP = {
    1: "low",
    2: "low",
    3: "medium",
    4: "high",
    5: "critical",
}

# Category mapping: lancedb → memcp
CATEGORY_MAP = {
    "preference": "preference",
    "fact": "fact",
    "decision": "decision",
    "entity": "fact",  # memcp has no 'entity' category
    "other": "general",
}

# All 11 memories from memory-lancedb-pro
MEMORIES = [
    # === Global scope (3) → project="_global" ===
    {
        "content": "使用者 chunyen 是碩士生，同時在鴻海（Foxconn/Hon Hai）擔任實習生。目前正在準備投稿一篇名為 MACS 的論文，需要同時進行實驗優化與論文撰寫。",
        "category": "entity",
        "importance": 5,
        "scope": "global",
    },
    {
        "content": "使用者的教授很機車（難搞、要求嚴格）",
        "category": "fact",
        "importance": 3,
        "scope": "global",
    },
    {
        "content": "未來計畫：實做一個 skill 叫做「誘餌」，用途是在程式碼中故意留一些漏洞/小問題，讓教授審查時能抓到並修正，給教授成就感，策略性地幫助順利畢業",
        "category": "other",
        "importance": 3,
        "scope": "global",
    },
    # === Project scope (8) → project="main-agent" ===
    {
        "content": "使用者想要建立一個「夜間 Agent」，能在夜間自動執行專案任務（例如跑實驗、整理資料等），無需人工介入。屬於未來計畫，尚未開始實作。",
        "category": "decision",
        "importance": 4,
        "scope": "project",
    },
    {
        "content": "進度量化的部份可以往軟體工程方向研究，例如用軟體工程的專案管理方法論來量化各專案（論文、實驗、報告）的完成度與追蹤進度。這是 Dashboard 進度追蹤功能的未來發展方向。",
        "category": "decision",
        "importance": 4,
        "scope": "project",
    },
    {
        "content": "Central Command 專案完整架構：前端 Next.js 16.1.6 + React 19.2.3 + Tailwind CSS 4，後端 Hono 4.7.4 + TypeScript，MCP Server 整合，WebSocket 即時通訊。Server port 4000, WS 4001, Dashboard 3000。",
        "category": "fact",
        "importance": 5,
        "scope": "project",
    },
    {
        "content": "Central Command 已重構為單機多 Agent 架構。Machine 概念完全替換為 Agent。Server port 4000, WS 4001, Dashboard 3000。API 路徑使用 /api/agents。",
        "category": "decision",
        "importance": 5,
        "scope": "project",
    },
    {
        "content": "Agent 團隊互動模式：(A) 透過 Main Agent 分工 — 使用者跟 Main Agent 說需求，它拆解分配給其他 Agent；(B) 直接跟特定 Agent 對話 — 例如專注寫論文時直接跟 Paper Agent 對話。兩種模式可隨時切換。",
        "category": "decision",
        "importance": 4,
        "scope": "project",
    },
    {
        "content": "Evolve Agent（/mnt/d/WorkSpace/evolve-agent/）：自我進化探索者，負責搜尋、評估、推薦新的 Claude Code skill、MCP server、plugin，讓整個 Agent 團隊持續進化。",
        "category": "decision",
        "importance": 4,
        "scope": "project",
    },
    {
        "content": "Agent 協作體系（/mnt/d/WorkSpace/）共 6 個 Agent：main-agent（中央協調、記憶管理）、research-agent（深度搜尋：論文/會議/工作/技術）、ppt-agent（投影片產出）、report-agent（日報/週報/月報）、paper-agent（碩士論文）、macs-agent（MACS 論文）。另有 evolve-agent 負責團隊進化。",
        "category": "decision",
        "importance": 5,
        "scope": "project",
    },
    {
        "content": "Central Command 專案位於 /mnt/d/WorkSpace/central-command/，是一個 monorepo（npm workspaces: server + dashboard），負責管理所有 Agent 的狀態、通訊、任務分配。",
        "category": "decision",
        "importance": 5,
        "scope": "project",
    },
]


def main():
    migrated = 0
    duplicates = 0

    for mem in MEMORIES:
        project = "_global" if mem["scope"] == "global" else "main-agent"
        category = CATEGORY_MAP.get(mem["category"], "general")
        importance = IMPORTANCE_MAP.get(mem["importance"], "medium")

        try:
            result = remember(
                content=mem["content"],
                category=category,
                importance=importance,
                project=project,
            )

            if result.get("_duplicate"):
                print(f"  [SKIP] duplicate: {mem['content'][:50]}...")
                duplicates += 1
            else:
                print(f"  [OK]   {project:12s} | {importance:8s} | {mem['content'][:50]}...")
                migrated += 1
        except Exception as e:
            print(f"  [ERR]  {e}: {mem['content'][:50]}...")

    print(f"\nDone: {migrated} migrated, {duplicates} duplicates skipped.")


if __name__ == "__main__":
    main()
