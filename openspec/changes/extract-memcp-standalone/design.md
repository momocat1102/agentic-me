## Context

system-agent repo 目前包含完整的 memcp 安裝流程（Python venv + pip install）、4 個 hook scripts、3 個 Claude Code skills、CLAUDE.md 記憶協議，以及文件中的安裝說明。部署測試顯示 memcp 的 Python 環境安裝與 system-agent 的 Node.js 生態耦合，容易產生安裝失敗。memcp 本身由 Anthropic 維護，有自己的更新節奏，與 system-agent 綁定會造成版本管理困難。

## Goals / Non-Goals

**Goals:**
- 從 system-agent setup.sh 完全移除 memcp 安裝邏輯
- 建立獨立 GitHub repo，包含 memcp 的完整安裝腳本、hooks、skills、設定
- setup.sh 中保留友善提示，引導使用者去獨立 repo 安裝
- 更新所有文件（README、docs）反映新的安裝流程
- 保留 server 端讀取 graph.db 的功能（runtime 不受影響）

**Non-Goals:**
- 不修改 memcp 本身的功能或 MCP server 實作
- 不修改 Dashboard memory-browser 服務（它只讀取 graph.db）
- 不修改 server/src/config.ts 的 memcpDataDir 設定

## Decisions

### 1. 移除策略：直接刪除，不做 deprecation period

**選擇**：直接從 setup.sh 移除 memcp 段落，改為提示訊息
**替代方案**：保留但加 warning，下個版本再移除
**理由**：system-agent 仍在早期階段（v2），使用者數量極少，不需要 deprecation period。直接切乾淨更簡潔。

### 2. setup.sh 中保留 memcp 提示位置

**選擇**：在 setup.sh 原本安裝 memcp 的位置放一段 echo 提示，告知使用者去獨立 repo 安裝
**理由**：讓執行 setup.sh 的使用者不會漏掉 memcp，但不自動安裝

### 3. settings.json 中 memcp permissions 的處理

**選擇**：從 setup.sh 生成的 settings.json 中移除所有 memcp tool permissions
**理由**：如果使用者沒裝 memcp，這些 permissions 無意義；裝了 memcp 的使用者會由獨立 repo 的安裝腳本處理

### 4. Hook scripts 的處理

**選擇**：從 setup.sh 移除所有 memcp hook scripts 的生成（session-start、pre-compact、stop、reset-counter）
**理由**：這些 hooks 完全依賴 memcp，應該跟著 memcp 走

### 5. SessionStart hook 的拆分

**選擇**：目前 `memcp-session-start.sh` 同時做兩件事：(1) 從 graph.db 讀取記憶 (2) 從 Central Command 讀取最近活動。需要拆分——memcp 部分移到獨立 repo，Central Command 部分留在 system-agent。
**做法**：
- 獨立 repo 的 hook 只保留記憶讀取部分（lines 166-195 對應邏輯）
- system-agent 建立新的 `cc-session-start.sh`，只負責 Central Command 最近活動（lines 197-214 對應邏輯）
- system-agent setup.sh 的 SessionStart hook 改指向 `cc-session-start.sh`

---

## 獨立 Repo 詳細規劃

### Repo 名稱與定位

**名稱**：`memcp-pro`
**GitHub**：`momocat1102/memcp-pro`
**定位**：memcp for Claude Code 的一鍵安裝與設定工具。不包含 memcp 本身（那由 Anthropic 維護），而是提供安裝腳本 + Claude Code 整合設定（hooks、skills、permissions、CLAUDE.md 協議）。

### 目錄結構

```
memcp-pro/
├── README.md                          # 說明文件（安裝、使用、功能介紹）
├── README.zh-TW.md                    # 繁體中文版
├── LICENSE                            # MIT
├── install.sh                         # 主安裝腳本
├── uninstall.sh                       # 解除安裝腳本
│
├── hooks/                             # Claude Code hook scripts
│   ├── memcp-session-start.sh         # SessionStart: 從 graph.db 讀取記憶注入對話
│   ├── memcp-pre-compact.sh           # PreCompact: 提醒存記憶再壓縮
│   ├── memcp-stop.sh                  # Stop: 根據輪數+context用量提醒存記憶
│   └── memcp-reset-counter.sh         # PostToolUse: memcp_remember 後重置計數器
│
├── skills/                            # Claude Code skills
│   ├── memcp-session-start/
│   │   └── SKILL.md                   # 手動觸發載入記憶的 skill
│   ├── memcp-save/
│   │   └── SKILL.md                   # 手動觸發存記憶的 skill
│   └── memcp-search/
│       └── SKILL.md                   # 搜尋記憶庫的 skill
│
├── config/                            # 設定範本與協議
│   ├── CLAUDE.md                      # 記憶管理協議（完整版，供使用者複製到 ~/.claude/CLAUDE.md）
│   ├── mcp-server.json                # memcp MCP server 設定片段
│   └── permissions.json               # memcp tool permissions 列表
│
└── docs/
    └── advanced.md                    # 進階設定（自訂 scope、retention、跨專案存取等）
```

### MCP 連接三要素（裝完即可用的關鍵）

Claude Code 啟動時透過以下 3 個設定連接 MCP server，**缺一不可**：

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code 啟動                                                │
│    ↓                                                            │
│  1. 讀取 ~/.claude/mcp.json                                     │
│     → 找到 "memcp" entry → 用 command + args 啟動 server 程序   │
│     → 若缺少此 entry → ❌ Claude 完全看不到 memcp               │
│                                                                  │
│  2. 讀取 ~/.claude/settings.json → permissions.allow             │
│     → 有 "mcp__memcp__*" → 工具自動批准，無縫使用               │
│     → 若缺少 → ⚠️ 每次呼叫都要手動批准（可用但很煩）            │
│                                                                  │
│  3. 讀取 ~/.claude/settings.json → hooks                         │
│     → SessionStart hook → 自動載入記憶到對話開頭                 │
│     → PreCompact hook → compact 前提醒存記憶                     │
│     → 若缺少 → ⚠️ 需手動觸發 /memcp-session-start（可用但不自動）│
└─────────────────────────────────────────────────────────────────┘
```

**關鍵陷阱：JSON 不支援變數展開**

`mcp.json` 是純 JSON，`$HOME` 不會被展開。install.sh 必須在安裝時把 `$HOME` 替換為實際絕對路徑再寫入：

```bash
# ❌ 錯誤：JSON 不會展開 $HOME
"command": "$HOME/.claude/mcp-servers/memcp/.venv/bin/python"

# ✅ 正確：install.sh 在寫入時展開
MEMCP_DIR="$HOME/.claude/mcp-servers/memcp"
# 用不帶引號的 heredoc，讓 shell 展開變數
cat > ~/.claude/mcp.json << EOF
{ "mcpServers": { "memcp": { "command": "$MEMCP_DIR/.venv/bin/python", ... }}}
EOF
```

但因為 install.sh 要**合併**而非覆蓋 mcp.json，實際做法是用 jq + shell 變數：

```bash
MEMCP_DIR="$HOME/.claude/mcp-servers/memcp"
MEMCP_CMD="$MEMCP_DIR/.venv/bin/python"

# 用 jq 合併 memcp entry 到現有 mcp.json
jq --arg cmd "$MEMCP_CMD" --arg cwd "$MEMCP_DIR" \
  '.mcpServers.memcp = {"command": $cmd, "args": ["-m", "memcp.server"], "cwd": $cwd}' \
  ~/.claude/mcp.json > /tmp/mcp.json.tmp && mv /tmp/mcp.json.tmp ~/.claude/mcp.json
```

### install.sh 詳細流程

```
install.sh 執行流程：

1. 前置檢查
   ├── Python 3.11+ 存在？
   ├── sqlite3 存在？（hook 需要）
   ├── Claude Code 已安裝？
   └── jq 存在？（用於合併 JSON 設定）
       └── 若無 jq → 嘗試用 python3 -c "import json..." 作為 fallback

2. 安裝 memcp 核心
   ├── MEMCP_DIR="$HOME/.claude/mcp-servers/memcp"
   ├── mkdir -p ~/.claude/mcp-servers/
   ├── git clone https://github.com/maydali28/memcp.git "$MEMCP_DIR"
   │   └── 若已存在 → cd "$MEMCP_DIR" && git pull
   ├── cd "$MEMCP_DIR" && python3 -m venv .venv
   ├── .venv/bin/pip install -e ".[all]" --quiet
   │   └── fallback: .venv/bin/pip install -e . --quiet
   └── 驗證：.venv/bin/python -c "import memcp; print('OK')"

3. 安裝 hooks
   ├── mkdir -p ~/.claude/hooks/
   ├── cp hooks/*.sh ~/.claude/hooks/
   ├── chmod +x ~/.claude/hooks/memcp-*.sh
   └── 驗證：每個 .sh 檔案存在且可執行

4. 安裝 skills
   ├── mkdir -p ~/.claude/skills/
   ├── cp -r skills/memcp-*/ ~/.claude/skills/
   └── 驗證：每個 SKILL.md 存在

5. 合併 MCP 設定 ← 【最關鍵步驟：讓 Claude Code 看到 memcp server】
   ├── MEMCP_CMD="$MEMCP_DIR/.venv/bin/python"  （絕對路徑！）
   ├── 若 ~/.claude/mcp.json 不存在 → 建立空 {"mcpServers": {}}
   ├── 用 jq 注入 memcp entry（帶展開後的絕對路徑）：
   │     jq --arg cmd "$MEMCP_CMD" --arg cwd "$MEMCP_DIR" \
   │       '.mcpServers.memcp = {
   │          "command": $cmd,
   │          "args": ["-m", "memcp.server"],
   │          "cwd": $cwd
   │        }' ~/.claude/mcp.json
   ├── 若 "memcp" key 已存在 → 直接覆蓋（更新路徑）
   └── 寫回 ~/.claude/mcp.json

6. 合併 permissions ← 【讓工具呼叫免手動批准】
   ├── 若 ~/.claude/settings.json 不存在 → 建立空 {"permissions":{"allow":[]},"hooks":{}}
   ├── 讀取 config/permissions.json 中的 allow 列表
   ├── 用 jq 合併到 .permissions.allow（去重）：
   │     jq --slurpfile new config/permissions.json \
   │       '.permissions.allow = (.permissions.allow + $new[0].allow | unique)'
   └── 寫回 ~/.claude/settings.json

7. 合併 hooks 設定 ← 【讓記憶自動載入、自動提醒】
   ├── 用 jq 合併各 hook event：
   │   ├── .hooks.SessionStart += [memcp-session-start.sh config]
   │   ├── .hooks.PreCompact += [memcp-pre-compact.sh config]
   │   ├── .hooks.Stop += [memcp-stop.sh config]  （不影響已有的 stop hooks）
   │   └── .hooks.PostToolUse += [memcp-reset-counter.sh config with matcher]
   ├── 去重：檢查 command 欄位，不加入已存在的 hook
   └── 寫回 ~/.claude/settings.json

8. 提示 CLAUDE.md 設定
   ├── 顯示：建議將 config/CLAUDE.md 的內容加入 ~/.claude/CLAUDE.md
   ├── 詢問是否自動附加
   │   └── Y → 附加到 ~/.claude/CLAUDE.md 尾部（不覆蓋現有內容）
   │   └── N → 顯示路徑，請使用者手動複製
   └── 完成

9. 最終驗證 ← 【確認裝完即可用】
   ├── ✅ mcp.json 包含 memcp entry？
   ├── ✅ mcp.json 中 command 路徑檔案存在？（.venv/bin/python 可執行？）
   ├── ✅ settings.json 包含 memcp permissions？
   ├── ✅ settings.json hooks 包含 memcp hooks？
   ├── ✅ hooks 檔案存在且可執行？
   ├── ✅ skills 目錄存在？
   └── 輸出安裝摘要 + "重啟 Claude Code 即可使用記憶功能"
```

### install.sh 關鍵設計原則

1. **非破壞性合併**：所有 JSON 設定（mcp.json、settings.json）使用 jq 合併，不覆蓋現有設定。若使用者已有其他 MCP server 或 hooks，不會被清除。
2. **冪等性**：重複執行不會造成重複項目。hooks 用檔名判斷是否已安裝，permissions 用去重邏輯。
3. **可選 CLAUDE.md**：記憶管理協議是附加到使用者的 CLAUDE.md，不覆蓋。給使用者選擇權。
4. **錯誤容忍**：單一步驟失敗不中斷整體安裝。用 warn 提示，最後匯報哪些成功哪些失敗。

### uninstall.sh 流程

```
1. 移除 hooks：rm ~/.claude/hooks/memcp-*.sh
2. 移除 skills：rm -rf ~/.claude/skills/memcp-{session-start,save,search}/
3. 從 mcp.json 移除 memcp entry（jq）
4. 從 settings.json 移除 memcp permissions（jq）
5. 從 settings.json 移除 memcp hook 設定（jq）
6. 詢問是否移除 memcp 本體：rm -rf ~/.claude/mcp-servers/memcp/
7. 提示：CLAUDE.md 中的 memcp 協議段落需手動移除
```

### config/mcp-server.json 內容

此檔案是**參考範本**，不直接寫入 mcp.json。install.sh 會讀取結構，替換 `__MEMCP_DIR__` 為實際絕對路徑後，用 jq 合併到 `~/.claude/mcp.json`。

```json
{
  "memcp": {
    "command": "__MEMCP_DIR__/.venv/bin/python",
    "args": ["-m", "memcp.server"],
    "cwd": "__MEMCP_DIR__"
  }
}
```

install.sh 中的實際寫入邏輯（使用 jq 變數注入，確保絕對路徑）：
```bash
MEMCP_DIR="$HOME/.claude/mcp-servers/memcp"
jq --arg cmd "$MEMCP_DIR/.venv/bin/python" --arg cwd "$MEMCP_DIR" \
  '.mcpServers.memcp = {"command": $cmd, "args": ["-m", "memcp.server"], "cwd": $cwd}' \
  "$MCP_CONFIG" > "$MCP_CONFIG.tmp" && mv "$MCP_CONFIG.tmp" "$MCP_CONFIG"
```

### config/permissions.json 內容

```json
{
  "allow": [
    "mcp__memcp__memcp_ping",
    "mcp__memcp__memcp_remember",
    "mcp__memcp__memcp_recall",
    "mcp__memcp__memcp_forget",
    "mcp__memcp__memcp_status",
    "mcp__memcp__memcp_search",
    "mcp__memcp__memcp_related",
    "mcp__memcp__memcp_graph_stats",
    "mcp__memcp__memcp_reinforce",
    "mcp__memcp__memcp_consolidation_preview",
    "mcp__memcp__memcp_consolidate",
    "mcp__memcp__memcp_load_context",
    "mcp__memcp__memcp_inspect_context",
    "mcp__memcp__memcp_get_context",
    "mcp__memcp__memcp_list_contexts",
    "mcp__memcp__memcp_clear_context",
    "mcp__memcp__memcp_retention_preview",
    "mcp__memcp__memcp_retention_run",
    "mcp__memcp__memcp_restore",
    "mcp__memcp__memcp_projects",
    "mcp__memcp__memcp_sessions",
    "mcp__memcp__memcp_dedup_check",
    "mcp__memcp__memcp_smart_remember",
    "mcp__memcp__memcp_access_config",
    "mcp__memcp__memcp_filter_context",
    "mcp__memcp__memcp_chunk_context",
    "mcp__memcp__memcp_peek_chunk"
  ]
}
```

### config/CLAUDE.md 內容

從目前 `claude-config/CLAUDE.md` 搬過來的完整記憶管理協議，包含：
- Memory Management Protocol（背景知識注入、何時存、Smart Dedup、Scope 選擇、不存清單）
- Knowledge Extraction Protocol（觸發時機、流程）

### README.md 結構

```markdown
# memcp-pro

One-click setup for [memcp](https://github.com/maydali28/memcp)
with Claude Code — persistent memory across sessions.

## What this does
- Installs memcp MCP server
- Configures Claude Code hooks (auto-load memories, save reminders)
- Adds memory management skills (/memcp-save, /memcp-search, /memcp-session-start)
- Sets up permissions and memory management protocol

## Prerequisites
- Python 3.11+
- sqlite3
- Claude Code CLI
- jq (for JSON config merging)

## Quick Start
git clone https://github.com/momocat1102/memcp-pro.git
cd memcp-pro
bash install.sh

## What gets installed
| Component | Location | Purpose |
|-----------|----------|---------|
| memcp server | ~/.claude/mcp-servers/memcp/ | MCP server for persistent memory |
| Hooks (4) | ~/.claude/hooks/memcp-*.sh | Auto-load, save reminders, compact protection |
| Skills (3) | ~/.claude/skills/memcp-*/ | Manual memory operations |
| MCP config | ~/.claude/mcp.json | Server registration |
| Permissions | ~/.claude/settings.json | Tool auto-approval |

## Works with Agentic Me
This is a standalone memory setup. For the full AI agent collaboration
system, see [Agentic Me](https://github.com/momocat1102/agentic-me).

## Uninstall
bash uninstall.sh
```

## Risks / Trade-offs

- **[使用者需要跑兩個安裝]** → 在 system-agent README 和 setup.sh 明確提示，提供獨立 repo 連結
- **[現有使用者升級]** → 不影響已安裝的 memcp，只是未來 setup.sh 不再自動安裝
- **[兩個 repo 的 settings.json 合併衝突]** → 獨立 repo 的 install.sh 使用 jq 合併而非覆蓋
- **[jq 依賴]** → 大部分 Linux/macOS 有 jq，若沒有提供安裝提示或 fallback 用 python json 處理
- **[SessionStart hook 拆分]** → 需要確保 system-agent 的 cc-session-start.sh 和獨立 repo 的 memcp-session-start.sh 可以共存（兩個 hook 都在 SessionStart 觸發）

## Open Questions

- 獨立 repo 是否也需要支援 Windows？（目前 hook scripts 都是 bash）
- 是否需要版本號管理？（install.sh 在 memcp 更新時做 git pull）
