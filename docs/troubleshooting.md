# 常見問題排查

| 問題 | 原因 | 解法 |
|------|------|------|
| Dashboard 顯示連線失敗 | Server (port 4000) 沒啟動 | `cd /mnt/d/WorkSpace/system-agent && npm run dev:server` |
| Hook 沒觸發 | settings.json 設定錯誤或腳本無執行權限 | 檢查 settings.json hooks 區塊、`chmod +x` |
| 進度沒更新 | 沒有呼叫 MCP tools | 使用 `/progress` 或手動呼叫 `update_progress` |
| Agent 不在 Dashboard 上 | agents.json 沒有註冊 | 編輯 agents.json 加入新 Agent |
| tmux 裡 claude 說 nested session | cc session 的 CLAUDECODE 變數被繼承 | 開獨立 session：`tmux new-session -s night` |
| 重啟後排程消失 | stop.sh 用 kill -9 沒 flush WAL | 已修復，用 `bash restart.sh` 即可 |
| 夜班 Dashboard 沒更新 | Claude 還在互動階段，尚未 curl | 去 tmux 看 Claude 是否在等你回答問題 |
| 排程被 Circuit Breaker 停止 | 連續 3 次 failed 自動 disable | 修正問題後用「重置」按鈕清除失敗計數，再啟用 |
