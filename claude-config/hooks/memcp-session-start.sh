#!/usr/bin/env bash
# SessionStart hook: inject memcp memories + Central Command recent activity

INPUT=$(cat)

# Parse JSON without jq
SOURCE=$(echo "$INPUT" | grep -o '"source":"[^"]*"' | sed 's/"source":"//;s/"//' || echo "startup")
CWD=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | sed 's/"cwd":"//;s/"//' || echo "")

SOURCE="${SOURCE:-startup}"

# Skip on resume to avoid duplicate injection
if [[ "$SOURCE" == "resume" ]]; then
  exit 0
fi

# Reset Stop hook turn counter
echo "0" > /tmp/claude_session_turns

# === Part 1: memcp memories ===

DATA_DIR="${MEMCP_DATA_DIR:-$HOME/.memcp}"
DB_PATH="$DATA_DIR/graph.db"

# Detect project name from cwd
PROJECT_NAME="default"
if [[ -n "$CWD" ]]; then
  GIT_NAME=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo "")
  if [[ -n "$GIT_NAME" ]]; then
    PROJECT_NAME="$GIT_NAME"
  else
    PROJECT_NAME=$(basename "$CWD")
  fi
fi

MEMORIES=""
if [[ -s "$DB_PATH" ]]; then
  MEMORIES=$(sqlite3 -noheader "$DB_PATH" <<EOSQL 2>/dev/null || echo ""
SELECT '- ' || content FROM nodes
WHERE project = '$(echo "$PROJECT_NAME" | sed "s/'/''/g")' OR project = '_global'
ORDER BY
  CASE importance
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at DESC
LIMIT 15;
EOSQL
  )
fi

if [[ -n "$MEMORIES" ]]; then
  echo "=== 記憶庫：已載入背景知識 ==="
  echo "$MEMORIES"
  echo "================================"
fi

# === Part 2: Central Command recent activity ===

# Only if CC server is running
if curl -s --connect-timeout 1 "${CC_API_URL:-http://localhost:4000}/api/health" > /dev/null 2>&1; then
  # Get tasks from last 6 hours
  TASKS=$(curl -s --connect-timeout 2 "${CC_API_URL:-http://localhost:4000}/api/tasks?limit=10" 2>/dev/null || echo "")

  if [[ -n "$TASKS" && "$TASKS" != "[]" ]]; then
    # Extract task summaries using grep/sed (no jq dependency)
    TASK_LINES=$(echo "$TASKS" | grep -o '"agentId":"[^"]*"' | sed 's/"agentId":"//;s/"//' > /tmp/cc_agents.tmp
      echo "$TASKS" | grep -o '"summary":"[^"]*"' | sed 's/"summary":"//;s/"//' > /tmp/cc_summaries.tmp
      echo "$TASKS" | grep -o '"projectId":"[^"]*"' | sed 's/"projectId":"//;s/"//;s/null//' > /tmp/cc_projects.tmp 2>/dev/null
      paste -d'|' /tmp/cc_agents.tmp /tmp/cc_summaries.tmp /tmp/cc_projects.tmp 2>/dev/null | head -5 | while IFS='|' read -r agent summary project; do
        if [[ -n "$summary" ]]; then
          proj_str=""
          if [[ -n "$project" ]]; then
            proj_str=" ($project)"
          fi
          echo "- [${agent}]${proj_str} ${summary:0:120}"
        fi
      done
      rm -f /tmp/cc_agents.tmp /tmp/cc_summaries.tmp /tmp/cc_projects.tmp
    )

    if [[ -n "$TASK_LINES" ]]; then
      echo ""
      echo "=== Central Command：最近活動 ==="
      echo "$TASK_LINES"
      echo "================================"
    fi
  fi
fi

exit 0
