## 1. 安裝 cc-connect

- [x] 1.1 安裝 cc-connect（npm install -g cc-connect）
- [x] 1.2 驗證安裝成功（cc-connect --version） → v1.2.1

## 2. Discord Bot 設定

- [x] 2.1 建立 Discord Bot 申請操作指南文件 → docs/discord-bot-setup.md
- [x] 2.2 使用者完成 Discord Developer Portal 操作（Bot Token + Intents + 邀請）

## 3. cc-connect 設定檔

- [x] 3.1 建立 ~/.cc-connect/config.toml，設定 system-agent 專案（Discord + Claude Code）
- [x] 3.2 加入其他常用專案的 multi-project 設定（system-agent, macs-coder, master-thesis, main-agent）
- [x] 3.3 設定 thread_isolation 和 allow_from 安全限制（User ID 白名單）

## 4. 啟動整合

- [x] 4.1 建立 cc-connect 啟停腳本（整合進 start.sh / stop.sh）
- [x] 4.2 測試啟動 cc-connect → Bot「老賈#4188」連線成功，4 專案載入，27 slash commands 註冊

## 5. 進階設定（可選）

- [ ] 5.1 設定自訂 slash commands 對應 Central Command 查詢
- [ ] 5.2 設定 daemon 模式（cc-connect daemon install + start）
