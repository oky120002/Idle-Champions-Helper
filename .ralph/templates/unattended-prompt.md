# Unattended Ralph Prompt Template

## Execution Contract

- Run fully unattended. Do not ask the user questions or wait for approval.
- Complete exactly one task at a time unless the task tracker selects the next task after a clean commit.
- Use TDD: add or update the specified tests first, watch them fail for the expected reason when practical, then implement.
- Run the task-specific validation before committing.
- Commit every completed task separately.
- Never commit credentials, `.env*.local`, `tmp/private-user-data/**`, `dist/`, `node_modules/`, or private snapshots.
- If a decision is needed, choose the safest option consistent with repository docs and record it in the task decision log.
- Attempt up to three targeted repair cycles before declaring a task blocked.
- If blocked, restore or isolate this task's changes, record the blocker, and do not mark the task passed.
