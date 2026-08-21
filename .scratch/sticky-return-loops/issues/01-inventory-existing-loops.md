# 01 — Inventory today’s return loops

Type: research
Status: resolved
Blocked by:

## Question

What return / reopen loops does NimCharts **already** create today (favorites cold-start, follow feed, taste-overlap Discover, unlocks + TV heatmaps, comments, thanks/tips, Activity, public profile, search history, Me), and for each: what user-visible state changes over time, how often that change plausibly happens, and whether it already supports a few-times-a-week return without new product surface?

Deliverable: a cited inventory Markdown under `.scratch/sticky-return-loops/research/` linked from this ticket’s Comments/Answer when resolved.

## Answer

Cited inventory lives at [`.scratch/sticky-return-loops/research/01-inventory-existing-loops.md`](../research/01-inventory-existing-loops.md).

**Headline:** No existing loop clearly earns a few-times-a-week reopen on its own. Cold-start and search history are **no**. Follow feed, taste-overlap Discover, Activity, comments/thanks, unlocks/heatmaps, public profile (as retention), and Me are **partial** — mostly gated on peer/network density, with no unread/new-since chrome and mount-only loads across Discover / Activity / Me.

Cross-cutting weakeners: no tab badges (`AppShell.vue`); no polling / `onActivated` refresh; in-app only by product design.

## Comments

- Research written by [Inventory existing return loops](e02a9dff-17e8-4bbe-81de-22053c133996): `.scratch/sticky-return-loops/research/01-inventory-existing-loops.md`.
- Formally resolved after research completed; parent session recorded Answer + map pointer.
