# Planner Ralph Prompt

## Goal

Implement the automatic formation planner and simulator by following `.ralph/tasks/planner/prd.json` and `.ralph/tasks/planner/acceptance-cases.md`.

Only output `<promise>COMPLETE</promise>` when all selected tasks are implemented, validated, committed, and marked passed by the tracker.

## Unattended Execution

- Never ask the user questions.
- Never wait for user approval.
- If a decision is required, choose the safest option that satisfies `AGENTS.md`, `.impeccable.md`, and the docs in `docs/modules/planner/`.
- Record every non-trivial decision in `.ralph/tasks/planner/decision-log.md`.
- Do not loop on the same failing command more than three repair cycles.
- If blocked after three targeted repairs, restore or isolate this task's changes, record the blocker, and do not mark the task passed.

## TDD Contract

- Work on exactly one user story at a time.
- Read that story in `prd.json` and its matching section in `acceptance-cases.md`.
- Add or update the specified tests first.
- Implement only the minimum code required for the task.
- Do not weaken, skip, or rewrite the acceptance tests to fit broken behavior.
- Run the story-specific validation before committing.

## Commit Rules

- Commit every completed story separately.
- Do not mark a story passed until its dedicated commit exists.
- Commit message format: `planner: US-XXX short summary`.
- Before staging, run `git status --short` and ensure only task-related files are staged.
- Never commit credentials, `.env*.local`, `tmp/private-user-data/**`, `dist/`, `node_modules/`, private snapshots, or generated large logs.

## Failure Handling

- Attempt up to three targeted repair cycles per story.
- If validation fails after a committed change, prefer a fix commit; if unsafe, create a revert commit and log why.
- If validation fails before any commit, repair or manually restore only files touched by this story.
- Do not use destructive reset commands.

## Repository Constraints

- Keep GitHub Pages compatibility: preserve `HashRouter` behavior and `import.meta.env.BASE_URL` assumptions.
- UI tasks use DOM, text, and state assertions only; do not rely on screenshot or image recognition.
- Privacy tasks must prove that real credentials and private snapshots cannot enter committed or built files.
- Unknown or unsupported simulation variables must be exposed as warnings or TODOs, never silently treated as calculated.

## Validation Baseline

Each story has its own validation command. Shared or final tasks may require:

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run privacy:scan`
