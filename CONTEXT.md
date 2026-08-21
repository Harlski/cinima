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

**X Handle**:
An optional public link to the user’s X profile. Not their Cinima Handle.
_Avoid_: twitter username as Cinima identity

**Favorite**:
A user’s mark that they enjoy a movie or show. Binary per user and title; the baseline taste signal.
_Avoid_: like, watchlist, save, bookmark

**Recommend**:
A gold-star upgrade on a Favorite, meaning this title stands out among the user’s favorites — not a separate mark from Favorite. A user may hold at most five movie Recommends and five TV Recommends at a time; a sixth of that media type is blocked until one of that type is removed. Unfavoriting clears Recommend. Shared Recommends are a stronger taste-overlap signal than shared Favorites alone.
_Avoid_: rating, review, super-like (unless used only as UI synonym), highlight, top 5 as a separate mark

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

**Unavailable**:
The public holding state when Cinima is not open for general use. It directs people to inquiries@cinima.app. Distinct from a missing Public Profile and from a transient API error.
_Avoid_: maintenance page, coming soon, 404, down
