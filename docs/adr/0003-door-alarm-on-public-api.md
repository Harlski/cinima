# Door alarm emits from the public API write path, not Studio

Studio is a Creator-only pull dashboard on a separate process (ADR 0001). Door alarm is a pager: fire-and-forget Telegram after the public API records live usage (sign-in, search, title view, Favorite, Recommend, Watchlist add and leave, Comment, Thanks, Follow, Handle, Guided tour, share created, Share visit). Putting it on Studio would add latency and a second writer. Telegram credentials live in env (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); when unset, Door alarm is a silent no-op so local and CI stay quiet. Sends never block the user request.

A Send rings from the Sender process after it broadcasts, not when Studio queues it: that is when NIM actually left.
