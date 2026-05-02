#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TASK_NAME="${1:-planner}"
TASK_DIR=".ralph/tasks/${TASK_NAME}"

cd "${REPO_ROOT}"

for required_file in \
  "${TASK_DIR}/README.md" \
  "${TASK_DIR}/prd.json" \
  "${TASK_DIR}/ralph-prompt.md" \
  "${TASK_DIR}/acceptance-cases.md" \
  "${TASK_DIR}/decision-log.md" \
  "${TASK_DIR}/run.sh"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing required file: ${required_file}" >&2
    exit 1
  fi
done

node -e '
const fs = require("fs");
const file = process.argv[1];
const prd = JSON.parse(fs.readFileSync(file, "utf8"));
if (!prd.name || !Array.isArray(prd.userStories)) {
  throw new Error("prd.json must include name and userStories");
}
for (const story of prd.userStories) {
  if (!story.id || !story.title || typeof story.passes !== "boolean") {
    throw new Error(`Invalid user story: ${JSON.stringify(story)}`);
  }
}
' "${TASK_DIR}/prd.json"

bash -n "${TASK_DIR}/run.sh"
bash -n .ralph/scripts/run-task.sh
bash -n .ralph/scripts/run-legacy-ralph.sh
bash -n .ralph/scripts/install-ralph-tui.sh
bash -n .ralph/scripts/status.sh

if command -v ralph-tui >/dev/null 2>&1; then
  ralph-tui --version >/dev/null
else
  echo "Warning: ralph-tui is not on PATH; run ./.ralph/scripts/install-ralph-tui.sh" >&2
fi

echo "Task package ${TASK_NAME} is structurally valid."
