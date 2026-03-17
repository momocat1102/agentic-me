## ADDED Requirements

### Requirement: setup.sh 移除 memcp 安裝段落
setup.sh SHALL 移除所有 memcp 安裝邏輯，包含 clone、venv 建立、pip install 段落（原 lines 81-106）。

#### Scenario: 執行 setup.sh 不安裝 memcp
- **WHEN** 使用者執行 `bash scripts/setup.sh`
- **THEN** 不會 clone memcp repo，不會建立 Python venv，不會執行 pip install

### Requirement: setup.sh 移除 memcp hook 生成
setup.sh SHALL 移除所有 memcp 相關 hook scripts 的生成邏輯（session-start、pre-compact、stop、reset-counter）。

#### Scenario: 執行 setup.sh 不建立 memcp hooks
- **WHEN** 使用者執行 `bash scripts/setup.sh`
- **THEN** 不會在 `~/.claude/hooks/` 建立 memcp-session-start.sh、memcp-pre-compact.sh、memcp-stop.sh、memcp-reset-counter.sh

### Requirement: setup.sh 移除 mcp.json 中 memcp 設定
setup.sh SHALL 不再將 memcp server 設定寫入 `~/.claude/mcp.json`。

#### Scenario: 生成的 mcp.json 不含 memcp
- **WHEN** setup.sh 生成 `~/.claude/mcp.json`
- **THEN** JSON 中不包含 `"memcp"` key

### Requirement: setup.sh 移除 settings.json 中 memcp permissions
setup.sh SHALL 不再將 memcp MCP tool permissions 寫入 `~/.claude/settings.json`。

#### Scenario: 生成的 settings.json 不含 memcp permissions
- **WHEN** setup.sh 生成 `~/.claude/settings.json`
- **THEN** allowedTools 中不包含任何 `mcp__memcp__*` 項目
- **THEN** hooks 中不包含 memcp 相關 hook 觸發設定

### Requirement: setup.sh 保留 memcp 安裝提示
setup.sh SHALL 在原本安裝 memcp 的位置顯示提示訊息，引導使用者去獨立 repo 安裝。

#### Scenario: 顯示 memcp 獨立安裝提示
- **WHEN** setup.sh 執行到記憶庫段落
- **THEN** 輸出訊息包含獨立 repo 的 URL 和安裝指引

### Requirement: 移除 memcp skills
`claude-config/skills/` 下的 `memcp-session-start/`、`memcp-save/`、`memcp-search/` 三個目錄 SHALL 從 system-agent repo 中移除。

#### Scenario: Skills 目錄不包含 memcp skills
- **WHEN** 檢查 `claude-config/skills/` 目錄
- **THEN** 不存在 `memcp-session-start/`、`memcp-save/`、`memcp-search/` 子目錄

### Requirement: CLAUDE.md 移除 memcp 協議
`claude-config/CLAUDE.md` SHALL 移除記憶管理協議（memcp）相關段落，改為一行簡短說明指向獨立 repo。

#### Scenario: CLAUDE.md 不含完整 memcp 協議
- **WHEN** 讀取 `claude-config/CLAUDE.md`
- **THEN** 不包含 memcp 操作流程（smart remember、scope 選擇、知識提取協議等）
- **THEN** 包含一行提示指向獨立 repo

### Requirement: 更新 README 文件
README.md 和 README.zh-TW.md SHALL 移除 memcp 安裝說明，改為指向獨立 repo 的連結。

#### Scenario: README 不含 memcp 安裝步驟
- **WHEN** 讀取 README.md 或 README.zh-TW.md
- **THEN** 不包含 memcp 安裝步驟
- **THEN** 包含獨立 repo 的連結和簡短說明

### Requirement: 更新 agentic-me.md 文件
`docs/agentic-me.md` 中 memcp 章節 SHALL 簡化為外部連結，不再包含完整操作說明。

#### Scenario: agentic-me.md memcp 章節簡化
- **WHEN** 讀取 `docs/agentic-me.md`
- **THEN** memcp 章節只保留概念介紹和獨立 repo 連結
- **THEN** 不包含詳細的工具列表、分類規則等操作細節

### Requirement: 保留 server 端 memcp 讀取功能
server/src/config.ts 的 memcpDataDir 和 server/src/services/memory-browser.ts SHALL 保持不變。

#### Scenario: Dashboard 記憶瀏覽功能不受影響
- **WHEN** memcp 已獨立安裝在本機
- **THEN** Dashboard 的 memory browser 功能正常運作，可讀取 graph.db
