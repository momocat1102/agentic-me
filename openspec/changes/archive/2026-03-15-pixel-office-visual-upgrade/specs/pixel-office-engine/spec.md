## MODIFIED Requirements

### Requirement: Canvas 像素渲染引擎
系統 SHALL 提供基於 HTML5 Canvas 2D 的像素風辦公室場景渲染引擎，支援 z-sort 深度遮擋、Sprite 快取、以及 requestAnimationFrame 動畫迴圈。牆壁 SHALL 使用 autotiling 精靈渲染。

#### Scenario: 場景渲染啟動
- **WHEN** 使用者進入 Pixel Office 頁面
- **THEN** Canvas 初始化辦公室場景（桌椅、家具、地板），以 30+ FPS 渲染，牆壁 SHALL 顯示精靈而非純色

#### Scenario: 頁面離開時暫停
- **WHEN** 使用者切換到其他 Dashboard 頁面或瀏覽器分頁不在前台
- **THEN** requestAnimationFrame 迴圈 SHALL 暫停，不消耗 CPU

## ADDED Requirements

### Requirement: 程式碼片段視覺樣式
浮動程式碼片段 SHALL 使用深色半透明背景 pill（`rgba(0,0,0,0.75)` 圓角矩形）+ 亮色 monospace 字體（`#4ade80` 綠色），取代目前的純白文字+陰影。

#### Scenario: 片段渲染外觀
- **WHEN** working Agent 頭上飄出程式碼片段
- **THEN** 片段 SHALL 有深色背景 pill 包裹，文字為綠色 monospace，向上飄動並漸隱

### Requirement: 牆壁色彩調色板
牆壁 tileColor SHALL 使用紫灰色調（`h: 240, s: 25, b: -10`），取代目前的 null 預設值，讓牆壁精靈呈現接近 #3A3A5C 的質感。

#### Scenario: 牆壁色彩
- **WHEN** 辦公室場景渲染
- **THEN** 所有牆壁 SHALL 呈現統一的紫灰色調，而非灰色或無色
