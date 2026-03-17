## ADDED Requirements

### Requirement: Hamburger menu button on small screens
系統 SHALL 在螢幕寬度 < 768px 時顯示漢堡菜單按鈕，並隱藏水平導覽列。在 >= 768px 時 SHALL 隱藏漢堡按鈕並顯示原有水平導覽。

#### Scenario: Mobile user sees hamburger button
- **WHEN** 螢幕寬度 < 768px
- **THEN** 頁面頂部 SHALL 顯示漢堡菜單圖示按鈕，水平導覽項目 SHALL 被隱藏

#### Scenario: Desktop user sees horizontal nav
- **WHEN** 螢幕寬度 >= 768px
- **THEN** 水平導覽列 SHALL 正常顯示，漢堡按鈕 SHALL 被隱藏

### Requirement: Side drawer navigation
點擊漢堡按鈕 SHALL 從左側滑入全高側邊抽屜，顯示所有 11 個導覽項目的垂直列表。

#### Scenario: Open drawer
- **WHEN** 使用者點擊漢堡按鈕
- **THEN** 側邊抽屜 SHALL 從左側滑入，背景 SHALL 顯示半透明遮罩

#### Scenario: Close drawer by backdrop
- **WHEN** 抽屜開啟時，使用者點擊遮罩區域
- **THEN** 抽屜 SHALL 關閉

#### Scenario: Close drawer by navigation
- **WHEN** 使用者在抽屜中點擊任一導覽項目
- **THEN** 頁面 SHALL 導航至該路由，抽屜 SHALL 自動關閉

#### Scenario: Close drawer by Escape key
- **WHEN** 抽屜開啟時，使用者按下 Escape 鍵
- **THEN** 抽屜 SHALL 關閉

### Requirement: Active route highlighting in drawer
抽屜中的導覽項目 SHALL 標示目前所在頁面的路由。

#### Scenario: Current page highlighted
- **WHEN** 使用者在 /schedules 頁面開啟抽屜
- **THEN** 「排程」項目 SHALL 有明顯的視覺區分（如背景色或左側邊線）
