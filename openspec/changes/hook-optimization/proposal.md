# Hook System Optimization

## Status
draft

## Motivation
現有 hook 系統有幾個痛點：PreCompact 知識提取有時不觸發、session 計數器重置邏輯不穩定、stop hook 的進度提醒太頻繁。需要統一整理和優化。

## What Changes
- 審查所有 ~/.claude/hooks/ 腳本的正確性
- PreCompact hook 改善：確保知識提取流程穩定
- Stop hook 頻率調整：避免過度提醒
- 新增 hook 文件說明每個 hook 的用途和觸發條件

## Implications
- Hook 設定在 ~/.claude/settings.json
- 需要注意 hook 執行的效能（不能阻塞 Claude 回應）
