# API/domain tests define done

A feature is not done until its API/domain behaviour is covered by automated tests (red-green via `/tdd` inside `/implement`). Prefer contract-level coverage of flows such as favorites, Recommend cap rules, unlocks, and Discover ranking. Full browser E2E for every flow is not the default bar; UI remains mostly smoke or manual unless a flow cannot be proven at the API boundary.
