# Planner Acceptance Cases

Every story below is intentionally small for weaker unattended models. Ralph must write the listed tests first, implement only the scoped behavior, run the validation command, and commit the story separately.

## Global Reject Conditions

- A story is marked passed without a dedicated commit.
- Tests are skipped, weakened, or rewritten to hide broken behavior.
- Real credentials, private snapshots, `.env*.local`, `tmp/private-user-data/**`, `dist/`, or generated dependency folders are staged.
- A story modifies files outside its allowed scope without recording a decision.

## Phase 0 - Documentation And Ralph Structure

### US-001: Persist planner docs

Scope:
- Allowed files: `docs/modules/planner/**`, `docs/modules/README.md`, `docs/README.md`.
- Forbidden files: `src/**`, `public/**`, credential or private snapshot files.

Test First:
- Use `rg`/shell validation rather than app tests.

Acceptance Cases:
1. Given a fresh checkout, when `rg -n "auto-formation-planner-plan|development-design|acceptance-cases|final-todo" docs/modules/planner docs/modules/README.md docs/README.md` runs, then planner docs and navigation are discoverable.
2. Given the docs, when scanning for real credential-like values, then no real user id/hash is present.

Validation:
- `test -f docs/modules/planner/auto-formation-planner-plan.md`
- `test -f docs/modules/planner/prd.md`
- `test -f docs/modules/planner/development-design.md`
- `test -f docs/modules/planner/final-todo.md`

Commit:
- `planner: US-001 persist planner docs`

### US-002: Ralph planner package is runnable

Scope:
- Allowed files: `.ralph/**`.
- Forbidden files: `src/**`, `public/**`.

Test First:
- Structural shell checks.

Acceptance Cases:
1. Given `.ralph/tasks/planner`, when `.ralph/scripts/validate-task.sh planner` runs, then required files and JSON shape pass.
2. Given `ralph-tui` is absent, when `.ralph/scripts/run-task.sh planner --help` would run, then the script falls back to legacy Ralph rather than failing silently.

Validation:
- `bash -n .ralph/scripts/run-task.sh`
- `bash -n .ralph/tasks/planner/run.sh`
- `./.ralph/scripts/validate-task.sh planner`

Commit:
- `planner: US-002 add ralph planner package`

## Phase 1 - Privacy And Private Development Data

### US-003: Sensitive output scanner

Scope:
- Allowed files: `scripts/private-user-data/**`, `tests/unit/scripts/**`, `package.json`.
- Forbidden files: `src/**`.

Test First:
- `tests/unit/scripts/privateUserDataScanner.test.ts`.

Acceptance Cases:
1. Given a fixture containing a fake numeric user id and fake 32-character hash, when scanner runs against it, then it reports a finding.
2. Given ordinary docs mentioning `user_id` and `hash` placeholders, when scanner runs, then it does not fail on placeholders alone.
3. Given a path under `tmp/private-user-data`, when scanner sees committed-source references to that path, then it reports a finding.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-003 add sensitive output scanner`

### US-004: Private env loader

Scope:
- Allowed files: `scripts/private-user-data/**`, `tests/unit/scripts/**`.
- Forbidden files: `src/**`, `.env*.local`.

Test First:
- `tests/unit/scripts/privateEnvLoader.test.ts`.

Acceptance Cases:
1. Given process env contains `IC_PRIVATE_USER_ID` and `IC_PRIVATE_HASH`, loader returns both values.
2. Given an explicit `.local` env fixture, loader reads values without requiring `VITE_` variables.
3. Given credentials are missing, loader returns a safe error without printing secret values.
4. Given a key starts with `VITE_`, loader rejects it for private credentials.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-004 add private env loader`

### US-005: Private snapshot manifest

Scope:
- Allowed files: `scripts/private-user-data/**`, `tests/unit/scripts/**`.
- Forbidden files: `src/**`, `public/**`.

Test First:
- `tests/unit/scripts/privateSnapshotManifest.test.ts`.

Acceptance Cases:
1. Given mock payload names, when manifest is written, then the output path is under `tmp/private-user-data/<timestamp>/`.
2. Given credentials are used, when manifest is serialized, then user id/hash are masked.
3. Given a target outside `tmp/private-user-data`, writer rejects it.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-005 add private snapshot manifest`

## Phase 2 - User Profile Foundation

### US-006: User profile domain types

Scope:
- Allowed files: `src/domain/user-profile/**`, `src/domain/types.ts`, `tests/unit/domain/user-profile/**`.

Test First:
- `tests/unit/domain/user-profile/userProfileFixtures.test.ts`.

Acceptance Cases:
1. Given a minimal owned champion fixture, TypeScript accepts `UserProfileSnapshot`.
2. Given an imported formation save fixture, TypeScript accepts specialization, feat, familiar, and scenario references.
3. Given missing optional sections, builder helpers still create a snapshot with warnings.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-006 add user profile domain types`

### US-007: User profile IndexedDB store

Scope:
- Allowed files: `src/data/user-profile-store/**`, `src/data/localDatabase.ts`, `tests/unit/data/**`.

Test First:
- `tests/unit/data/userProfileStore.test.ts`.

Acceptance Cases:
1. Given a profile snapshot, save/read returns the same id and updatedAt.
2. Given credential opt-in is false, credential vault remains empty.
3. Given delete is called, snapshot and credential records are removed.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-007 add user profile store`

### US-008: Official read-only client allowlist

Scope:
- Allowed files: `src/data/user-sync/**`, `tests/unit/data/user-sync/**`.

Test First:
- `tests/unit/data/user-sync/officialClient.test.ts`.

Acceptance Cases:
1. Given `getuserdetails`, `getcampaigndetails`, or `getallformationsaves`, URL builder allows the call.
2. Given write-like calls such as claim, purchase, save, redeem, URL builder rejects them.
3. Given fetch options are created, they include `credentials: "omit"`, `cache: "no-store"`, and `referrerPolicy: "no-referrer"`.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-008 add official read-only client`

### US-009: User payload normalizer

Scope:
- Allowed files: `src/data/user-sync/**`, `src/domain/user-profile/**`, `tests/unit/data/user-sync/**`.

Test First:
- `tests/unit/data/user-sync/userProfileNormalizer.test.ts`.

Acceptance Cases:
1. Given mock `getuserdetails`, normalizer extracts owned heroes, equipment, feats, legendary info, and warnings.
2. Given mock `getcampaigndetails`, normalizer extracts favor/blessing/campaign progress where present.
3. Given mock `getallformationsaves`, normalizer extracts imported formation saves.
4. Given missing unknown fields, normalizer records warnings and does not throw.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-009 add user payload normalizer`

### US-010: User data page manual sync model

Scope:
- Allowed files: `src/pages/user-data/**`, `tests/component/userDataPage.*.test.tsx`.

Test First:
- `tests/component/userDataPage.syncFlow.test.tsx`.

Acceptance Cases:
1. Given no snapshot, page offers credential parse and manual sync flow.
2. Given a stored snapshot updated 3 days ago, page shows private data age.
3. Given sync fails, page displays a safe error without credentials.
4. Given delete is clicked, snapshot and optional credential vault are cleared.

Validation:
- Targeted component test.
- `npm run typecheck`

Commit:
- `planner: US-010 add user data manual sync model`

## Phase 3 - Number Layer And Baseline

### US-011A: GameNumber parse and format

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`, `package.json`, lockfile.

Test First:
- `tests/unit/domain/simulator/gameNumber.parseFormat.test.ts`.

Acceptance Cases:
1. Given `0`, `1.50e92`, `4.08e167`, and `1e1000`, parser returns valid values.
2. Given invalid input, parser returns an error or throws a documented error.
3. Given values above JavaScript `Number.MAX_VALUE`, formatter still returns game-style notation.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-011A add game number parse format`

### US-011B: GameNumber arithmetic and compare

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/gameNumber.arithmetic.test.ts`.

Acceptance Cases:
1. `1.5e92 * 2.72e75` compares equal in order of magnitude to `4.08e167`.
2. Division and power operations keep expected ordering.
3. Sorting a list of huge values is stable and deterministic.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-011B add game number arithmetic`

### US-011C: GameNumber additive threshold

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/gameNumber.addition.test.ts`.

Acceptance Cases:
1. `1e100 + 1e99` changes the displayed mantissa.
2. `1e100 + 1e80` returns the larger term for display and ordering.
3. The threshold is documented and centralized.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-011C add game number addition threshold`

### US-012: Last specialization baseline extraction

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/specializationBaseline.test.ts`.

Acceptance Cases:
1. Given upgrades with three specialization levels, extractor returns the highest required level.
2. Given no specialization upgrades, extractor returns a documented fallback unlock level.
3. Given malformed levels, extractor ignores invalid entries and records warnings.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-012 add specialization baseline`

### US-013: Gold budget baseline interface

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/goldBudgetBaseline.test.ts`.

Acceptance Cases:
1. Given cost curve and gold budget, baseline returns an affordable level.
2. Given last specialization level is higher than affordable level, result is marked below-baseline and not silently accepted.
3. UI defaults do not expose a 100-level mode.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-013 add gold budget baseline`

## Phase 4 - Simulation Data

### US-014: Simulator data coverage report

Scope:
- Allowed files: `docs/research/data/**`, `scripts/data/**`, `tests/unit/scripts/**`.

Test First:
- `tests/unit/scripts/simulatorDataCoverage.test.ts`.

Acceptance Cases:
1. Given mock definition keys, report marks known useful keys as covered/uncovered.
2. Given unknown keys, report preserves them for review.
3. Report includes usefulness, current output, and next action columns.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-014 add simulator data coverage report`

### US-015: Champion simulation profile projection

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/championSimulationProfile.test.ts`.

Acceptance Cases:
1. Given a champion detail fixture, projection extracts upgrades, feats, loot, legendary effects, and raw effect strings.
2. Given unknown effect strings, projection preserves them in `unsupportedEffects`.
3. Projection includes localized names for explanation.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-015 add champion simulation profile`

### US-016: Effect parser core DPS group

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/effectParser.coreDps.test.ts`.

Acceptance Cases:
1. Parse `global_dps_multiplier_mult`.
2. Parse `hero_dps_multiplier_mult`.
3. Parse unknown prefix into unsupported result without throwing.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-016 add core dps effect parser`

### US-017: Effect parser positional and tag group

Scope:
- Allowed files: `src/domain/simulator/**`, `tests/unit/domain/simulator/**`.

Test First:
- `tests/unit/domain/simulator/effectParser.positionTags.test.ts`.

Acceptance Cases:
1. Parse adjacent target hints.
2. Parse tagged champion multiplier hints.
3. Preserve unsupported positional formats with explanation.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-017 add positional tag effect parser`

### US-018: Variant rule projection

Scope:
- Allowed files: `src/domain/planner/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/variantRuleProjection.test.ts`.

Acceptance Cases:
1. Project `only_allow_crusaders`.
2. Project `disallow_crusaders`.
3. Project `force_use_heroes`.
4. Preserve unknown mechanics as warnings.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-018 add variant rule projection`

## Phase 5 - Candidate Pools

### US-019: Candidate pool modes

Scope:
- Allowed files: `src/domain/planner/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/candidatePool.test.ts`.

Acceptance Cases:
1. Owned-only mode returns only owned champions.
2. All-hypothetical mode includes unowned champions with assumptions.
3. Manual override mode applies explicit champion assumptions without changing profile data.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-019 add candidate pool modes`

### US-020: Hypothetical fairness baseline

Scope:
- Allowed files: `src/domain/planner/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/hypotheticalBaseline.test.ts`.

Acceptance Cases:
1. Same-seat median equipment is used when available.
2. Account-wide median is used when same-seat data is unavailable.
3. Empty-account fallback is clearly marked as no-equipment/no-feat.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-020 add hypothetical fairness baseline`

## Phase 6 - Formation Scoring

### US-021: Imported formation save normalizer

Scope:
- Allowed files: `src/data/user-sync/**`, `src/domain/user-profile/**`, `tests/unit/data/user-sync/**`.

Test First:
- `tests/unit/data/user-sync/formationSaveNormalizer.test.ts`.

Acceptance Cases:
1. Convert mock `getallformationsaves` payload into `ImportedFormationSave`.
2. Preserve specializations, feats, familiars, favorite flag, and scenario relation.
3. Unknown formation layout ids are warned rather than dropped silently.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-021 add imported formation save normalizer`

### US-022: Planner formation legality

Scope:
- Allowed files: `src/domain/planner/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/formationLegality.test.ts`.

Acceptance Cases:
1. Detect seat conflicts.
2. Detect banned champions.
3. Detect missing forced champions.
4. Detect locked or occupied slots.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-022 add formation legality checks`

### US-023: Steady-state scoring fixture

Scope:
- Allowed files: `src/domain/planner/**`, `src/domain/simulator/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/steadyStateScoring.test.ts`.

Acceptance Cases:
1. Bruenor-like adjacent support increases score when placed adjacent.
2. Global DPS support applies regardless of adjacency.
3. Unsupported effects appear in result warnings.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-023 add steady state scoring`

### US-024: Beam search candidate ranking

Scope:
- Allowed files: `src/domain/planner/**`, `tests/unit/domain/planner/**`.

Test First:
- `tests/unit/domain/planner/beamSearchRanking.test.ts`.

Acceptance Cases:
1. A 4-slot deterministic fixture returns expected top result.
2. Beam width limits candidate expansion.
3. Top results include score, placements, explanations, and warnings.

Validation:
- Targeted unit test.
- `npm run typecheck`

Commit:
- `planner: US-024 add beam search ranking`

## Phase 7 - Planner UI

### US-025: Planner route and navigation

Scope:
- Allowed files: `src/app/**`, `src/pages/PlannerPage.tsx`, `src/pages/planner/**`, `tests/component/app.test.tsx`, `tests/component/primaryNavigation.test.tsx`.

Test First:
- Component tests for route and nav label.

Acceptance Cases:
1. `/planner` renders the planner page.
2. Navigation includes Automatic Planner.
3. HashRouter compatibility is preserved.

Validation:
- Targeted component tests.
- `npm run typecheck`

Commit:
- `planner: US-025 add planner route`

### US-026: Planner profile state panel

Scope:
- Allowed files: `src/pages/planner/**`, `tests/component/plannerPage.profileState.test.tsx`.

Test First:
- Profile state component test.

Acceptance Cases:
1. No profile shows link/action to user data page.
2. Existing profile shows age in days.
3. Sync warning is visible but does not auto-refresh.

Validation:
- Targeted component test.
- `npm run typecheck`

Commit:
- `planner: US-026 add planner profile state`

### US-027: Planner scenario selection

Scope:
- Allowed files: `src/pages/planner/**`, `tests/component/plannerPage.scenarioSelection.test.tsx`.

Test First:
- Scenario selection component test.

Acceptance Cases:
1. Variant list can be filtered by text.
2. Selecting a variant shows formation and restriction summary.
3. Long restriction text remains accessible as text, not hidden in image-only UI.

Validation:
- Targeted component test.
- `npm run typecheck`

Commit:
- `planner: US-027 add planner scenario selection`

### US-028: Planner result card

Scope:
- Allowed files: `src/pages/planner/**`, `tests/component/plannerPage.resultCard.test.tsx`.

Test First:
- Result card component test.

Acceptance Cases:
1. Result card shows score in game notation.
2. Result card shows slot assignments as text.
3. Result card shows explanation and unsupported warning sections.

Validation:
- Targeted component test.
- `npm run typecheck`

Commit:
- `planner: US-028 add planner result card`

### US-029: Save planner result as preset

Scope:
- Allowed files: `src/pages/planner/**`, `src/data/formationPresetStore.ts`, `tests/component/plannerPage.savePreset.test.tsx`.

Test First:
- Save preset component/integration test.

Acceptance Cases:
1. Clicking save writes a formation preset.
2. Saved preset preserves `layoutId`, `placements`, and `scenarioRef`.
3. Save disabled state is visible when result is invalid.

Validation:
- Targeted component test.
- `npm run typecheck`

Commit:
- `planner: US-029 save planner result as preset`

## Phase 8 - Final Gates

### US-030: Privacy scan npm script

Scope:
- Allowed files: `package.json`, `scripts/private-user-data/**`, `tests/unit/scripts/**`.

Test First:
- Scanner script test.

Acceptance Cases:
1. `npm run privacy:scan` exists.
2. Scanner checks `src`, `public`, `docs`, `tests`, and `dist` when present.
3. Scanner fails on fixture secrets and passes normal placeholders.

Validation:
- Targeted unit test.
- `npm run privacy:scan`

Commit:
- `planner: US-030 add privacy scan script`

### US-031: Planner documentation sync

Scope:
- Allowed files: `README.md`, `docs/**`, `.ralph/tasks/planner/**`.

Test First:
- Shell/rg checks.

Acceptance Cases:
1. Root README mentions automatic planner once route exists.
2. Docs index points to planner module docs.
3. Final TODO lists speed/gem, survival, balanced scoring, step simulation, manual parameter panel.

Validation:
- `rg -n "自动计划|planner|final-todo" README.md docs .ralph/tasks/planner`

Commit:
- `planner: US-031 sync planner docs`

### US-032: Final regression

Scope:
- Allowed files: only files needed to fix regressions.

Test First:
- Use failing command output as the test signal.

Acceptance Cases:
1. `npm run lint` passes.
2. `npm run typecheck` passes.
3. `npm run test:run` passes.
4. `npm run build` passes.
5. `npm run privacy:scan` passes.

Validation:
- `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run privacy:scan`

Commit:
- `planner: US-032 final regression`
