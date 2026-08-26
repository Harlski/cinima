# Cinima

Social taste discovery for movies and TV inside Nimiq Pay. Users share favorites so peers can find titles through taste overlap.

## Language

**Handle**:
A user’s chosen shareable Cinima identity, distinct from their wallet address.
_Avoid_: username, wallet name

**Public Profile**:
The unauthenticated share page for a Handle: identity, Recommends, and Favorites.
_Avoid_: activity feed, heatmap, Me, User page

**Title Share**:
The unauthenticated share page for one Handle plus one Title. It tells the recipient that the Handle wants them to check out that Title, and links to the Handle's Public Profile.
_Avoid_: Public Profile, invite, checkout page, OG page

**Title Share link**:
The public URL that names a Handle and a Title together so a recipient lands on that Title Share.
_Avoid_: query-string share, profile-only URL, encoded Title ID in the path

**Share preview**:
The poster-and-copy card that messaging and social apps show for a Title Share link, Short Share link, or Public Profile link before the recipient opens Cinima.
_Avoid_: OG card, unfurl, link preview, metadata card, physical card

**X Handle**:
An optional public link to the user’s X profile. Not their Cinima Handle.
_Avoid_: twitter username as Cinima identity

**Favorite**:
A user’s mark that they enjoy a movie or show. Binary per user and title; the baseline taste signal.
_Avoid_: like, bookmark

**My List**:
A user’s private save-for-later queue of titles they intend to watch. Distinct from Favorite (taste signal) and Recommend (gold-star upgrade). Shown on the My List tab as a browsable deck.
_Avoid_: watchlist as UI label (use “My List”), save, bookmark

**Recommend**:
A gold-star upgrade on a Favorite, meaning this title stands out among the user’s favorites — not a separate mark from Favorite. A user may hold at most six movie Recommends and six TV Recommends at a time; a seventh of that media type is blocked until one of that type is removed. Unfavoriting clears Recommend. Shared Recommends are a stronger taste-overlap signal than shared Favorites alone.
_Avoid_: rating, review, super-like (unless used only as UI synonym), highlight, top pick as a separate mark

**Rating**:
A TMDB community vote average for a title or episode. Catalog data, always visible to signed-in users.
_Avoid_: IMDb rating, unlockable score, locked rating

**Popularity**:
A TMDB community popularity score for a title. Catalog data; distinct from Rating and from how many users Favorited it.
_Avoid_: favorite count, trending, most liked, vote average

**Catalog data**:
Title names, posters, synopses, Ratings, and Popularity sourced from TMDB. Cinima does not sell access to this data.
_Avoid_: OMDb listings, IMDb data

**IMDb link**:
An outbound IMDb page for a title or episode, opened from a TMDB-provided IMDb id (`tt…`). Identity bridge only; not Catalog data and not a Rating.
_Avoid_: IMDb data, IMDb rating, sourced from IMDb

**Attribution**:
Required TMDB credit: logo plus the non-endorsement notice that the application uses TMDB and the TMDB APIs.
_Avoid_: powered by IMDb, sourced from OMDb

**Thanks**:
A user’s directed signal that another user’s Favorite of a title was useful. Binary per thanker, thankee, and title.
_Avoid_: tip, like, kudos, shout-out

**Thank all**:
One action that sends Thanks to every remaining peer who Favorited a title.
_Avoid_: mass tip, blast, thank everyone as a separate mark

**Favorites onboarding**:
The Discover gate for accounts under the Favorite minimum. Shows three scrolling poster rows drawn from the local Catalog cache: recognizable recent movies and TV (with posters), ranked by peer Favorite overlap then popularity. Selection is local until Continue commits Favorites; Skip remembers the choice on the account and enters For You with popular cached suggestions. No title detail or search on this screen.
_Avoid_: swipe deck, search-to-unlock, auto-favorite on tap, live catalog fetch on this screen

**Following strip**:
On Discover Following, the horizontal selectable row of followee Identicons (plus Find people) sticky under the brand header. Selecting a followee shows their Handle above the Identicon and filters the feed to that person's recent Favorites and unlocks. Unseen activity sorts ahead of already-viewed activity when the viewer returns to Following.
_Avoid_: stories rail, avatar carousel, Following tabs chrome

**Find people**:
The Following strip entry (black-and-white hexagon with +) that opens a centered list of Handles the viewer does not already follow, with Favorite counts by media type and Thanks received, so the viewer can follow or open a Public Profile.
_Avoid_: user search, directory as a top-level tab, invite sheet

**Thanks received**:
How many Thanks other users have sent to this Handle. The social reputation signal shown in Find people.
_Avoid_: thank rating, thanks score, tip count

**Landing**:
The public root page (`/` and `/gate`) that explains what Cinima is. Shows a scrolling strip of title-card posters loaded from the TMDB image CDN (curated `poster_path` list; not vendored in the repo), with TMDB attribution on the page. Outside Nimiq Pay the CTA is Explore (same Enter styling; opens a centered pay-only gate modal with Already Installed? (open) via `nimiqpay://`, Get Nimiq Pay, and Inquiries); inside Pay the CTA is Enter, which connects the wallet while staying on Landing, shows a Welcome / Welcome Back identicon overlay, then enters Discover (Favorites onboarding or For You). Landing never auto-boots auth. Contact is X (https://x.com/cinima_app) and Email (cinima.app@gmail.com). Public Profile / Title Share / Short Share show a floating Explore CINIMA button (no bar chrome; `2.75rem + safe-area-inset-bottom` lift). Outside Pay, title taps open a gate modal that matches Title Share layout (poster, year / media / rating, overview) plus Already Installed / Get Nimiq Pay, X + Telegram, and View on IMDb.
_Avoid_: marketing site, splash, home feed, auto sign-in on open, navigating into the app before wallet connect, vendoring studio posters in git
