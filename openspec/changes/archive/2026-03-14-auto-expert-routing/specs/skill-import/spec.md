# Skill Import

## Requirements

1. 安裝 11 個 skill 到 `~/.claude/skills/<name>/SKILL.md`
2. 每個 skill 必須有 YAML frontmatter 包含 `name` 和 `description`
3. Description 必須精確描述觸發條件，讓 Claude Code 能正確自動觸發
4. 不修改任何現有檔案

## Source Mapping

| Skill | 來源 Repo | 分類 |
|-------|----------|------|
| brainstorming | superpowers | 思維框架 |
| when-stuck | superpowers | 思維框架 |
| writing-plans | superpowers | 思維框架 |
| subagent-driven-development | superpowers | 開發流程 |
| verification-before-completion | superpowers | 開發流程 |
| finishing-a-development-branch | superpowers | 開發流程 |
| verification-loop | ECC | 品質保證 |
| python-patterns | ECC | 品質保證 |
| python-testing | ECC | 品質保證 |
| search-first | ECC | 知識管理 |
| strategic-compact | ECC | 知識管理 |

## Acceptance Criteria

- [ ] 所有 11 個 skill 出現在 Claude Code 的 available skills 列表
- [ ] 現有 skill 和 expert 不受影響
- [ ] /switch 命令仍可正常使用
