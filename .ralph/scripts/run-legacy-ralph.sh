#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TASK_NAME="${1:-}"
if [[ -z "${TASK_NAME}" ]]; then
  echo "Usage: ./.ralph/scripts/run-legacy-ralph.sh <task-name> [extra ralph args]" >&2
  exit 1
fi
shift || true

cd "${REPO_ROOT}"

TASK_DIR=".ralph/tasks/${TASK_NAME}"
PROMPT_FILE="${TASK_DIR}/ralph-prompt.md"

if [[ ! -f "${PROMPT_FILE}" ]]; then
  echo "Error: missing task prompt: ${PROMPT_FILE}" >&2
  exit 1
fi

if ! command -v ralph >/dev/null 2>&1; then
  echo "Error: neither ralph-tui nor legacy ralph is available." >&2
  exit 1
fi

RALPH_AGENT="${RALPH_LEGACY_AGENT:-claude-code}"
RALPH_MODEL="${RALPH_MODEL:-glm-5.1}"
RALPH_MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-200}"

CMD=(
  ralph
  --agent "${RALPH_AGENT}"
  --model "${RALPH_MODEL}"
  --prompt-file "${PROMPT_FILE}"
  --completion-promise COMPLETE
  --max-iterations "${RALPH_MAX_ITERATIONS}"
  --no-questions
  --no-commit
)

if [[ $# -gt 0 ]]; then
  CMD+=("$@")
fi

printf 'Running legacy Ralph task package: %s\n' "${TASK_NAME}"
printf 'Command:'
printf ' %q' "${CMD[@]}"
printf '\n'

exec "${CMD[@]}"
