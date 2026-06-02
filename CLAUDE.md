# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

chipRunner is a stock trading strategy tracking prototype (Chinese language UI). It models a T+0 day trading strategy for Chinese A-shares, calculating target share accumulation, cash, and total assets across trading days from 2026–2030. Users record actual trading positions and compare against model targets.

## Commands

```bash
npm run dev          # Vite dev server (required for actual-entry write-back)
npm run build        # vue-tsc type check + vite build
npm test             # Vitest 3.x — runs all tests in tests/
npm run test:watch   # Vitest in watch mode
npm run migrate:data # python3 scripts/migrate_data.py — regenerate JSON from docs/ Markdown
npm run tracking:core -- compute  # TS calculation kernel via stdin/stdout JSON (used by Python tool)
python3 scripts/tracking_tool.py recalc   # Recalculate target fields
python3 scripts/tracking_tool.py range --date-from 2027.03.01 --date-to 2027.06.30  # Extract date range
python3 scripts/tracking_tool.py progress --date 2026.06.10 --total-assets 35101     # Locate progress vs target
```

Run a single test file: `npx vitest run tests/trackingCore.test.ts`

## Architecture

### Calculation Kernel

`src/lib/trackingCore.ts` is the authoritative calculation engine. `runOneTradingDay()` implements:

```
tProfit = shares * spread
cash += tProfit
lotsBought = floor(cash / lotCost)
if lotsBought > 0: shares += lotsBought * 100, cash -= lotsBought * lotCost
targetAssets = shares * price + cash
```

`buildCoreTrackingRows()` runs `hiddenTradingDays` pre-iterations (not displayed), then maps over the date array.

### Data Flow

1. **Calendar**: `data/calendar/*.json` (5 files, 2026–2030) → `src/data/sources.ts` merges into `ALL_TRADING_DATES` (sorted, deduplicated)
2. **Legacy meta**: `data/tracking/*.meta.json` provides lightweight summaries (date range, row count) for display — the full tracking table JSON is not imported by the frontend to keep the bundle small
3. **Tracking rows**: `src/lib/tracking.ts` calls the kernel with params + filtered dates → produces `TrackingRow[]`
4. **Comparison**: `tracking.ts` also provides `buildComparisonRows()` which overlays actual entries onto target rows, computing deltas and progress
5. **UI**: `src/App.vue` is a single-file Vue 3 component (~960 lines) wiring parameter form, range selection, actual-entry recording, and a 17-column data table

### Server-Side Write-Back

`vite.config.ts` contains `actualEntriesApiPlugin` — a middleware on `/api/actual-entries` supporting GET/POST/DELETE. It writes directly to `data/tracking/actual-entries.json`. Browser calls go through `src/lib/actualEntriesApi.ts`.

### Python ↔ TypeScript Bridge

`scripts/tracking_tool.py` delegates calculation to the TS kernel by shelling out to `npm run tracking:core -- compute`, piping JSON through stdin/stdout. This avoids duplicating the formula in Python.

### Default Model Parameters

Current baseline (aligned with `docs/dialog-tracking-draft.md` and `DEFAULT_PARAMS` in `tracking.ts`):
- Initial shares: 2600, initial cash: 1376.18, fixed price: 40.20
- Daily spread/share: 0.5, lot cost: 4020
- Hidden pre-trading days: 0, start date: 2026.06.03

The authoritative params source is `docs/dialog-tracking-draft.md`. When params change, update both the draft and `DEFAULT_PARAMS` in `src/lib/tracking.ts`.

## Key Reference Files

- `docs/dialog-tracking-draft.md` — authoritative model params, rules, output format
- `docs/project-status.md` — current project status and next steps (read first when resuming work)
- `docs/baseline-refresh-playbook.md` — procedure for replacing base data and re-syncing params
- `docs/2026-remaining-trading-dates.md` — valid trading dates after 2026.06.03
- `data/calendar/*.json` — structured trading calendars (frontend reads these, not the Markdown)
- `data/tracking/*.meta.json` — lightweight tracking table summaries (date range, row count)

## Working Conventions

- Respond in Chinese by default
- Prefer minimal edits; avoid unrelated refactoring
- Sync changes to both `docs/` and `data/` when affecting trading days, tables, or status
- New structured data goes into `data/`, not Markdown
- When resuming work: read `docs/project-status.md` → `README.md` → `git status --short`
- Verify frontend changes with the running dev server; verify config changes with `npm run build`
- Reuse existing dev server when possible; restart only when necessary
- Do not fabricate trading dates — derive from `docs/` or `data/calendar/`

## Tech Stack

Vue 3.5 + Element Plus 2.14 (zh-CN locale) + Vite 8. Tests: Vitest 3.2. TypeScript 6 with strict checks (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`).
