## Why

目前專案生命週期有 6 個 commands（kickoff, standup, progress, review, done, overview），職責高度重疊：done、review、progress 三者都能「看進度 + 更新進度」，使用者不知道該用哪個。此外 standup 和 kickoff 仍引用已移除的 `/switch` 專家模式。整體缺乏一條清晰的工作流主線，需要精簡並定義明確的使用時機。

## What Changes

- **精簡 commands 為 4 個**，明確分工：
  - `/kickoff` — 建專案（保留，強化 ready-to-work 體驗）
  - `/standup` — 開始工作（合併 overview 的全域檢視功能）
  - `/progress` — 工作中看/更新進度（保留，純互動式）
  - `/done` — 結束工作（精簡為 task log + openspec sync + 知識提取）
- **移除 `/review`** — 職責拆分給 standup（回顧昨天）和 done（session 收尾），或改由 progress-reviewer subagent 按需派遣
- **移除 `/overview`** — 合併進 standup 的 Step 1
- **清除所有 `/switch` 引用** — kickoff.md、standup.md 中的過時參考
- **強化 `/kickoff`** — 確保 openspec init + git init + CLAUDE.md + CC 註冊一步到位，使用者進專案就能直接開工
- **釐清 `/done` 定位** — 純 session 收尾工具，不做 review 分析或建議下一步

## Capabilities

### New Capabilities
- `project-lifecycle`: 定義專案生命週期的 4 個階段（kickoff → standup → work → done）及各 command 的職責邊界

### Modified Capabilities
（無既有 spec 需修改）

## Impact

- 檔案變更：`~/.claude/commands/` 下的 6 個 `.md` 檔案（改 4 個、刪 2 個）
- 全域 CLAUDE.md 中的 command 引用需同步更新
- 各專案 CLAUDE.md 模板（kickoff 生成的）需更新 Work Guidelines 段落
- progress-reviewer subagent 可能需要調整以承接原 /review 的部分職責
