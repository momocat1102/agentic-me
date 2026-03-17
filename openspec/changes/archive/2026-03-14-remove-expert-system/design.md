## Context

Agentic Me 系統原有三層能力機制：Expert Skills（`/switch` 手動切換）、Skills（description 自動觸發）、Subagents（自主派遣）。Expert 與後兩者功能高度重疊，移除後系統更清晰。

## Goals / Non-Goals

**Goals:**
- 完全移除 `/switch` 專家模式系統的所有痕跡
- 清理 Server API、Dashboard UI、CLI 檔案、設定檔、跨專案文件
- 確保 tsc 和 next build 通過

**Non-Goals:**
- 不修改 skills 或 subagents（它們已是正確的替代方案）
- 不遷移 expert 知識到其他地方（skills 已包含同等能力）

## Decisions

1. **完全移除而非降級**：expert 知識已被 skills 覆蓋，無需保留為備份
2. **同步清理所有引用**：包括 5 個外部專案的 CLAUDE.md，避免殘留引用造成困惑
3. **Dashboard Promise.all 解構調整**：移除 `expertData` 後，確保後續變數索引正確偏移

## Affected Files

### Deleted
- `server/src/routes/experts.ts` — 整個 API route
- `~/.claude/commands/switch.md` — /switch command
- `~/.claude/experts/` — 9 個 expert 知識檔（ai-engineer, research, paper, web-dev, ppt, debug, code-review, data-analysis, devops）

### Modified (Server)
- `server/src/index.ts` — 移除 import 和 route 註冊
- `server/src/types/index.ts` — 移除 Expert interface 和 AgentsConfig.experts 欄位

### Modified (Dashboard)
- `dashboard/src/lib/api.ts` — 移除 Expert interface 和 api.experts.list()
- `dashboard/src/app/page.tsx` — 移除 experts state、Promise.all 呼叫、專家模式 section、ExpertCard 元件
- `dashboard/src/app/guide/page.tsx` — 移除 experts 陣列、架構圖 Expert Skills 行、專家模式一覽 section、Expert vs Subagent 比較框

### Modified (Config)
- `agents.json` — 移除 experts 陣列
- `CLAUDE.md`（專案）— 移除進度項目

### Modified (Cross-project)
- `~/.claude/CLAUDE.md` — 移除專家切換段落
- `/mnt/d/WorkSpace/main-agent/CLAUDE.md`
- `/mnt/d/WorkSpace/foxconn-report/CLAUDE.md`
- `/mnt/d/WorkSpace/lab-weekly/CLAUDE.md`
- `/mnt/d/WorkSpace/macs-coder/CLAUDE.md`
- `/mnt/d/WorkSpace/master-thesis/CLAUDE.md`
- `docs/agentic-me.md` — 約 29 處 expert 相關段落
