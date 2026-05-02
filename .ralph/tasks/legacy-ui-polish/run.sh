#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if ! command -v ralph >/dev/null 2>&1; then
  echo "Error: ralph 未安装或不在 PATH 中。" >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Error: codex 未安装或不在 PATH 中。" >&2
  exit 1
fi

cd "${REPO_ROOT}"

PROMPT_FILE=".ralph/tasks/legacy-ui-polish/ralph-prompt.md"
TASK_FILE=".ralph/tasks/legacy-ui-polish/ralph-tasks.md"

if [[ ! -f "${PROMPT_FILE}" ]]; then
  echo "Error: 缺少提示词文件 ${PROMPT_FILE}" >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/.ralph"

if [[ ! -f "${TASK_FILE}" ]]; then
  echo "Error: 缺少任务文件 ${TASK_FILE}" >&2
  exit 1
fi

MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-40}"
AGENT="${RALPH_AGENT:-codex}"

CMD=(
  ralph
  --agent "${AGENT}"
  --prompt-file "${PROMPT_FILE}"
  --tasks
  --completion-promise COMPLETE
  --task-promise READY_FOR_NEXT_TASK
  --max-iterations "${MAX_ITERATIONS}"
  --no-questions
  --no-commit
)

if [[ -n "${RALPH_MODEL:-}" ]]; then
  CMD+=(--model "${RALPH_MODEL}")
fi

if [[ $# -gt 0 ]]; then
  CMD+=("$@")
fi

echo "Running in ."
echo "Tasks file: ${TASK_FILE}"
echo "Prompt file: ${PROMPT_FILE}"
printf 'Command:'
printf ' %q' "${CMD[@]}"
printf '\n'

exec "${CMD[@]}"
