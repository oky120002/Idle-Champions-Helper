#!/usr/bin/env bash

set -euo pipefail

if command -v ralph-tui >/dev/null 2>&1; then
  echo "ralph-tui already installed: $(command -v ralph-tui)"
  ralph-tui --version || true
  echo "Running ralph-tui doctor for the configured agent."
  ralph-tui doctor --json || true
  exit 0
fi

if ! command -v bun >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "bun is missing; installing bun with Homebrew."
    brew install oven-sh/bun/bun || brew install bun
  else
    echo "Error: bun is required to install ralph-tui, and Homebrew is not available." >&2
    echo "Install bun first, then run: bun install -g ralph-tui" >&2
    exit 1
  fi
fi

echo "Installing ralph-tui with bun."
bun install -g ralph-tui

if ! command -v ralph-tui >/dev/null 2>&1; then
  echo "Error: ralph-tui install finished, but ralph-tui is still not on PATH." >&2
  echo "Make sure ~/.bun/bin is on PATH." >&2
  exit 1
fi

ralph-tui --version
echo "Running ralph-tui doctor for the configured agent."
ralph-tui doctor --json || true
