## Why

目前 memcp（記憶庫）的安裝腳本、hook scripts、skills、CLAUDE.md 協議全部打包在 system-agent repo 中。實際部署測試發現 memcp 安裝流程（Python venv、pip install）與 system-agent 的 Node.js 環境耦合過緊，造成安裝失敗或環境衝突。將 memcp 拆為獨立 GitHub repo，讓使用者可以分開安裝、獨立版本控制，也降低 system-agent 的複雜度。

## What Changes

- **BREAKING** 從 `scripts/setup.sh` 移除 memcp 安裝段落（clone、venv、pip install）
- **BREAKING** 從 `scripts/setup.sh` 移除 memcp 相關 hook scripts 生成（session-start、pre-compact、stop、reset-counter）
- **BREAKING** 從 `scripts/setup.sh` 移除 `~/.claude/mcp.json` 中 memcp server 設定的自動寫入
- **BREAKING** 從 `scripts/setup.sh` 移除 `~/.claude/settings.json` 中 memcp MCP tool permissions 的自動寫入
- 將 `claude-config/skills/memcp-session-start/`、`memcp-save/`、`memcp-search/` 三個 skills 移至獨立 repo
- 將 `claude-config/CLAUDE.md` 中的 memcp 協議區段移至獨立 repo
- 更新 README.md / README.zh-TW.md，移除 memcp 安裝說明，改為指向獨立 repo
- 更新 `docs/agentic-me.md` 中 memcp 章節，改為外部連結
- setup.sh 保留一個提示訊息，告知使用者去獨立 repo 安裝 memcp

## Capabilities

### New Capabilities
- `memcp-extraction`: 定義哪些檔案與設定需要從 system-agent 移除，以及獨立 repo 的結構規劃

### Modified Capabilities

## Impact

- **scripts/setup.sh**：大幅刪減 memcp 安裝區段（約 100+ 行）
- **claude-config/**：移除 3 個 memcp skills 目錄、CLAUDE.md 中 memcp 協議段落
- **docs/**：README.md、README.zh-TW.md、agentic-me.md 需更新
- **server/src/config.ts**：memcpDataDir 設定保留（Dashboard 讀取 graph.db 不受影響，memcp 仍安裝在本機）
- **server/src/services/memory-browser.ts**：保留（runtime 讀取不依賴安裝流程）
- **使用者影響**：現有使用者需額外 clone 獨立 repo 安裝 memcp
