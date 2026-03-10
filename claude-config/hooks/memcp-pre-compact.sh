#!/bin/bash
# PreCompact Hook (memcp): Block compact until Claude saves knowledge
INPUT=$(cat)

cat <<'EOF'
{"blockExecution": true, "systemMessage": "【PreCompact 知識提取】對話即將被壓縮。請在壓縮前完成以下步驟：\n1. 使用 memcp_remember() 存入本次對話中的重要決策、發現、偏好（scope=global 用於跨專案知識，scope=project 用於專案特定知識）\n2. 若有大段內容需保留，使用 memcp_load_context() 存為命名上下文\n3. 未保存的內容將在壓縮後遺失\n4. 完成後告知使用者提取了幾條知識\n5. 若有 plan file（system-reminder 中的 'A plan file exists from plan mode at: ...'），請刪除它：rm -f <path>"}
EOF
