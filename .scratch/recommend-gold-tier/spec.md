# Spec: Recommend tier, modular seams, API tests

Status: ready-for-agent

## Problem Statement

Favorites are a flat batch: every favorited movie or show looks the same, so standout taste is hard to express or read on profiles and Discover. Separately, serviceability is hard while auth/catalog/social/payments logic is entangled and almost nothing is proven by automated tests.

## Solution

Add **Recommend** as a gold-star upgrade on an existing **Favorite** (max five; block a sixth until one is cleared). Show Recommends distinctly on Me and peer/public profiles, and weight shared Recommends more heavily than shared Favorites in Discover. Keep a **modular monolith** (clear module seams, one deployable). Treat a feature as done when its behaviour is covered at the **HTTP API + isolated SQLite** seam.

## User Stories

1. As a Cinima user, I want to mark a Favorite with a gold Recommend, so that peers know which titles stand out for me.
2. As a Cinima user, I want Recommend to require a Favorite first, so that gold only upgrades titles I already claim.
3. As a Cinima user, I want at most five Recommends, so that gold stays scarce and meaningful.
4. As a Cinima user, I want a clear error when I try a sixth Recommend, so that I know I must remove one first.
5. As a Cinima user, I want to remove a Recommend without unfavoriting, so that I can demote a title while keeping it in my batch.
6. As a Cinima user, I want unfavoriting a title to clear its Recommend automatically, so I never have orphan gold.
7. As a Cinima user, I want to see my Recommends as a distinct group on Me, so that my standouts are obvious to me.
8. As a Cinima user, I want Favorites on Me to still list all favorites with a gold badge when Recommended, so that I have one inventory with clear standout cues.
9. As a peer browsing my profile, I want to see their Recommends distinctly, so that I can spot standout taste quickly.
10. As a peer browsing a public profile, I want the same Recommend / Favorite distinction, so that share links communicate standouts.
11. As a Discover user with Favorites, I want titles that peers Recommend (and that overlap my taste graph) to rank above titles that are only mutual Favorites, so that standouts surface first.
12. As a Discover user, I want plain Favorite overlap to still work when Recommends are sparse, so that Discover does not go empty.
13. As a Cinima user opening a title, I want to see whether I Favorited and/or Recommended it, so that I can change either mark.
14. As a Cinima user on a title, I want suggesters / social cues to reflect Recommend when relevant, so that gold is visible in the decision moment (without inventing a new primary job).
15. As a developer, I want social taste (Favorite / Recommend / Discover overlap) behind a clear module boundary, so that it can evolve without editing payment or catalog guts.
16. As a developer, I want catalog, payments, and auth kept as separate modules in the same API process, so ongoing serviceability does not require microservices.
17. As a developer, I want Favorites and Recommend cap rules covered by HTTP API tests on an isolated DB, so regressions are caught without browser E2E.
18. As a developer, I want Discover ranking differences (Recommend vs Favorite overlap) covered by API tests, so ranking changes stay intentional.
19. As a developer, I want Me and public profile payloads to include Recommend state in contract tests, so clients can rely on the shape.
20. As a Cinima user in demo/Pay, I want Recommend available in the same auth context as Favorite, so gold is not a separate login world.
21. As a Cinima user at the Recommend cap, I want the UI to make “remove one first” obvious when I tap gold on a sixth title, so scarcity feels fair.
22. As a Cinima user, I want Favorite remove still to work when a title is Recommended, so cleanup is one gesture if I leave the title entirely.

## Implementation Decisions

- Follow ADR-0001: single deployable API; extract/clarify module seams for at least **social taste** (Favorite, Recommend, Discover overlap scoring), without splitting deployables. Catalog, payments, and auth remain separate modules in-process.
- Follow ADR-0002: done means HTTP/API domain tests; UI is implementation necessary for the stories but not the automated done bar.
- Domain vocabulary from `CONTEXT.md`: **Favorite**, **Recommend** (not “super-like”, not an independent mark).
- Persist Recommend as state on the Favorite relationship (upgrade flag / timestamp), not a parallel table that can exist without Favorite. Unfavorite deletes Recommend.
- Hard cap: **5** Recommends per user wallet. Attempting to set a sixth returns a clear client-visible error; no auto-demote; no picker required for this slice (block until unset).
- Removing Recommend keeps Favorite.
- Discover: overlap ranking must weight a shared Recommend more than a shared Favorite alone (exact numeric weights are an implementation choice but must be asserted by tests: recommend-overlap ranks above favorite-only overlap when other factors are equal).
- API surface (conceptual): set/clear Recommend for a title; Favorite create/delete unchanged in spirit but Favorite delete clears Recommend; Me, peer user, and public profile responses expose Recommends distinctly and mark Favorites that are Recommended; title detail exposes favorited + recommended booleans; Discover continues as existing modes but scoring uses Recommend weight.
- Client: gold-star control only enabled when Favorited (or favorites+recommends in one interaction that ensures Favorite first); Me and profiles show distinct Recommend presentation plus badge on favorited posters.
- Module refactor is in-scope only as far as needed to place social taste behind a seam and make HTTP tests clean — not a full rewrite of payments/catalog.

## Testing Decisions

- **Good test**: asserts external behaviour via the HTTP API against an isolated SQLite database (status codes, response bodies, ranking order, cap errors). Does not assert internal SQL layout, private helpers, or Vue rendering.
- **Primary seam**: Cinima HTTP API + isolated SQLite.
- **Must cover**: Favorite then Recommend; Recommend without Favorite rejected; cap of 5 then block; clear Recommend keeps Favorite; unfavorite clears Recommend; Me/profile distinct Recommend data; Discover ordering prefers Recommend overlap over Favorite-only overlap in a controlled fixture.
- **Prior art**: none in-repo today — introduce the first API test harness (app mount + temp DB) as part of this work.
- UI/E2E not required for done.

## Out of Scope

- Catalog TTL refresh / scheduled ingestion.
- Payment integrity hardening (sender binding, replay prevention, demo-mode fail-closed).
- Separately deployable microservices.
- Raising or removing the Recommend cap; % of favorites caps; auto-LRU demotion.
- Push/email notifications; new primary Discover job.
- Full browser E2E suite as the definition of done.
- Content moderation tooling.

## Further Notes

- Product names in UI may say “gold star”; glossary term remains **Recommend**.
- Exact Discover weight constants can be tuned later but behaviour “Recommend overlap beats Favorite-only overlap, ceteris paribus” is fixed for this spec.
- After this ships, catalog freshness and payment integrity remain the next fundamental serviceability gaps (separate specs).
