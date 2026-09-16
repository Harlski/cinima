# Cinima

Social taste discovery for movies and TV inside Nimiq Pay. Users share favorites so peers can find titles through taste overlap.

## Language

**Handle**:
A user’s chosen shareable Cinima identity, distinct from their wallet address.
_Avoid_: username, wallet name

**Identicon**:
The Nimiq wallet face that stands in for a Handle when a portrait is needed: profiles, Following strip, Followee peek, Share preview, and Credits.
_Avoid_: avatar, profile photo, gravatar

**Public Profile**:
The unauthenticated share page for a Handle: identity, Recommends, Favorites, and Achievement count. Favorites on Public Profile, Me, and other Handles' profiles are Favorite-only; Recommended titles appear under Recommends, not again under Favorites. Achievement count is visible here; Credits are not. Comments are not.
_Avoid_: Feed, Followee peek, heatmap, Me, User page, Watchlist on Public Profile, Comments

**Title Share**:
The unauthenticated share page for one Handle plus one Title. It tells the recipient that the Handle wants them to check out that Title. Identicon and Handle open Public Profile; Explore CINIMA is the page CTA.
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

**Watchlist leave**:
A recorded exit from Watchlist. An optional Watchlist leave reason is stored so a watched history can exist later; Cinima does not show that history yet.
_Avoid_: watched tab, history as a current product surface, required reason

**Watchlist leave reason**:
Optional why on a Watchlist leave: Watched, Not for me, or Changed my mind.
_Avoid_: rating, review, required dropdown

**Watchlist leave Favorite cue**:
After a Watchlist leave, if the Title is not a Favorite, a second confirm asks whether to Favorite it.
_Avoid_: auto-favorite on leave, combining Favorite into the leave confirm

**Watchlist leave Thank all cue**:
After a Watchlist leave, if remaining peers Favorited the Title and are unthanked, a confirm offers Thank all. Any Watchlist leave reason; skipped during the Guided tour. Distinct from Send Custom Message; Thank all does not open Pay sheets.
_Avoid_: User Send blast, required thanks on leave, combining Thank all into the leave confirm

**Watchlist Share**:
The unauthenticated share page for one Handle plus their current Watchlist. It asks the recipient to help pick what to watch next. Identicon and Handle open Public Profile; Explore CINIMA is the page CTA. Live with the Watchlist, not a frozen snapshot.
_Avoid_: Public Profile, Title Share, My List as a public URL, Watchlist as automatically public

**Watchlist Share link**:
The public URL that names a Handle's Watchlist so a recipient lands on that Watchlist Share.
_Avoid_: query-string share, profile-only URL, encoded Title ID in the path

**Recommend**:
A gold-star upgrade on a Favorite, meaning this title stands out among the user’s favorites — not a separate mark from Favorite. A user may hold at most six movie Recommends and six TV Recommends at a time; a seventh of that media type is blocked until one of that type is removed. Unfavoriting clears Recommend. Shared Recommends are a stronger taste-overlap signal than shared Favorites alone.
_Avoid_: rating, review, super-like (unless used only as UI synonym), highlight, top pick as a separate mark

**Comment**:
A user’s written take on a Title. Shown on title detail, Feed, Me, and other Handles' profiles. Not on Public Profile. Distinct from Recommend and from Thanks.
_Avoid_: review, rating, post, tweet

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
A user’s directed signal that another user’s Favorite of a title was useful. Binary per thanker, thankee, and title. Distinct from Comment Thanks. May attach a Reward and at most one User Send. One-to-one Thanks opens Send Custom Message first; the mark lands when they confirm a note. Not now sends no Thanks.
_Avoid_: tip, like, kudos, shout-out, Comment Thanks as the same mark

**Comment Thanks**:
A user’s directed signal that another user’s Comment was useful. Binary per thanker and Comment. Distinct from Thanks. Counts toward Bravo, Encore, Thanks received, and Presence heatmap. Opens Send Custom Message first; the mark lands when they confirm a note. Not now sends no Comment Thanks.
_Avoid_: like, kudos, title Thanks as the same mark, unlike

**Thank all**:
One action that sends Thanks to every remaining peer who Favorited a title (including those who Recommended it). On title detail it appears when peers remain unthanked. After a Watchlist leave, the Watchlist leave Thank all cue offers the same action. The Handle list opens from Title taste counts. Individual per-peer Thanks are offered in that list, not as a second Favorited count on the page. Thank all does not open Send Custom Message.
_Avoid_: mass tip, blast, thank everyone as a separate mark, User Send on Thank all

**Favorites onboarding**:
The Discover gate for accounts under the Favorite minimum. Shows three scrolling poster rows drawn from the local Catalog cache: recognizable recent movies and TV (with posters), ranked by peer Favorite overlap then popularity. Selection is local until Continue commits Favorites; Skip remembers the choice on the account and enters For You with popular cached suggestions. Continue and Skip leave the picker for an Accepted wait while Discover loads. No title detail or search on this screen.
_Avoid_: swipe deck, search-to-unlock, auto-favorite on tap, live catalog fetch on this screen

**Accepted wait**:
The signal that a tap has landed while Cinima is still on the same screen talking to the API: the control disables and names the wait (Continue becomes Continuing…, Enter becomes Entering…), or the hex spinner and cinema wait lines replace a screen that has nothing left to show. Follow keeps the Follow label while busy, because Following already means the person is followed.
_Avoid_: toast, silent dimmed button, Following as a wait label, spinner-only on Continue / Enter / Skip

**Guided tour**:
An optional walkthrough of Watchlist, Search, community Recommends (always at least one title, a hardcoded fallback when nobody else has Recommended), Watchlist actions, a required Favorite, a required Recommend, taking that title off the profile, For You (one remaining Title, a required Pass, then the next five land, then Continue), and Find people (Creator profile). Offered once after Favorites onboarding clears; skippable anytime (a notice then points back to Me); replayable from Me. Distinct from Favorites onboarding and Handle onboarding. Completing or skipping it is what opens Achievement earning for good, except Joined the crew (replay does not close the gate). Completing awards That's a wrap as the first gated Achievement, then any others already true from the tour.
_Avoid_: product tour as a separate product term, tutorial modal stack, skippable Favorite or Recommend as the way to finish the walkthrough

**For You**:
The Discover tab of personalized Title suggestions for a Handle, shown as a For You set. Taste overlap first (shared Recommends outrank shared Favorites), then popular Catalog as a FIFO queue so For You does not empty while eligible titles remain.
_Avoid_: home feed, Recommends as the same tab, Search, overlap suggestions as the product name

**For You set**:
The five Title suggestions currently shown on For You. A Pass, Favorite, or Watchlist add removes that Title from the set without backfill. Cinima keeps a bank of the next two sets (ten titles, posters warmed) whenever a set is on screen; when the set is empty, it deals the first banked five immediately and fills the bank back to two sets. The strip always opens on the center card. A refill lays all five slots out first so that center stays in the middle, then turns each card on as it lands (LTR 4 2 1 3 5: center, left, right, far left, far right).
_Avoid_: deck window, suggestion window, refresh cycle, caught up empty copy

**Pass**:
A Handle's 48-hour exclusion of a Title from For You. Not a taste mark; Search, title detail, Watchlist, Favorite, Recommend, and the Recommends tab still include the Title. After 48 hours it is a For You candidate again.
_Avoid_: ignore, throw, skip, dismiss, Not for me, hide as a public mark

**Feed**:
The Discover tab of recent Comments from any Handle (not only followees), newest first. Deleted Comments are omitted. Each row is a Comment on a Title; the viewer can send Comment Thanks from here.
_Avoid_: activity feed, Following as the tab label, followee-only comments, likes

**Following strip**:
On Discover Feed, the horizontal row of followee Identicons (plus Find people) sticky under the brand header. Tapping a followee opens a Followee peek. Unseen activity sorts ahead of already-viewed activity when the viewer returns to Feed.
_Avoid_: stories rail, avatar carousel, Following as the tab label, strip as a feed filter

**Followee peek**:
A short modal for one followee: Identicon, Handle, Movie and TV Recommends only, and View Profile. Not Public Profile and not Favorites.
_Avoid_: profile page, Favorites in the peek, stories, heatmap

**Find people**:
The Following strip entry (black-and-white hexagon with +) that opens a centered list of Handles the viewer does not already follow, with Favorite counts by media type and Thanks received, so the viewer can follow or open a Public Profile.
_Avoid_: user search, directory as a top-level tab, invite sheet

**Search**:
The signed-in tab for finding titles by typed query. Results are title cards; opening one is title detail, where Catalog data for that title is filled in. A search that does not finish is Accepted wait, then Retry, not "No results found".
_Avoid_: user search, Find people, autocomplete as a separate product, observability as a product term

**Thanks received**:
How many Thanks and Comment Thanks other users have sent to this Handle. The social reputation signal shown in Find people.
_Avoid_: thank rating, thanks score, tip count, Reward count

**Send**:
An outgoing NIM transfer from the Sender wallet to a Handle's wallet, with a memo Nimiq Pay shows in its header. Rewards, Pings, and Join grants are Sends. Distinct from a User Send.
_Avoid_: notification, tip, payout, treasury transfer, like, User Send

**User Send**:
A 1 NIM transfer the thanker approves in Nimiq Pay to the thankee, with an optional custom memo picked from a fixed list. Pay may broadcast from a hop wallet rather than the signed-in address. UI: Send Custom Message. Paid note on one-to-one Thanks or Comment Thanks; the Free Thanks note lands the mark with no NIM. Custom-message NIM goes to them, not Cinima. At most one successful User Send per Thanks. Cancel or fail after the mark has landed leaves Thanks in place.
_Avoid_: tip, gift, Reward, Send, profile gift, payment to Cinima, free-text memo

**Received list**:
The Me Guestbook of what this Handle received: Thanks (thanker Identicon, title, a line naming Thanks or Comment Thanks, User Send note, and NIM when present) and the Join grant (the line "Joined Cinima" and +10 NIM; no thanker Identicon, no title).
_Avoid_: Activity, notifications, inbox as a tab, Marquee, thanker Handle on the card, a peer Identicon on the Join grant row

**Return digest**:
The panel on return Presence when Thanks or NIM arrived since last Presence: up to eight thanker Identicons, then +{x} NIM received, then Continue into the app. Join grant NIM is not this NIM. Not Marquee. Skip during Favorites onboarding and the Guided tour. After Welcome, a pending Join overlay shows first.
_Avoid_: login modal, notification, Activity, Marquee, received cue, Join overlay

**Reward**:
A Send of 1 NIM attached to a Thanks or Comment Thanks, funded by Cinima. A thanker gets at most five Rewards per UTC day; further Thanks that day stay social-only. Thank all spends remaining Rewards in Favorited order, then Thanks the rest without NIM.
_Avoid_: tip, like, Ping, funded Thanks as a separate mark

**Ping**:
A Send of 0.0001 NIM whose job is the memo, not the amount. System or Creator. Never a Reward.
_Avoid_: notification, Door alarm, Marquee, Reward, Join grant

**Join grant**:
A one-time 10 NIM Send to a wallet for first signing into Cinima in Nimiq Pay. One per wallet, forever; funded by the Sender wallet. The Nimiq Pay memo is "Thanks for joining Cinima! - Creator". Distinct from Reward, Ping, and User Send.
_Avoid_: signup bonus, airdrop, Reward, tip, device grant, Welcome NIM

**Sender wallet**:
The Nimiq wallet Cinima uses to Send. Distinct from a user's wallet. The retired incoming treasury address is not this.
_Avoid_: treasury, hot wallet as a product term, user wallet

**Quiet**:
A Handle who has received three System Pings since last Presence. System Pings skip them until they return; Rewards and Creator Pings still go. Return (Presence) clears Quiet.
_Avoid_: unsubscribed, notifications off, blocked, banned

**System Ping**:
An automatic Ping after seven days without Presence, at most one per Handle per seven days, and only after the Guided tour is completed or skipped. Prefers the oldest Watchlist title ("Cinima.app - Have you watched: {title} yet?"); otherwise at least three new Handles since last Presence ("Cinima.app - {n} new users since last visit"). Skips the Creator.
_Avoid_: blast, campaign, Door alarm, Creator Ping

**Creator Ping**:
A Ping the Creator enqueues by choosing one or more Handles and a memo, Everyone for all Handles, or Ping me to themselves from Studio. Shown as "Cinima.app - {message}". Ping me uses "Cinima.app - Sender test". Not blocked by Quiet.
_Avoid_: admin send, blast, System Ping, notification

**Creator**:
The wallet that operates Cinima. The guided tour introduces this Handle; Studio is visible only to this wallet when signed in.
_Avoid_: admin, owner, superuser, operator as a product term

**Studio**:
The Creator-only screen of how people use Cinima: signups, Presence, searches, title views, shares, Share visits, follows, and Sends. The Creator enqueues a Creator Ping from here. Not part of the public product. Entry is at the bottom of Me.
_Avoid_: admin dashboard, analytics, backoffice, CMS, Door alarm

**Share visit**:
A human opening a Short Share, Public Profile, Title Share, or Watchlist Share. Distinct from a social crawler fetching a Share preview. Counted as web (cinima.app in a browser) or pay (inside Nimiq Pay). A Pay intent is a tap toward opening in Pay from that page (Already Installed, Get Nimiq Pay, or Explore CINIMA).
_Avoid_: page view of Landing, crawler hit, impression, click as a generic term

**Door alarm**:
Creator-only Telegram notices of live usage: sign-in, search, title view, Favorite, Recommend, Watchlist add and leave, Comment, Thanks, Comment Thanks, Thank all, Follow, Handle, Guided tour complete or skip, share created, Share visit, and a Send after it broadcasts (Reward, Ping, or Join grant). A pager, not a dashboard; Studio remains the pull read. Not part of the public product.
_Avoid_: webhook log, Slack alert, analytics ping, Studio notification

**Achievement**:
A named, once-earned credit for a Cinima action that teaches the product or rewards coming back. None are awarded until the Guided tour is completed or skipped, except Joined the crew, which is awarded with the Join grant and does not open that gate. When that gate opens, other actions already taken count. The catalog: Joined the crew (Join grant), Opening night (first Recommend), Full house (all movie and TV Recommend slots filled), Word of mouth (Title Share), What's next (Watchlist Share), Bravo (sent Thanks), Encore (received Thanks), High seas (ten unique title views), Season ticket (second distinct UTC day with Presence), That's a wrap (finished the Guided tour), In the listings (first Search), Save that for later (Watchlist add on a title opened from Search), That's the one (Recommend on a title opened from Search), Plus one (first Follow), On the cutting room floor (fifty unique Passes).
_Avoid_: badge as a separate product term, XP, streak freeze, daily quest, points economy, learning pathway as a separate product, wishlist

**Achievement count**:
How many Achievements a Handle has earned. The one-liner on Public Profile, Me, and other Handles' profiles.
_Avoid_: Achievement points as a separate score, XP, karma

**Credits**:
The Pay-only screen of the Achievement catalog for a Handle: earned rows with date, still-locked rows with the action that unlocks them. Public Profile shows Achievement count only; Credits are not on the unauthenticated share page. Other Handles' Credits are visible only inside Nimiq Pay.
_Avoid_: trophy case, badge wall, activity feed, heatmap, earned-only list

**Marquee**:
A gold bar that slides down from the Cinima brand header when the signed-in Handle earns an Achievement. Dark type on gold; quiet Achievement eyebrow, then the name and how they earned it. One at a time, queued, dismissible with X, auto-dismiss after a short wait. Tapping it dismisses the bar, clears any remaining queue, and opens that Handle's Credits. Can show at the same time as Recommend cue. Not shown on public web pages. Joined the crew is not Marquee'd in the session it is earned: a new wallet waits until the next login; a returning wallet sees Credits only.
_Avoid_: toast, modal, floating gold card, confetti blast, blocking dialog, slide-up above the tab bar, surface-colored Achievement bar, gold glow, white type on gold, Join overlay

**Join overlay**:
The one-time Pay-only screen for a wallet that already existed when its Join grant is given: "Thanks for joining Cinima", then small uppercase "Thanks for coming back!", then +10 NIM. Shown after Welcome, once. Not shown to a wallet created in that same session. Skip during Favorites onboarding and the Guided tour until those clear. Not Welcome, Return digest, or Marquee.
_Avoid_: splash, Welcome overlay, login modal, Return digest, Marquee

**Recommend cue**:
A solid bar that slides up above the tab bar after a new Recommend outside the Guided tour. Names the title and offers Share. Dismissing it does not share. Waits until Title flight has landed.
_Avoid_: auto-opening Title Share, modal, Marquee

**Title flight**:
The poster of a newly Watchlisted, Favorited, or Recommended Title flying to the tab that now holds it: Watchlist tab for a Watchlist add, Me for Favorite and Recommend. Recommend stages the gold hexagon and outer glow on the poster before that fly. Not a navigation. Skip during Favorites onboarding and the Guided tour.
_Avoid_: toast, confetti, Return digest, Recommend cue, Marquee, opening the destination tab

**Presence**:
Time a signed-in Handle spent with Cinima in the foreground, counted in Studio. Distinct from a wallet session token.
_Avoid_: session duration, screen time, DAU as a product term

**Landing**:
The public root page (`/` and `/gate`) that explains what Cinima is. Shows a scrolling strip of title-card posters loaded from the TMDB image CDN (curated `poster_path` list; not vendored in the repo), with TMDB attribution on the page. Outside Nimiq Pay the CTA is Explore (same Enter styling; opens a centered pay-only gate modal with Already Installed? (open) in a gold glow via HTTPS Pay intent (`https://nimpay.app/miniapps/open/…`), Get Nimiq Pay, and Inquiries; on a desktop, clicking Already Installed? shows a Full access only on mobile tooltip, then moves the gold glow to Get Nimiq Pay with a Learn about Nimiq Pay tooltip); inside Pay the CTA is Enter, which connects the wallet while staying on Landing, shows a Welcome / Welcome Back identicon overlay, then enters Discover (Favorites onboarding or For You). Landing never auto-boots auth. Contact is X (https://x.com/cinima_app) and Email (cinima.app@gmail.com). Pay-only gates and the Guided tour done card also offer Telegram (https://t.me/cinima_app). Public Profile shows a floating Explore CINIMA button (no bar chrome; `2.75rem + safe-area-inset-bottom` lift). Title Share and Watchlist Share show Explore CINIMA in the page content; Identicon and Handle still open Public Profile. A Short Share that opens a Title Share uses that Title Share layout. Outside Pay, title taps open a gate modal that matches Title Share layout (poster, year / media / rating, overview) plus Already Installed / Get Nimiq Pay, X + Telegram (https://t.me/cinima_app), and View on IMDb.
_Avoid_: marketing site, splash, home feed, auto sign-in on open, navigating into the app before wallet connect, vendoring studio posters in git
