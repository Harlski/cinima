# Cinima

Social taste discovery for movies and TV inside Nimiq Pay. Users share favorites so peers can find titles through taste overlap.

## Language

**Handle**:
A user’s chosen shareable Cinima identity, distinct from their wallet address.
_Avoid_: username, wallet name

**Identicon**:
The Nimiq wallet face that stands in for a Handle when a portrait is needed: profiles, Following strip, Share preview, and Credits.
_Avoid_: avatar, profile photo, gravatar

**Public Profile**:
The unauthenticated share page for a Handle: identity, Recommends, Favorites, and Achievement count. Favorites on Public Profile, Me, and other Handles' profiles are Favorite-only; Recommended titles appear under Recommends, not again under Favorites. Achievement count is visible here; Credits are not.
_Avoid_: activity feed, heatmap, Me, User page, Watchlist on Public Profile

**Title Share**:
The unauthenticated share page for one Handle plus one Title. It tells the recipient that the Handle wants them to check out that Title, and links to the Handle's Public Profile.
_Avoid_: Public Profile, invite, checkout page, OG page, Watchlist Share

**Title Share link**:
The public URL that names a Handle and a Title together so a recipient lands on that Title Share.
_Avoid_: query-string share, profile-only URL, encoded Title ID in the path

**Short Share**:
The compact public URL (`/s/{code}`) that resolves to a Title Share, Public Profile, or Watchlist Share. The link recipients copy; the long Handle path is what it opens.
_Avoid_: bitly, vanity URL as a separate product

**Site origin**:
The public web host Nimiq Pay trusts: cinima.app. Share URLs, Share preview, and Pay intents use https://cinima.app.
_Avoid_: www.cinima.app

**Share preview**:
The poster-and-copy card that messaging and social apps show for a Title Share link, Short Share link, Public Profile link, or Watchlist Share link before the recipient opens Cinima. A Public Profile Share preview shows the Handle's Identicon plus Recommend title cards (Favorites only when there are no Recommends). A Watchlist Share preview shows the Identicon plus Watchlist title cards.
_Avoid_: OG card, unfurl, link preview, metadata card, physical card

**Share sheet**:
The in-app dialog for copying a Title Share, Public Profile, or Watchlist Share link. It shows the Share preview so the sender sees the same card a recipient's app will display.
_Avoid_: share modal, OG preview, share popup

**X Handle**:
An optional public link to the user’s X profile. Not their Cinima Handle.
_Avoid_: twitter username as Cinima identity

**Favorite**:
A user’s mark that they enjoy a movie or show. Binary per user and title; the baseline taste signal. A Recommend is still a Favorite in the mark, but Favorite lists on profiles show Favorite-only titles.
_Avoid_: like, bookmark

**Favorite-only**:
A Favorite that is not also a Recommend. Profile Favorite lists (Public Profile, Me, other Handles) and title taste Favorite counts show Favorite-only titles; Recommended titles appear under Recommends instead.
_Avoid_: un-recommended favorite, leftover favorite

**Watchlist**:
A user’s save-for-later queue of titles they intend to watch. Distinct from Favorite (taste signal) and Recommend (gold-star upgrade). Shown on the Watchlist tab as a browsable deck. Not listed on Public Profile; sharing it is a Watchlist Share.
_Avoid_: watchlist as UI label (use “My List”), save, bookmark, Watchlist as a taste mark

**Watchlist Share**:
The unauthenticated share page for one Handle plus their current Watchlist. It asks the recipient to help pick what to watch next, and links to the Handle's Public Profile. Live with the Watchlist, not a frozen snapshot.
_Avoid_: Public Profile, Title Share, My List as a public URL, Watchlist as automatically public

**Watchlist Share link**:
The public URL that names a Handle's Watchlist so a recipient lands on that Watchlist Share.
_Avoid_: query-string share, profile-only URL, encoded Title ID in the path

**Recommend**:
A gold-star upgrade on a Favorite, meaning this title stands out among the user’s favorites — not a separate mark from Favorite. A user may hold at most six movie Recommends and six TV Recommends at a time; a seventh of that media type is blocked until one of that type is removed. Unfavoriting clears Recommend. Shared Recommends are a stronger taste-overlap signal than shared Favorites alone.
_Avoid_: rating, review, super-like (unless used only as UI synonym), highlight, top pick as a separate mark

**Title taste counts**:
On title detail, peer social tallies under the rating / year / media line: Recommend count (peers with Recommend) and Favorite count (peers Favorited without Recommend). A peer who Recommended is not counted in Favorites. Tapping either opens a tabbed Handle list (Recommends | Favorites). Viewer’s own mark is excluded from both counts.
_Avoid_: popularity, TMDB vote count, including Recommenders in Favorite count

**Rating**:
A TMDB community vote average for a title or episode. Catalog data, always visible to signed-in users.
_Avoid_: IMDb rating, unlockable score, locked rating

**Popularity**:
A TMDB community popularity score for a title. Catalog data; distinct from Rating and from how many users Favorited it.
_Avoid_: favorite count, trending, most liked, vote average

**Catalog data**:
Title names, posters, synopses, Ratings, Popularity, and for TV the season and episode listings, sourced from TMDB and cached by Cinima. A Favorite of a TV show makes that show's seasons Catalog data for everyone. Cinima does not sell access to this data.
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
One action that sends Thanks to every remaining peer who Favorited a title (including those who Recommended it). On title detail, peers are shown as Identicons with a Favorited count; tapping the stack opens the same tabbed Handle list used by Title taste counts. Individual per-peer Thanks are not offered on that screen.
_Avoid_: mass tip, blast, thank everyone as a separate mark

**Favorites onboarding**:
The Discover gate for accounts under the Favorite minimum. Shows three scrolling poster rows drawn from the local Catalog cache: recognizable recent movies and TV (with posters), ranked by peer Favorite overlap then popularity. Selection is local until Continue commits Favorites; Skip remembers the choice on the account and enters For You with popular cached suggestions. Continue and Skip leave the picker for an Accepted wait while Discover loads. No title detail or search on this screen.
_Avoid_: swipe deck, search-to-unlock, auto-favorite on tap, live catalog fetch on this screen

**Accepted wait**:
The signal that a tap has landed while Cinima is still on the same screen talking to the API: the control disables and names the wait (Continue becomes Continuing…, Enter becomes Entering…), or the hex spinner and cinema wait lines replace a screen that has nothing left to show. Follow keeps the Follow label while busy, because Following already means the person is followed.
_Avoid_: toast, silent dimmed button, Following as a wait label, spinner-only on Continue / Enter / Skip

**Guided tour**:
An optional walkthrough of Watchlist, Search, community Recommends (always at least one title, a hardcoded fallback when nobody else has Recommended), Watchlist actions, a required Favorite, a required Recommend, taking that title off the profile, For You, and Find people (Creator profile). Offered once after Favorites onboarding clears; skippable anytime (a notice then points back to Me); replayable from Me. Distinct from Favorites onboarding and Handle onboarding.
_Avoid_: product tour as a separate product term, tutorial modal stack, skippable Favorite or Recommend as the way to finish the walkthrough

**Following strip**:
On Discover Following, the horizontal selectable row of followee Identicons (plus Find people) sticky under the brand header. Selecting a followee shows their Handle above the Identicon and filters the feed to that person's recent Favorites and unlocks. Unseen activity sorts ahead of already-viewed activity when the viewer returns to Following.
_Avoid_: stories rail, avatar carousel, Following tabs chrome

**Find people**:
The Following strip entry (black-and-white hexagon with +) that opens a centered list of Handles the viewer does not already follow, with Favorite counts by media type and Thanks received, so the viewer can follow or open a Public Profile.
_Avoid_: user search, directory as a top-level tab, invite sheet

**Search**:
The signed-in tab for finding titles by typed query: results are title cards, and opening one is title detail (where Catalog data for that title is filled in). A search that does not finish is Accepted wait, then Retry, not "No results found".
_Avoid_: user search, Find people, autocomplete as a separate product, observability as a product term

**Thanks received**:
How many Thanks other users have sent to this Handle. The social reputation signal shown in Find people.
_Avoid_: thank rating, thanks score, tip count

**Creator**:
The wallet that operates Cinima. The guided tour introduces this Handle; Studio is visible only to this wallet when signed in.
_Avoid_: admin, owner, superuser, operator as a product term

**Studio**:
The Creator-only read of how people use Cinima: signups, Presence, searches, title views, shares, Share visits, and follows. Not part of the public product. Entry is at the bottom of Me.
_Avoid_: admin dashboard, analytics, backoffice, CMS, Door alarm

**Share visit**:
A human opening a Short Share, Public Profile, Title Share, or Watchlist Share. Distinct from a social crawler fetching a Share preview. Counted as web (cinima.app in a browser) or pay (inside Nimiq Pay). A Pay intent is a tap toward opening in Pay from that page (Already Installed, Get Nimiq Pay, or Explore CINIMA).
_Avoid_: page view of Landing, crawler hit, impression, click as a generic term

**Door alarm**:
Creator-only Telegram notices of live usage (sign-in, search, title view, share created, Share visit). A pager, not a dashboard; Studio remains the pull read. Not part of the public product.
_Avoid_: webhook log, Slack alert, analytics ping, Studio notification

**Achievement**:
A named, once-earned credit for a Cinima action that teaches the product or rewards coming back. The catalog: Opening night (first Recommend), Full house (all movie and TV Recommend slots filled), Word of mouth (Title Share), What's next (Watchlist Share), Bravo (sent Thanks), Encore (received Thanks), High seas (ten unique title views), Season ticket (second distinct UTC day with Presence), That's a wrap (finished the Guided tour).
_Avoid_: badge as a separate product term, XP, streak freeze, daily quest, points economy

**Achievement count**:
How many Achievements a Handle has earned. The one-liner on Public Profile, Me, and other Handles' profiles.
_Avoid_: Achievement points as a separate score, XP, karma

**Credits**:
The Pay-only screen of the Achievement catalog for a Handle: earned rows with date, still-locked rows with the action that unlocks them. Public Profile shows Achievement count only; Credits are not on the unauthenticated share page. Other Handles' Credits are visible only inside Nimiq Pay.
_Avoid_: trophy case, badge wall, activity feed, heatmap, earned-only list

**Marquee**:
A solid bar that slides down from the Cinima brand header when the signed-in Handle earns an Achievement. Shows the Achievement name and what they did to unlock it. One at a time, queued, dismissible with X. Not shown on public web pages.
_Avoid_: toast, modal, floating gold card, confetti blast, blocking dialog, slide-up above the tab bar

**Recommend cue**:
A solid bar that slides up above the tab bar after a new Recommend outside the Guided tour. Names the title and offers Share. Dismissing it does not share.
_Avoid_: auto-opening Title Share, modal, Marquee

**Presence**:
Time a signed-in Handle spent with Cinima in the foreground, counted in Studio. Distinct from a wallet session token.
_Avoid_: session duration, screen time, DAU as a product term

**Landing**:
The public root page (`/` and `/gate`) that explains what Cinima is. Shows a scrolling strip of title-card posters loaded from the TMDB image CDN (curated `poster_path` list; not vendored in the repo), with TMDB attribution on the page. Outside Nimiq Pay the CTA is Explore (same Enter styling; opens a centered pay-only gate modal with Already Installed? (open) in a gold glow via HTTPS Pay intent (`https://nimpay.app/miniapps/open/…`), Get Nimiq Pay, and Inquiries; on a desktop, clicking Already Installed? shows a Full access only on mobile tooltip, then moves the gold glow to Get Nimiq Pay with a Learn about Nimiq Pay tooltip); inside Pay the CTA is Enter, which connects the wallet while staying on Landing, shows a Welcome / Welcome Back identicon overlay, then enters Discover (Favorites onboarding or For You). Landing never auto-boots auth. Contact is X (https://x.com/cinima_app) and Email (cinima.app@gmail.com). Public Profile / Title Share / Short Share show a floating Explore CINIMA button (no bar chrome; `2.75rem + safe-area-inset-bottom` lift). Outside Pay, title taps open a gate modal that matches Title Share layout (poster, year / media / rating, overview) plus Already Installed / Get Nimiq Pay, X + Telegram, and View on IMDb.
_Avoid_: marketing site, splash, home feed, auto sign-in on open, navigating into the app before wallet connect, vendoring studio posters in git
