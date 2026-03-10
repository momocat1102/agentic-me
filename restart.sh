#!/bin/bash
# Central Command 重啟腳本
# 用法: bash restart.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 重啟 Central Command ==="
bash "$DIR/start.sh"
