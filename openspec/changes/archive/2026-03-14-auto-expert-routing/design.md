## Context

系統原有 19 個 skill + 9 個 expert。Expert 需手動 `/switch` 切換（含 wrap-up + compact），skill 則由 Claude Code 根據 description 自動觸發。研究了 ECC 和 superpowers 兩個框架後，直接引入 11 個設計成熟的 skill。

## Goals / Non-Goals

**Goals:**
- 從 ECC 和 superpowers 引入 11 個高價值 skill
- 利用 Claude Code 原生的 description 自動觸發機制
- 零改動現有系統（純增量）

**Non-Goals:**
- 不轉換現有 expert 為 skill（保持 experts/ 不動）
- 不修改 /switch 命令
- 不修改任何 hooks

## Decisions

1. **直接引入而非自己重寫**：兩個 repo 的 skill 經過實戰驗證，直接取用比自己寫更可靠
2. **微調 description 以符合使用情境**：保留原始內容精髓，但調整 description 欄位確保觸發精準
3. **移除 superpowers 特有的跨 skill 引用**：原始 skill 中引用了 superpowers 專屬路徑（如 `skills/architecture/preserving-productive-tensions`），已移除或改為通用描述
4. **不安裝 suggest-compact.sh hook**：strategic-compact 的 hook 腳本暫不安裝，先用 skill 文件指引即可

## Risks / Trade-offs

- **Skill 數量膨脹**（19→30）：更多 skill = Claude 需要更多 token 來處理 description 列表，但每個 description 只有 1-2 行，影響很小
- **部分 skill 與 expert 功能重疊**：如 python-patterns 和 ai-engineer expert 有交集，但不衝突（skill 是 Python 通用，expert 是 AI/ML 專項）
- **Superpowers 工作流鏈的不完整性**：引入了 brainstorming → writing-plans → subagent-driven-dev → finishing-branch 的鏈條，但未引入 executing-plans 和 using-git-worktrees（未來可選）
