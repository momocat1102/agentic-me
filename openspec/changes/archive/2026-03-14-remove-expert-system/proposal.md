## Why

`/switch` 專家模式系統（wrap-up → compact → inject 三階段切換）已被 skills 和 subagents 完全取代：

- **Skills**（如 `/ppt-gen-pro`、`/debug`）透過 description 自動觸發，零切換成本
- **Subagents**（如 `ai-engineer`、`debugger`）處理派遣型任務，自帶完整知識

Expert 與上述兩者高度重疊（例如 `ai-engineer` expert vs `ai-engineer` subagent），保留只會造成混亂。使用者確認不再需要。

## What Changes

- 移除 `/switch` command 和 `~/.claude/experts/` 目錄（9 個 .md 檔）
- 移除 Server 端 `/api/experts` route 和相關型別
- 移除 Dashboard 首頁「專家模式」section 和 Guide 頁面的 expert 相關內容
- 清理 `agents.json` 的 experts 陣列
- 清理全域和 5 個跨專案 CLAUDE.md 中的 `/switch` 引用
- 清理 `docs/agentic-me.md` 中約 29 處 expert 相關段落

## Impact

- 無 DB 變更（experts 不在資料庫中，純檔案+API）
- Dashboard 首頁更簡潔，不再有多餘的「專家模式」區塊
- Guide 頁面移除 Expert Skills 架構行、專家模式一覽、Expert vs Subagent 比較框
- 向前簡化：使用者只需記住 skills（自動觸發）和 subagents（派遣式）兩種機制
