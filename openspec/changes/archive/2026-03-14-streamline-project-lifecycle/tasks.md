## 1. 清除過時引用

- [x] 1.1 移除 `kickoff.md` 中的 `/switch` 引用（L99 Work Guidelines 段落）
- [x] 1.2 移除 `standup.md` 中的 `/switch` 引用（L84-91 Step 4 段落）

## 2. 移除 /review 和 /overview

- [x] 2.1 刪除 `~/.claude/commands/review.md`
- [x] 2.2 刪除 `~/.claude/commands/overview.md`
- [x] 2.3 更新全域 CLAUDE.md 中對 `/review` 和 `/overview` 的引用（已確認無引用，無需修改）

## 3. 改寫 /standup（吸收 overview + review 回顧功能）

- [x] 3.1 重寫 standup Step 1：加入全域概覽（所有專案進度 + Agent 狀態 + deadlines），取代 overview
- [x] 3.2 新增 standup Step 1.5：顯示各專案的 active OpenSpec changes 狀態
- [x] 3.3 重寫 standup Step 4：將 `/switch` 建議改為 subagent/skill 建議

## 4. 精簡 /done（純 session 收尾）

- [x] 4.1 移除 done 中的「建議下一步」相關邏輯（如有）（已確認無此邏輯）
- [x] 4.2 確認 done 的 5 步驟順序：摘要 → openspec sync → task log → 進度更新 → 知識提取（已確認正確）
- [x] 4.3 確保 done 不做 gap 分析或方向建議（已確認無此內容）

## 5. 強化 /kickoff（ready-to-work）

- [x] 5.1 確認 openspec init 步驟完整（已有 Step 3.3，驗證正確）
- [x] 5.2 更新 kickoff 生成的 CLAUDE.md 模板：移除 `/switch`、`/review`、`/overview`，整合 OpenSpec Workflow 段落到 Commands 段落
- [x] 5.3 確認 kickoff 結尾提示使用者「下一步：打開專案資料夾，開始工作」（Step 4 已正確）

## 6. 同步更新

- [x] 6.1 更新全域 `~/.claude/CLAUDE.md` 中的專案工作模式段落（已確認無引用）
- [x] 6.2 更新 system-agent CLAUDE.md 中的相關引用（已修正 /overview → 4 commands 列表）
- [x] 6.3 驗證所有 command 檔案內沒有引用已移除的 commands（已修正 night-shift.md 的 /review 引用）
