# Sticky return loops — wayfinder map

## Destination

A **two-bucket map of viable sticky ideas only** — **met** in [research/07-viable-sticky-map.md](research/07-viable-sticky-map.md) / [issues/07-assemble-viable-map.md](issues/07-assemble-viable-map.md).

1. **Deepen existing loops** (5)
2. **Candidate net-new loops** (3)

Each idea carries a one-line why it clears the viable bar. **No build commitment** — this effort ends when the viable map is assembled, not when code ships.

## Notes

- Domain: NimCharts — social taste discovery (movies & TV) inside Nimiq Pay.
- Primary job (already locked for the product): discovery via taste overlap.
- Sticky for this map: **social-change** and **personal-ritual** loops are both candidates.
- Return cadence to optimize for: **a few times a week** when something meaningful changed.
- Complexity budget: **one new surface OK** if it clearly earns its place; prefer fitting inside Discover / Activity / Me. **Used: 0 / 1.**
- Signals: **in-app only** (no push / OS / email in this map).
- Approach: **inventory existing loops first**, then map gaps.
- Viable bar: fits **taste-overlap primary job** AND stays **simple** for a weekly-ish returner.
- Skills: `/grilling`, `/domain-modeling`; research tickets via `/research`. Tracker: local markdown under this directory.
- Plan, don't do: resolve decisions; do not implement features here.

## Decisions so far

<!-- index — one line per closed ticket -->

- [01 — Inventory today’s return loops](issues/01-inventory-existing-loops.md) — No loop clearly earns weekly reopen alone; most social/content loops are **partial** (graph-density + no newness chrome). Full cited inventory in [research/01-inventory-existing-loops.md](research/01-inventory-existing-loops.md).
- [02 — Sticky anti-pattern kill list](issues/02-sticky-anti-pattern-kill-list.md) — Nine retention anti-patterns vetoed for sticky candidates (daily/loss streaks, points/XP, opaque For You fill, obligation nags, personal watch diary, infinite feed firehose, leaderboards, pay-to-see social, artificial FOMO); carve-outs documented. See [research/02-sticky-anti-pattern-kill-list.md](research/02-sticky-anti-pattern-kill-list.md).
- [03 — Deepen-existing candidates](issues/03-deepen-existing-candidates.md) — Five deepen drafts (Following new-since, For you motion, Activity personal slice, honest thin-graph, Title peer-motion); parks cold-start/Search/unlock-TTL sticky/etc. See [research/03-deepen-existing-candidates.md](research/03-deepen-existing-candidates.md).
- [04 — Personal-ritual candidates](issues/04-personal-ritual-candidates.md) — Net-new personal: weekly favorites curation only; diary/heatmap/streaks/etc. rejected. See [research/04-personal-ritual-candidates.md](research/04-personal-ritual-candidates.md).
- [05 — Social-change candidates](issues/05-social-change-candidates.md) — Net-new social: overlap people-to-follow + overlap-set taste moves; stranger firehose/etc. rejected. See [research/05-social-change-candidates.md](research/05-social-change-candidates.md).
- [06 — Complexity and surface-fit filter](issues/06-complexity-surface-filter.md) — All eight survivors fit existing surfaces; 0/1 new-surface budget spent. See [research/06-complexity-surface-filter.md](research/06-complexity-surface-filter.md).
- [07 — Assemble two-bucket viable map](issues/07-assemble-viable-map.md) — Destination map assembled (5 deepen + 3 net-new). See [research/07-viable-sticky-map.md](research/07-viable-sticky-map.md).

## Not yet specified (residual; outside this effort’s destination)

- How we would **measure** reopen/return if we later built something (metrics / instrumentation).
- Concrete UX for any surviving candidate (prototype territory after this map).
- Whether **NIM sinks** (extra paid actions) should ever be framed as a return loop vs payment hygiene.
- Follow-graph / co-favorite **density** floors assumed for the weekly bar in production.
- Share / public-profile loops as **retention vs acquisition**.
- Habit-inside-Pay vs pure change-triggered reopen (map optimizes for change-true in-app chrome).

Absorbed during tickets: detect change (#1 → 03); Activity personal vs global (#2 → 03); Following vs For you weekly split (both deepened, no exclusive pick); heatmap reopen (#7 → reject decorate-only in 04); Search non-sticky (#8 → reject in 04).

## Out of scope

- Shipping or implementing any sticky feature in this effort.
- Push notifications, OS alerts, email, or web push outside Pay.
- Commitment ranking for an engineering roadmap (viable map ≠ prioritized backlog to build).
- Changing the product’s primary job away from social taste discovery.
- Full Letterboxd-/Trakt-style personal diary/logging product (likely off-job unless a candidate proves otherwise and survives the viable bar).
