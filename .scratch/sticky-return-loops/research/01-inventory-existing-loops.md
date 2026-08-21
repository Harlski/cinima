# Inventory: existing return / reopen loops

Question: What return / reopen loops does NimCharts already create today, and for each: what user-visible state changes over time, how often that change plausibly happens, and whether it already supports a few-times-a-week return without new product surface?

Sources: repo README, Cycle 2 plan, web views/stores, API routes/schema, `packages/shared`. Judgments about *plausible frequency* and *weekly return* are inferences from those mechanics (no product analytics in-repo).

**Cadence bar (from wayfinder map):** optimize for “a few times a week when something meaningful changed,” in-app only (no push). See `.scratch/sticky-return-loops/map.md`.

**Cross-cutting facts that weaken all loops as reopen drivers:**

- Bottom tabs have no unread badges or counts (`apps/web/src/views/AppShell.vue`).
- Discover / Activity / Me / Title load once on `onMounted`; no polling, no `onActivated` refresh pattern (those views).
- No push / email / OS alerts (product intentional per map; README features are in-app).

---

## Summary table

| Loop | User-visible change over time | Plausible frequency of meaningful change | Already supports weekly return? |
|---|---|---|---|
| Favorites cold-start | Onboarding counter → Discover mode flip at ≥3 favorites | Once per account (gate), then gone | **no** (one-shot gate, not a return loop) |
| Follow feed (Discover → Following) | New favorite/unlock cards from followees + relative times | Depends on how often followees act; often rare early; denser with active follows | **partial** |
| Taste-overlap Discover (For you) | Suggestion list / sample wallets / sharedCount; popular fallback if empty graph | Changes when you or peers favorite; can be sticky/stale with small graph | **partial** |
| Unlocks + TV heatmaps | Locked → unlocked ratings/grid; unlocked cells may refresh scores on catalog TTL | Unlock event: rare / per-title; score refresh ~10 days if refetch runs | **partial** (unlock one-shot; refresh subtle) |
| Comments | Per-title list + count; also appears in Activity | Sparse unless titles have active commenters; paid friction (0.1 NIM) | **partial** |
| Thanks / tips | “Thanks” / tip action; Activity row (and tip on-chain to peer) | Sparse; social + payment friction | **partial** / weak for *personal* reopen (see notes) |
| Activity tab | Global recent comments / thanks / unlocks feed | Scales with whole-network activity, not your graph | **partial** |
| Public profile `/:username` | Favorites grid + contribution heatmap (read-only web) | When owner favorites / contributes; viewers see updates outside Pay | **no** as in-app weekly reopen loop (**partial** as share/acquisition surface) |
| Search history | Local recent query list | Only when you search again | **no** |
| Me | Favorites/unlocks grids, lifetime CTA, handle/share, followers/following counts, personal heatmap | Mostly self-authored; follower counts change when others follow | **partial** |

---

## Per-loop inventory

### 1. Favorites cold-start

| Field | Detail |
|---|---|
| **Loop name** | Favorites cold-start (Discover onboarding) |
| **What it is** | Until the user has ≥3 favorites, Discover is an onboarding picker (`mode: "onboarding"`) with progress `favoriteCount / minFavorites`. At threshold, Discover reloads into overlap mode. |
| **User-visible change** | Progress pill increments; candidate list shrinks as favorited; then entire Discover surface switches to Following + For you. |
| **Plausible frequency** | **Once** per account lifetime for the mode flip. Further favorite adds are not framed as cold-start. |
| **Weekly return?** | **no** |
| **Notes / citations** | `MIN_FAVORITES_FOR_DISCOVER = 3` in `packages/shared/src/constants.ts`. Mode switch in `GET /api/discover` (`apps/api/src/index.ts`) and UI in `apps/web/src/views/Discover.vue` (`mode === 'onboarding'`). Product copy: README “Cold start”; plan “Cold start \| Favorites ≥3”. Duplicate logic also in unused-looking `discoverFor` (`apps/api/src/services/favorites.ts`) — live path is the route handler. |

### 2. Follow feed

| Field | Detail |
|---|---|
| **Loop name** | Follow feed (Discover → “Following”) |
| **What it is** | After onboarding, Discover shows recent favorites (grouped per wallet) and unlocks from wallets the user follows. Follow/unfollow from in-app user profiles. |
| **User-visible change** | New/updated feed cards, relative timestamps (`just now` / `Nm` / `Nh` / `Nd`), poster stacks for multi-favorite groups. Empty state until someone is followed. |
| **Plausible frequency** | Bounded by followee activity. Seed demo graph ages favorites across weeks (`seedDemoSocialGraph` in `apps/api/src/services/demoSocial.ts`) — i.e. demoable but not inherently high-cadence. With few quiet followees, feed can sit unchanged for many days. |
| **Weekly return?** | **partial** — only if the user follows people who favorite/unlock at a weekly+ pace; no “new since last visit” marker. |
| **Notes / citations** | `followingFeed` in `apps/api/src/services/follow.ts`; `GET /api/feed` in `apps/api/src/index.ts`; UI section in `Discover.vue` (`feedCards`). Follow graph: `follows` table (`apps/api/src/db/schema.ts`); `POST/DELETE /api/users/:wallet/follow`; `User.vue` Follow button. Feed types: favorites + unlocks only (not comments/thanks). |

### 3. Taste-overlap Discover

| Field | Detail |
|---|---|
| **Loop name** | Taste-overlap Discover (“For you”) |
| **What it is** | Primary job: titles favorited by people who share your favorites, ranked by overlap, excluding yours; cards show sample peer wallets. If no peers, falls back to popular titles with `sharedCount: 0`. |
| **User-visible change** | Suggestion order/membership; thumbs + identicon faces of peers; empty “favorite a few more” if somehow empty after popular fallback fails to fill. |
| **Plausible frequency** | Recalculated on each Discover load from live SQL over `favorites`. Churn when **you** or **overlap peers** add/remove favorites. Small graph → list can be nearly static for long stretches. Popular fallback changes mainly when catalog/ratings or your favorites change. |
| **Weekly return?** | **partial** — core discovery loop, but reopen value depends on peer-graph motion; no “new suggestions” differentiation or last-seen state. |
| **Notes / citations** | Locked primary job in README + `.cursor/plans/nimcharts_cycle_2_8d145ec9.plan.md`. Implementation: `GET /api/discover` peer scoring + `OverlapSuggestion` in `apps/api/src/index.ts`; DTO in `packages/shared/src/dto.ts`; UI “For you” in `Discover.vue`. |

### 4. Unlocks + TV heatmaps

| Field | Detail |
|---|---|
| **Loop name** | Unlocks + TV heat-map |
| **What it is** | Pay 1 NIM/title (or ~10k NIM lifetime) → treasury; unlock reveals IMDb/TMDB ratings and TV season×episode heat-map (locked shows blur / `---`). Lifetime CTA on Me. |
| **User-visible change** | Per title: locked → unlocked ratings and selectable episode cells; Me unlocks grid gains posters; others’ unlocks can appear in Following feed and Activity. Cached episode/title ratings can update when catalog refresh runs (`CATALOG_TTL_DAYS = 10`). |
| **Plausible frequency** | **Unlock itself:** infrequent discretionary purchases. **Post-unlock scores:** on the order of ~weekly-to-fortnightly if `ensureTitleFresh` / TTL path runs on view — not a highlighted “new rating” ritual. Missing cells stay `---`. |
| **Weekly return?** | **partial** — strong one-time revelation; weak recurring reopen reason unless user unlocks many titles over time or notices score drift. |
| **Notes / citations** | Prices: `UNLOCK_NIM`, `LIFETIME_UNLOCK_NIM` in `packages/shared/src/constants.ts`. Detail gating: `GET /api/titles/:id` (`unlocked`, null ratings when locked). UI: `TitleDetail.vue`, `HeatMap.vue`. Persist: `unlocks` table + `POST /api/unlocks` / `POST /api/lifetime`. TTL: `CATALOG_TTL_DAYS` + `isStale` in `apps/api/src/services/catalog.ts`. |

### 5. Comments

| Field | Detail |
|---|---|
| **Loop name** | Flat paid comments |
| **What it is** | Per-title flat comments (max body length enforced server-side), 0.1 NIM → treasury, listed newest-first. |
| **User-visible change** | Comment count on title; new rows with handle/identicon/relative time; global Activity “commented” items. |
| **Plausible frequency** | Low by default (paid + no reply threads). Spikes only if a title becomes a chat locus. |
| **Weekly return?** | **partial** — can create social change on watched titles, but no mention/inbox/unread and payment dampens volume. |
| **Notes / citations** | `comments` schema; `POST /api/comments`, `GET /api/titles/:id/comments`; `TitleDetail.vue` comments section; Activity includes comments (`GET /api/activity`). Plan/README: flat comments, no threads (Cycle 2 out of scope: “comment threads”). |

### 6. Thanks / tips

| Field | Detail |
|---|---|
| **Loop name** | Thanks + optional tip |
| **What it is** | On a title, thank peers who favorited it (free) or tip 1 NIM to their wallet (`thanks:` memo). Stored in `thanks` with optional `tipTxHash`. |
| **User-visible change** | Immediate success on sender side; recipient has no dedicated inbox; rows appear in global Activity. UI labels thanks as **“thanked you”** always (`Activity.vue` `kindLabel`), even though `GET /api/activity` returns thanks for **all** recipients (`toWallet` not filtered to session user). |
| **Plausible frequency** | Rare social micropayments / free signals unless users are connected. |
| **Weekly return?** | **partial** at network level; **weak/no** as a reliable *personal* “someone thanked me” reopen loop given missing personal filter and no unread. |
| **Notes / citations** | Suggesters: `GET /api/titles/:id/suggesters`; `POST /api/thanks`; `TitleDetail.vue` `sendThanks`; Activity UI vs API mismatch as above; DTO includes `toWallet` (`packages/shared/src/dto.ts`). |

### 7. Activity

| Field | Detail |
|---|---|
| **Loop name** | Activity tab (global social chronicle) |
| **What it is** | Merges latest comments, thanks, and unlocks (limit ~30 each, then slice to 40), sorted by time. Tab is a first-class shell destination. |
| **User-visible change** | New feed rows with kind labels, snippets, relative times; click-through to title/user. Empty: “No activity yet”. |
| **Plausible frequency** | Tracks **platform-wide** paid/social actions, not follows. Dense only with an active multi-user deployment; otherwise empty or demo-seed stale. |
| **Weekly return?** | **partial** — surface exists for “what happened,” but global + unpersonalized + no newness chrome limits it as a few-times-a-week reason. |
| **Notes / citations** | `GET /api/activity` in `apps/api/src/index.ts`; `apps/web/src/views/Activity.vue`; shell tab in `AppShell.vue`. Parallel helper `activityFeed` in `social.ts` is not what the route uses (route inlines queries). Favorites are **not** in Activity (they go to Following feed instead). |

### 8. Public profile

| Field | Detail |
|---|---|
| **Loop name** | Public `/:username` favorites page |
| **What it is** | Ungated web profile: handle, favorites posters, contribution heatmap, “Open in Nimiq Pay” CTA. Share URL from Me after handle set. In-app peer view is `User.vue` (favorites + follow + heatmap) via authenticated `GET /api/users/:wallet`. |
| **User-visible change** | Growing favorites list; heatmap cells fill when owner favorites/unlocks/comments/thanks-given (`activityHeatmap` in `follow.ts`). Follower counts on in-app profile. |
| **Plausible frequency** | Changes when the **owner** acts (or gains followers). External visitors returning is acquisition/share dynamics; map still lists “Share / public-profile loops as retention vs acquisition” under Not yet specified. |
| **Weekly return?** | **no** as an in-app reopen driver by itself; **partial** if counting share-surface curiosity / in-app revisits to **others’** profiles after Discover. |
| **Notes / citations** | `GET /api/public/:username`; `PublicProfile.vue`; Me share/handle in `Me.vue` + `POST /api/me/handle`; router public route in `apps/web/src/router/index.ts`. README: public pages stay open on web. |

### 9. Search history

| Field | Detail |
|---|---|
| **Loop name** | Search recent history |
| **What it is** | Client-only `localStorage` list (max 12) of recent queries; shown when the search box is empty. |
| **User-visible change** | History list reorders/grows when the user searches; clear/remove controls. |
| **Plausible frequency** | Only as often as the user chooses to search. No remote/social novelty. |
| **Weekly return?** | **no** — convenience recall, not a change-driven reopen loop. |
| **Notes / citations** | `apps/web/src/lib/searchHistory.ts` (`STORAGE_KEY = "nimcharts.searchHistory"`); `Search.vue`. Catalog search itself can sync upstream on miss (`GET /api/search` → `searchCatalog`), but history does not surface “new results for old queries.” |

### 10. Me

| Field | Detail |
|---|---|
| **Loop name** | Me (profile, collections, identity, lifetime) |
| **What it is** | Identity (identicon/handle), follower/following counts, personal activity heatmap, lifetime unlock banner, share URL / handle prompt, Favorites and Unlocked poster grids. |
| **User-visible change** | Grids grow with self actions; heatmap fills over ~371 UTC days of contributions; follower count if others follow; lifetime banner disappears after purchase; share URL appears after handle. |
| **Plausible frequency** | Mostly mirrors **own** behavior (ritual log), not inbound social change. Inbound: followerCount only (no follower list UI / alerts). |
| **Weekly return?** | **partial** — useful hub to review collections/heatmap, but little exogenous “something changed for me” without other loops feeding it. |
| **Notes / citations** | `GET /api/me`; profile extras via `GET /api/users/:wallet` in `Me.vue`; heatmap accumulation rules in `activityHeatmap` (`follow.ts`: favorites, unlocks, comments, thanks **given**). |

---

## Frequency cheat-sheet (by trigger)

| Trigger source | Loops affected | Typical cadence implied by code |
|---|---|---|
| User favorites (≥3 gate) | Cold-start | Once |
| User favorites (ongoing) | Overlap suggestions, Me, public profile, heatmap, followees’ feeds | Session-driven |
| Peer favorites / unlocks (followed) | Follow feed | Peer-activity dependent |
| Peer favorites (overlap set) | For you | Peer-activity dependent |
| Anyone’s comments / thanks / unlocks | Activity (global) | Network-activity dependent |
| Paid unlock / lifetime | Title heat-map, Me unlocks, feeds | Sparse purchases |
| Catalog TTL refresh (~10d) | Unlocked ratings cells | ~weekly–biweekly if viewed/refetched |
| User search | Search history | User-driven only |
| Follow actions | Me/User follower counts; enables feed | Sparse social graph edits |

---

## Gaps visible from inventory

Questions only (no feature proposals):

1. With no unread/new-since markers and mount-only fetches, when is “something meaningful changed” *detectable* to a returning user without scanning entire feeds?
2. Is Activity meant to be a personal inbox (UI “thanked you”) or a global firehose (API), and which one is the intended sticky surface?
3. Does weekly return depend on an already-dense follow/overlap graph that Cycle 2 does not yet attract, or can solo/small-graph users get weekly change from catalog/unlock mechanics alone?
4. Should public-profile / share loops be scored as retention (owner reopen) or acquisition (viewer → Pay), given they sit outside the Pay tab shell?
5. Are paid sinks (comments, unlocks, tips) expected to produce return cadence, or only depth-on-demand once the user is already back?
6. How much of Discover’s weekly value is supposed to come from Following vs For you when both share one tab and one empty-state vulnerability?
7. Does the personal activity heatmap on Me/public profiles create reopen desire independently, or only decorate other loops?
8. Search history never resurfaces catalog novelty for old queries — is Search intentionally non-sticky in the return map?
9. What density of co-favorites is required before overlap suggestions stop falling through to “popular with empty faces,” and is that density assumed for the weekly bar?
10. Without push or tab badges, is “few times a week” assumed to be habit inside Pay Discover, or triggered by change the user somehow learns about?

---

*Inventory date: 2026-08-05. Primary code paths cited as of that snapshot.*
