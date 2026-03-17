# AI Coding Assistant 方案比較 — 3 人重度使用

> 調查日期：2026-03-08
> 情境：3 個人（同實驗室），每天重度使用 AI coding assistant
> 需求：強力 coding agent 能力（自主多步驟、多檔案編輯、debug）

---

## 一、所有方案總覽

### A. Claude Code MAX（Anthropic）

Claude Code 是目前最強的 agentic coding 工具，Terminal 原生 CLI，支援自主多步驟規劃、多檔案編輯、終端指令執行、多 Agent 平行處理。

| 方案 | 月費 | 每人月費（3人共用） | 額度（相對 Pro） | Claude Code |
|------|------|-------------------|-----------------|-------------|
| MAX 5x 共用 | $100 | **~$33** | 5x ÷ 3 ≈ 1.7x/人 | ✅ |
| MAX 20x 共用 | $200 | **~$67** | 20x ÷ 3 ≈ 6.7x/人 | ✅ |
| MAX 5x 各自買 | $300 | **$100** | 5x/人（完整） | ✅ |

- 優勢：Bug 修復評分 8.5/10、演算法 accept rate 48%、1M token context
- 風險：共用違反 ToS，可能被封帳號
- 被封後果：不退費、雲端資料可能遺失

### B. GitHub Copilot

IDE 整合型工具（VS Code、JetBrains 等），支援多模型切換（GPT + Claude + Gemini）。2026 年起支援在 GitHub 上使用 Claude 和 Codex 作為第三方 Coding Agent。

| 方案 | 每人月費 | Premium Request/月 | 可用 Claude 模型 | Agent 能力 |
|------|---------|-------------------|-----------------|-----------|
| Free | $0 | 50 | Haiku 4.5 | Agent Mode（IDE 內） |
| Pro | **$10** | 300 | Sonnet + Opus | Agent Mode + Coding Agent |
| Pro+ | **$39** | 1,500 | 同上 | 同上，配額更多 |
| Business | **$19**/人 | 300 | 同上 | 同上 + 管理功能 |

Premium Request 乘數（使用 Claude 模型時）：
- Sonnet 4.6：1x（Pro 方案可用 300 次）
- Opus 4.5：3x（Pro 方案可用 100 次）
- Opus 4.6：3-10x（Pro 方案可用 30-100 次）

超額費：$0.04/次。重度使用每月可能多 $30-50。

Agent Mode vs Coding Agent：
- **Agent Mode**（IDE 內）：即時 pair programming，在 IDE 裡自動改多個檔案、跑測試、修錯誤
- **Coding Agent**（GitHub Actions）：非同步，assign issue 給 Copilot → 自動 clone、寫 code、跑測試、開 PR

### C. Anthropic Team Plan

企業級方案，有完整管理後台、用量追蹤 Dashboard、SSO。

| 方案 | 每人月費 | Claude Code | 額度 | 管理功能 |
|------|---------|-------------|------|---------|
| Standard | **$25**（年付 $20） | ❌ 無 | 1.25x | ✅ |
| Premium | **$125**（年付 $100） | ✅ 有 | ~6.25x | ✅ |

- 最低 5 人起，最高 150 人
- Standard 不含 Claude Code
- 內建：用量分析、花費排行、CSV 匯出、座位管理

### D. 其他工具

| 工具 | 每人月費 | 支援模型 | Agent 能力 | 備註 |
|------|---------|---------|-----------|------|
| Cursor | $20 | Claude + GPT + 其他 | 中等（IDE 內） | VS Code fork，體驗好 |
| Windsurf | $15 | Claude + GPT + 其他 | 中等（IDE 內） | 較便宜 |
| aider（開源） | 免費 + API 費 | 任何模型 | 中等（CLI） | 重度使用 API 費很高 |

---

## 二、Agent 能力對比：Copilot vs Claude Code

| 維度 | Copilot Agent Mode | Claude Code |
|------|-------------------|-------------|
| 運行環境 | IDE 內（VS Code 等） | Terminal（任何環境） |
| 自主程度 | 中等 | 高（多步驟自主規劃） |
| Bug 修復評分 | 5.9/10 | **8.5/10** |
| 演算法 accept rate | 31% | **48%** |
| Boilerplate 生成 | **52%** accept | 較弱 |
| 多檔案編輯 | ✅ | ✅（跨檔案依賴理解更深） |
| 終端指令執行 | 可建議並執行 | 直接執行 bash |
| 多 Agent 平行 | ❌ | ✅ |
| 非同步任務 | 需用 Coding Agent | 本身就是 agent |
| 多模型選擇 | ✅ GPT+Claude+Gemini | ❌ Claude only |
| Context Window | 依模型而定 | Opus 4.6 支援 1M tokens |

**結論**：日常 coding 和 boilerplate → Copilot 夠用。複雜重構、深度 debug、大型架構變更 → Claude Code 明顯更強。

---

## 三、3 人方案比較（按每人月費排序）

| 方案 | 每人月費 | 總月費 | Agent 強度 | 額度充足度 | 合法 |
|------|---------|--------|-----------|-----------|------|
| Copilot Pro | **$10** | $30 | ⭐⭐⭐ | ⚠️ 300 premium，重度不夠 | ✅ |
| MAX 5x 共用 | **~$33** | $100 | ⭐⭐⭐⭐⭐ | ⚠️ 1.7x/人，會撞限 | ❌ |
| Copilot Pro+ | **$39** | $117 | ⭐⭐⭐ | 🟡 1500 premium，勉強夠 | ✅ |
| Copilot Pro + MAX 5x 共用 | **~$43** | $130 | ⭐⭐⭐⭐⭐ | ✅ 日常+複雜混合 | 🟡 |
| Copilot Pro（含超額費） | **~$40-55** | $120-165 | ⭐⭐⭐ | ✅ 按需付費 | ✅ |
| MAX 20x 共用 | **~$67** | $200 | ⭐⭐⭐⭐⭐ | ✅ 6.7x/人 | ❌ |
| MAX 5x 各自買 | **$100** | $300 | ⭐⭐⭐⭐⭐ | ✅ 完整 5x | ✅ |
| Team Premium 年付 | **$100** | $500（5席） | ⭐⭐⭐⭐⭐ | ✅ ~6.25x | ✅ |

---

## 四、推薦方案

### 🥇 最佳性價比（有風險）：Copilot Pro + MAX 5x 共用 — $43/人/月

- 每人各自買 Copilot Pro（$10/月，合法）
- 共用一個 Claude Code MAX 5x（$100/月 ÷ 3 ≈ $33/人）
- 日常寫 code 用 Copilot Agent Mode（免費額度內處理基本任務）
- 需要深度 agentic coding 時才用 Claude Code（省額度）
- MAX 共用部分有 ToS 風險，但 3 人同實驗室 IP 風險較低

### 🥈 最佳合法方案：Copilot Pro+ — $39/人/月

- 1,500 premium request/月
- 重度 Sonnet 使用：每天約 68 次（22 工作天）
- 有 Agent Mode + Coding Agent + 可在 IDE 中使用 Claude 模型
- 完全合法，各自獨立帳號，不用擔心被封

### 🥉 最強體驗：各自買 MAX 5x — $100/人/月

- Claude Code 原生完整體驗
- 5x 額度獨享，不用搶
- 零風險，零妥協
- 適合預算充足且需要最強 agent 能力的情境

---

## 五、共用 MAX 帳號的風險評估

### Anthropic 偵測機制

| 偵測方式 | 說明 |
|---------|------|
| IP 監控 | 不同地區頻繁切換 IP → 紅旗 |
| 裝置指紋 | 不同瀏覽器/OS/hostname → 可疑 |
| 使用模式 | 24 小時不間斷、多人風格差異大 → 可疑 |
| 同時 session | 多裝置同時重度使用 → 可疑 |

### 你們的情境評估

| 因素 | 你們的狀況 | 風險等級 |
|------|-----------|---------|
| IP 位置 | 同實驗室，同 IP | 🟢 低 |
| 裝置數量 | 3 台不同電腦 | 🟡 中低（像一人多台工作機） |
| 付費方式 | 月付 | 🟢 損失可控（最多 $100） |
| 被封後果 | 損失當月費用 + 雲端資料 | 🟡 中 |
| 同時使用 | 可能同時 2-3 人用 | 🟡 注意別同時用 Opus |

### 被封帳號的後果

- 無預警立即封禁，沒有警告
- 所有雲端資料（對話、Projects、Artifacts）可能永久遺失
- 因違規被停權不退費
- 申訴管道：usersafety@anthropic.com，需等 5-15 個工作天，成功率低

### 降低風險的做法

1. 月付，不要年付（降低財務損失）
2. 不要 3 人同時大量使用 Opus（最貴的模型，額度最少）
3. 重要資料不要只存在 Claude 雲端
4. 心理準備隨時可能被封，要有 Plan B

---

## 六、參考資料

- [Claude Max Plan Pricing](https://claude.com/pricing/max)
- [Claude Team Plan](https://support.claude.com/en/articles/9266767-what-is-the-team-plan)
- [GitHub Copilot Plans](https://github.com/features/copilot/plans)
- [Copilot Premium Requests](https://docs.github.com/en/copilot/concepts/billing/copilot-requests)
- [Copilot Supported AI Models](https://docs.github.com/en/copilot/reference/ai-models/supported-models)
- [Copilot Agent Mode vs Coding Agent](https://github.blog/developer-skills/github/less-todo-more-done-the-difference-between-coding-agent-and-agent-mode-in-github-copilot/)
- [Agent HQ: Claude + Codex on GitHub](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)

> 注意：部分數據（如 premium request 乘數、Agent 評分）來自第三方測試和社群回報，非 Anthropic/GitHub 官方公布，可能有誤差。額度和定價可能隨時調整，請以官方頁面為準。
