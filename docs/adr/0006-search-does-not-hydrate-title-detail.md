# Search does not hydrate title detail

Search is a title-card lookup. It may use TMDB search lists and the local catalog, but it must not wait on per-title TMDB hydration (especially TV seasons and episodes) before answering. Title detail remains the place that Catalog data is filled in. If TMDB does not answer in time, Search returns local matches; a wait that hits the client deadline is Retry, not "No results found". A new query cancels the previous fetch so "Apple" cannot overwrite "Apples".
