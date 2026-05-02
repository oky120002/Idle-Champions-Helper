# Planner Ralph Task Package

This task package drives unattended Ralph work for the automatic formation planner and simulator.

## Entrypoints

```bash
./.ralph/tasks/planner/run.sh
```

```bash
./.ralph/scripts/run-task.sh planner
```

Both commands read this directory's `prd.json`, `ralph-prompt.md`, and `decision-log.md`.

## Runner

`ralph-tui 0.11.0` is installed on this machine at `~/.bun/bin/ralph-tui`. The planner package uses it as the primary runner:

```bash
ralph-tui run --prd .ralph/tasks/planner/prd.json --agent claude --model glm-5.1 --serial --headless
```

The shared wrapper adds the package prompt, output directory, progress file, and default iteration limits. Legacy `ralph` is only a fallback when `ralph-tui` is missing.

## Rules

- Run serially and unattended.
- Follow TDD for every user story.
- Commit every completed story separately with `planner: US-XXX ...`.
- Do not commit credentials, private snapshots, `.env*.local`, `tmp/private-user-data/**`, `dist/`, or generated dependency folders.
- Record non-trivial choices in `decision-log.md`.

## Files

- `prd.json`: Ralph-readable task queue.
- `ralph-prompt.md`: execution rules for the agent.
- `acceptance-cases.md`: human-readable test and review contract for every micro task.
- `decision-log.md`: agent decisions and blockers.
- `context/`: task-local notes that may grow during execution.
- `artifacts/`: brief validation summaries; avoid committing large raw logs.
