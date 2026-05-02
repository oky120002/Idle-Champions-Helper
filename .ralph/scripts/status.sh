#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TASK_NAME="${1:-planner}"
TASK_DIR=".ralph/tasks/${TASK_NAME}"
PRD_FILE="${TASK_DIR}/prd.json"

cd "${REPO_ROOT}"

if command -v ralph-tui >/dev/null 2>&1; then
  printf 'ralph-tui: %s\n' "$(command -v ralph-tui)"
  ralph-tui --version || true
else
  echo "ralph-tui: not installed; run ./.ralph/scripts/install-ralph-tui.sh"
fi

if command -v ralph >/dev/null 2>&1; then
  printf 'legacy ralph: %s\n' "$(command -v ralph)"
fi

if [[ ! -f "${PRD_FILE}" ]]; then
  echo "Error: missing PRD file: ${PRD_FILE}" >&2
  exit 1
fi

node -e '
const fs = require("fs");
const file = process.argv[1];
const prd = JSON.parse(fs.readFileSync(file, "utf8"));
const stories = prd.userStories || [];
const done = stories.filter((story) => story.passes).length;
console.log(`${prd.name}: ${done}/${stories.length} stories passed`);
for (const [index, story] of stories.entries()) {
  const mark = story.passes ? "x" : " ";
  const deps = story.dependsOn?.length ? ` deps=${story.dependsOn.join(",")}` : "";
  console.log(`${String(index + 1).padStart(2, "0")}. [${mark}] ${story.id} ${story.title}${deps}`);
}
' "${PRD_FILE}"
