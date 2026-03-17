## Why

目前的 `/switch <expert>` 命令切換成本高（wrap-up → compact → inject 三階段），造成上下文損失和延遲。研究了 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 和 [superpowers](https://github.com/obra/superpowers) 後，發現更高效的模式：利用 Claude Code 原生的 skill 自動觸發機制，從這兩個成熟框架中引入高價值 skill，擴展系統能力。

## What Changes

- 從 superpowers 引入 6 個 skill：brainstorming、when-stuck、writing-plans、subagent-driven-development、verification-before-completion、finishing-a-development-branch
- 從 everything-claude-code 引入 5 個 skill：verification-loop、python-patterns、python-testing、search-first、strategic-compact
- 所有 skill 透過 Claude Code 原生 description 機制自動觸發，無需手動 `/switch`
- 現有 experts 和 `/switch` 保持不動（向後相容）

## Capabilities

### New Capabilities
- `skill-import`: 從外部 repo 引入 11 個高價值 skill 到 `~/.claude/skills/`

### Modified Capabilities

（無修改現有能力）

## Impact

- 新增 11 個 `~/.claude/skills/<name>/SKILL.md` 檔案
- 不影響任何現有系統（experts、commands、hooks、server、dashboard）
- skill 數量從 19 增加到 30
