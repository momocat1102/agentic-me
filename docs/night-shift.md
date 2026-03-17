# 夜班排程使用流程

## 啟動夜班（標準流程）
```bash
# 1. 開獨立 tmux session（不要用 cc session，會有環境變數衝突）
tmux new-session -s night -n shift

# 2. 啟動 Claude Code
claude

# 3. 執行夜班 command（描述任務，或傳入排程 ID）
/night-shift 幫我在 macs-coder 跑 LiveCodeBench 實驗
```

## 執行流程（自動）
```
Claude 互動式問你選專案、幾輪
  → curl 建排程到 CC
  → curl 回報 "running" → Dashboard 顯示執行中
  → 執行任務
  → 自我審查
  → curl 回報 "completed" → Dashboard 更新
  → READY? 停止 / NEEDS_WORK? 下一輪
```

## 監控方式
- Dashboard：`http://localhost:3000/schedules`
- tmux：`tmux attach -t night`
- API：`curl http://localhost:4000/api/schedules/runs?limit=5`

## 注意事項
- 必須開**獨立** tmux session，不要在 `cc` session 開 window（CLAUDECODE 環境變數衝突）
- 排程建好後不會自動定時跑，需手動用 `/night-shift` 啟動
- 搭配 `/loop 30m /night-shift <id>` 可做定時巡邏
- Server 重啟時會 graceful shutdown（SIGTERM → WAL checkpoint），DB 資料不會遺失
