# Door alarm emits from the public API write path, not Studio

Studio is a Creator-only pull dashboard on a separate process (ADR 0001). Door alarm is a pager: fire-and-forget Telegram after the public API records a sign-in, search, title view, share created, or Share visit. Putting it on Studio would add latency and a second writer. Telegram credentials live in env (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); when unset, Door alarm is a silent no-op so local and CI stay quiet. Sends never block the user request.
