## ADDED Requirements

### Requirement: Canvas 像素渲染引擎
系統 SHALL 提供基於 HTML5 Canvas 2D 的像素風辦公室場景渲染引擎，支援 z-sort 深度遮擋、Sprite 快取、以及 requestAnimationFrame 動畫迴圈。

#### Scenario: 場景渲染啟動
- **WHEN** 使用者進入 Pixel Office 頁面
- **THEN** Canvas 初始化辦公室場景（桌椅、家具、地板），以 30+ FPS 渲染

#### Scenario: 頁面離開時暫停
- **WHEN** 使用者切換到其他 Dashboard 頁面或瀏覽器分頁不在前台
- **THEN** requestAnimationFrame 迴圈 SHALL 暫停，不消耗 CPU

### Requirement: Sprite 像素角色系統
系統 SHALL 使用 string[][] 格式的像素資料定義角色外觀，支援 HSL 著色讓每個 Agent 擁有不同配色，並按 zoom level 快取為 offscreen canvas。

#### Scenario: Agent 角色外觀分配
- **WHEN** 一個 Agent 被加入辦公室場景
- **THEN** 系統自動分配一組不重複的 palette + hueShift，確保角色外觀可區分

#### Scenario: Sprite 快取命中
- **WHEN** 同一 Sprite 在同一 zoom level 被多次渲染
- **THEN** SHALL 從快取取得預渲染的 offscreen canvas，不重複繪製

### Requirement: 角色有限狀態機
每個 Agent 角色 SHALL 擁有三態 FSM：IDLE（站立）、WALK（走路動畫）、TYPE（打字動畫）。狀態轉換由 Agent 活動狀態驅動。

#### Scenario: Agent 活動中
- **WHEN** Agent 被偵測為 working 狀態
- **THEN** 角色走到座位後進入 TYPE 狀態，頭上顯示綠色活動標籤，飄出程式碼片段粒子

#### Scenario: Agent 閒置
- **WHEN** Agent 被偵測為 idle 狀態
- **THEN** 角色離開座位進入 IDLE/WALK 狀態，在辦公室隨機漫步並與家具互動

#### Scenario: Agent 離線
- **WHEN** Agent 被偵測為 offline 狀態
- **THEN** 角色以 despawn 動畫（Matrix 數位雨效果）消失

### Requirement: 家具互動系統
辦公室場景 SHALL 包含可互動家具，使用者點擊家具時彈出資訊面板。

#### Scenario: 點擊白板
- **WHEN** 使用者點擊白板家具
- **THEN** 彈出 popover 顯示專案進度總覽（從 /api/projects 取得）

#### Scenario: 點擊電腦
- **WHEN** 使用者點擊電腦家具
- **THEN** 彈出 popover 顯示最近完成的任務列表（從 /api/tasks 取得）

#### Scenario: 點擊時鐘
- **WHEN** 使用者點擊時鐘家具
- **THEN** 彈出 popover 顯示排程狀態（從 /api/schedules 取得）

#### Scenario: 點擊 Server
- **WHEN** 使用者點擊 Server 家具
- **THEN** 彈出 tooltip 顯示系統健康狀態（從 /api/health 取得）
