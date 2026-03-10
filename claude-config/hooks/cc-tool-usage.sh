#!/bin/bash
# PostToolUse hook: Report tool usage to Central Command
# Runs in background, fails silently if CC server is down
# Uses python3 instead of jq for JSON parsing (jq not installed on WSL)

INPUT=$(cat)

# Parse tool_name, session_id, and skill name in one python3 call
eval "$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'TOOL_NAME={json.dumps(d.get(\"tool_name\",\"\"))}')
    print(f'SESSION_ID={json.dumps(d.get(\"session_id\",\"\"))}')
    ti = d.get('tool_input', {}) or {}
    print(f'SKILL_NAME={json.dumps(ti.get(\"skill\",\"\"))}')
except:
    print('TOOL_NAME=\"\"')
    print('SESSION_ID=\"\"')
    print('SKILL_NAME=\"\"')
" 2>/dev/null)"

# Skip if no tool name
[ -z "$TOOL_NAME" ] && exit 0

# Extract actual skill/command name for better tracking
if [ "$TOOL_NAME" = "Skill" ] && [ -n "$SKILL_NAME" ]; then
  TOOL_NAME="skill:${SKILL_NAME}"
fi

# Match CWD to agent via agents.json
AGENTS_JSON="${AGENTIC_ME_DIR:-$HOME/agentic-me}/agents.json"
AGENT_ID="unknown"
if [ -f "$AGENTS_JSON" ]; then
  AGENT_ID=$(python3 -c "
import json, os
cwd = os.getcwd()
try:
    with open('$AGENTS_JSON') as f:
        agents = json.load(f).get('agents', [])
    found = 'unknown'
    for a in agents:
        p = a.get('path', '')
        if cwd == p or cwd.startswith(p + '/'):
            found = a['id']; break
    print(found)
except Exception:
    print('unknown')
" 2>/dev/null)
fi
[ -z "$AGENT_ID" ] && AGENT_ID="unknown"

# POST to CC server (foreground, silent failure — hook timeout 3s protects against hang)
curl -s --connect-timeout 1 --max-time 2 \
  -X POST "${CC_API_URL:-http://localhost:4000}/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AGENT_ID\",\"sessionId\":\"$SESSION_ID\",\"eventType\":\"PostToolUse\",\"toolName\":\"$TOOL_NAME\"}" \
  > /dev/null 2>&1

exit 0
