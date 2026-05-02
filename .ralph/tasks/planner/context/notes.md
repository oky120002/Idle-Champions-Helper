# Planner Context Notes

- Production is a GitHub Pages static site. There is no backend credential store.
- Production credential use happens only in the browser when the user manually syncs private data.
- Local development private credentials must stay in environment variables or `.local` files and output only to `tmp/private-user-data/`.
- The planner implementation must be done by Ralph tasks, not by the planning branch.
- `ralph-tui 0.11.0` is installed at `~/.bun/bin/ralph-tui`; use it before legacy `ralph`.
- `ralph-tui doctor --json` currently reports Claude Code healthy at `/opt/homebrew/bin/claude`.
