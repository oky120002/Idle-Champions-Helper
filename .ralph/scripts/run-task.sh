#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TASK_NAME="${1:-}"
if [[ -z "${TASK_NAME}" ]]; then
  echo "Usage: ./.ralph/scripts/run-task.sh <task-name> [extra ralph-tui args]" >&2
  exit 1
fi
shift || true

cd "${REPO_ROOT}"

TASK_DIR=".ralph/tasks/${TASK_NAME}"
PRD_FILE="${TASK_DIR}/prd.json"
PROMPT_FILE="${TASK_DIR}/ralph-prompt.md"
DECISION_LOG="${TASK_DIR}/decision-log.md"
OUTPUT_DIR="${TASK_DIR}/artifacts/iterations"
PROGRESS_FILE="${TASK_DIR}/context/progress.md"

for required_file in "${PRD_FILE}" "${PROMPT_FILE}" "${DECISION_LOG}"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Error: missing required task file: ${required_file}" >&2
    exit 1
  fi
done

mkdir -p "${OUTPUT_DIR}" "$(dirname "${PROGRESS_FILE}")"

RALPH_AGENT="${RALPH_AGENT:-claude}"
RALPH_MODEL="${RALPH_MODEL:-glm-5.1}"
RALPH_MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-200}"
RALPH_DELAY_MS="${RALPH_DELAY_MS:-3000}"
RALPH_TASK_RANGE="${RALPH_TASK_RANGE:-}"

if ! command -v ralph-tui >/dev/null 2>&1; then
  echo "Warning: ralph-tui is not installed; falling back to legacy ralph." >&2
  exec ./.ralph/scripts/run-legacy-ralph.sh "${TASK_NAME}" "$@"
fi

RALPH_TUI_PATH="$(command -v ralph-tui)"
RALPH_TUI_VERSION="$(ralph-tui --version 2>/dev/null || true)"

CMD=(
  ralph-tui
  run
  --prd "${PRD_FILE}"
  --agent "${RALPH_AGENT}"
  --model "${RALPH_MODEL}"
  --serial
  --headless
  --no-setup
  --iterations "${RALPH_MAX_ITERATIONS}"
  --delay "${RALPH_DELAY_MS}"
  --prompt "${PROMPT_FILE}"
  --output-dir "${OUTPUT_DIR}"
  --progress-file "${PROGRESS_FILE}"
)

if [[ -n "${RALPH_TASK_RANGE}" ]]; then
  CMD+=(--task-range "${RALPH_TASK_RANGE}")
fi

if [[ $# -gt 0 ]]; then
  CMD+=("$@")
fi

printf 'Running task package: %s\n' "${TASK_NAME}"
printf 'Runner: %s %s\n' "${RALPH_TUI_PATH}" "${RALPH_TUI_VERSION}"
printf 'Decision log: %s\n' "${DECISION_LOG}"
printf 'Command:'
printf ' %q' "${CMD[@]}"
printf '\n'

exec "${CMD[@]}"
