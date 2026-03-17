# System Agent — Core Requirements

## Goals
- Central Command server + dashboard 基礎建設
- 專案追蹤系統（projects API + dashboard）
- 專家模式系統（experts API + /switch command）
- 夜班排程系統（/night-shift + report-round API）
- OpenSpec 整合（spec-driven development workflow）
- Dashboard 視覺化升級（Git Graph 分支圖）

## Phases

### Phase 1: Core Infrastructure
- [x] Central Command server (Hono + SQLite)
- [x] Dashboard (Next.js + Tailwind)
- [x] Agent registration system
- [x] Task tracking API
- [x] MCP Server integration
- [x] Graceful shutdown + WAL persistence

### Phase 2: Project Tracking
- [x] Projects API + Dashboard
- [x] Progress tracking (milestones + tasks)
- [x] Expert mode switching (/switch)
- [x] Subagent system (10 agents)
- [x] Custom commands (kickoff, progress, review, done)
- [x] Deadline management

### Phase 3: Automation
- [x] Night shift scheduling system
- [x] Iterative task/review cycles
- [x] Circuit breaker protocol
- [x] Usage monitoring (token tracking)
- [x] Agent behavior constraints (Honesty Protocol)

### Phase 4: Spec-Driven Development
- [x] OpenSpec /opsx:* command set
- [x] Dashboard lifecycle visualization (ChangeTree)
- [x] Git Graph visualization (SVG branches)
- [ ] Hook system optimization
- [ ] End-to-end spec workflow testing
