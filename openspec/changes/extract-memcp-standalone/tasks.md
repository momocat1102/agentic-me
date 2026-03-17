## 1. 建立獨立 repo 結構

- [x] 1.1 建立 `memcp-pro` 資料夾，初始化 git repo，建立目錄結構（hooks/、skills/、config/、docs/）
- [x] 1.2 建立 `config/permissions.json`：所有 memcp MCP tool permissions 列表
- [x] 1.3 建立 `config/mcp-server.json`：memcp MCP server 設定片段（使用 $HOME 變數）
- [x] 1.4 將 `claude-config/CLAUDE.md` 中記憶管理協議搬到 `config/CLAUDE.md`

## 2. 搬移 hooks 到獨立 repo

- [x] 2.1 從 setup.sh 擷取 memcp-session-start.sh 的「記憶讀取」部分（不含 Central Command），寫入 `hooks/memcp-session-start.sh`
- [x] 2.2 從 setup.sh 擷取 memcp-pre-compact.sh，寫入 `hooks/memcp-pre-compact.sh`
- [x] 2.3 從 setup.sh 擷取 memcp-stop.sh，寫入 `hooks/memcp-stop.sh`
- [x] 2.4 從 setup.sh 擷取 memcp-reset-counter.sh，寫入 `hooks/memcp-reset-counter.sh`

## 3. 搬移 skills 到獨立 repo

- [x] 3.1 複製 `claude-config/skills/memcp-session-start/SKILL.md` → `skills/memcp-session-start/SKILL.md`
- [x] 3.2 複製 `claude-config/skills/memcp-save/SKILL.md` → `skills/memcp-save/SKILL.md`
- [x] 3.3 複製 `claude-config/skills/memcp-search/SKILL.md` → `skills/memcp-search/SKILL.md`

## 4. 建立 install.sh

- [x] 4.1 前置檢查段落：Python 3.11+、sqlite3、Claude Code、jq（無 jq 時 fallback 用 python3 json 模組）
- [x] 4.2 memcp 核心安裝：git clone → python3 -m venv → pip install -e ".[all]" → 驗證 `import memcp`
- [x] 4.3 Hooks 安裝：cp hooks/*.sh → ~/.claude/hooks/，chmod +x
- [x] 4.4 Skills 安裝：cp -r skills/memcp-*/ → ~/.claude/skills/
- [x] 4.5 MCP 設定合併（關鍵）：用 jq + `--arg` 注入展開後的絕對路徑到 ~/.claude/mcp.json 的 `.mcpServers.memcp`，確保 JSON 中是實際路徑而非 `$HOME`
- [x] 4.6 Permissions 合併：用 jq 將 config/permissions.json 的 allow 列表合併到 settings.json（去重 unique）
- [x] 4.7 Hooks 設定合併：用 jq 合併 SessionStart/PreCompact/Stop/PostToolUse 到 settings.json 的 .hooks（去重檢查 command 欄位）
- [x] 4.8 CLAUDE.md 提示：詢問是否自動附加記憶管理協議到 ~/.claude/CLAUDE.md
- [x] 4.9 最終驗證：檢查 mcp.json 有 memcp entry + command 路徑存在 + settings.json 有 permissions + hooks 可執行，輸出安裝摘要

## 5. 建立 uninstall.sh

- [x] 5.1 移除 hooks：rm memcp-*.sh
- [x] 5.2 移除 skills：rm -rf memcp-{session-start,save,search}
- [x] 5.3 從 mcp.json 移除 memcp entry（jq）
- [x] 5.4 從 settings.json 移除 memcp permissions 和 hook 設定（jq）
- [x] 5.5 詢問是否移除 memcp 本體（~/.claude/mcp-servers/memcp/）
- [x] 5.6 提示 CLAUDE.md 需手動清理

## 6. 建立 README

- [x] 6.1 建立 README.md（英文）：功能說明、prerequisites、quick start、安裝內容表格、與 Agentic Me 的關係
- [x] 6.2 建立 README.zh-TW.md（繁中）
- [x] 6.3 建立 docs/advanced.md：進階設定說明（scope、retention、跨專案存取）
- [x] 6.4 加入 LICENSE（MIT）

## 7. system-agent setup.sh 清理

- [x] 7.1 移除 setup.sh 中 memcp clone/venv/pip install 段落（lines 81-106），替換為提示訊息指向 memcp-pro repo
- [x] 7.2 移除 setup.sh 中 Python 前置檢查（lines 60-65，改為 optional warning）
- [x] 7.3 移除 setup.sh 中 mcp.json 的 memcp server 設定（只保留 central-command）
- [x] 7.4 拆分 memcp-session-start.sh：建立新的 cc-session-start.sh（只含 Central Command 部分），移除原本的 memcp-session-start.sh 生成
- [x] 7.5 移除 setup.sh 中 memcp-pre-compact.sh、memcp-stop.sh、memcp-reset-counter.sh 生成
- [x] 7.6 移除 settings.json 中所有 `mcp__memcp__*` permissions
- [x] 7.7 更新 settings.json hooks：SessionStart 改指向 cc-session-start.sh，移除 PreCompact hook，Stop 只保留 cc-progress-stop.sh，移除 PostToolUse hook
- [x] 7.8 更新 setup.sh 最後的安裝摘要，移除 memcp 相關項目，加入 memcp-pro repo 提示

## 8. system-agent Skills 和 CLAUDE.md 清理

- [x] 8.1 刪除 `claude-config/skills/memcp-session-start/` 目錄
- [x] 8.2 刪除 `claude-config/skills/memcp-save/` 目錄
- [x] 8.3 刪除 `claude-config/skills/memcp-search/` 目錄
- [x] 8.4 更新 `claude-config/CLAUDE.md`：移除 memcp 協議段落，替換為一行指向 memcp-pro 的提示

## 9. system-agent 文件更新

- [x] 9.1 更新 README.md：移除 memcp 安裝說明和 Python 前置條件，加入 memcp-pro repo 連結
- [x] 9.2 更新 README.zh-TW.md：同上
- [x] 9.3 更新 docs/agentic-me.md：memcp 章節簡化為概念介紹 + memcp-pro repo 連結

## 10. 推送獨立 repo

- [x] 10.1 在 GitHub 建立 momocat1102/memcp-pro repo
- [x] 10.2 推送所有檔案到 main branch
- [x] 10.3 確認 README 在 GitHub 上正確顯示

## 11. 驗證

- [x] 11.1 測試 memcp-pro 的 install.sh — 5/5 驗證通過，非破壞性合併正確
- [x] 11.2 確認 system-agent 的 setup.sh 不再安裝 memcp、不建立 memcp hooks
- [x] 11.3 確認 system-agent server 端 memory-browser.ts 和 config.ts 未被修改
- [x] 11.4 確認 memcp-pro install.sh 與現有設定（central-command、playwright）共存無衝突
