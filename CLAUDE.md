# Keeping context across long sessions

This project is built across long, multi-session conversations, and
context summarization can silently drop something the user raised —
that's already happened once (a reference to "Flocus" got trimmed before
it was written down anywhere). To prevent that happening again:

- **[WORKING-NOTES.md](WORKING-NOTES.md)** is a running scratch log for
  anything currently in-flight: a thread the user raised that hasn't been
  resolved yet, or a decision agreed in principle but not yet written
  into DESIGN.md. Write to it *during* a conversation, not after —
  waiting until a natural stopping point risks losing the detail to
  compaction first.
- **[DESIGN.md](DESIGN.md)** is the settled, considered design record —
  once something in WORKING-NOTES.md is actually decided and written up
  properly there, remove it from WORKING-NOTES.md. Don't let the two
  drift into duplicates of each other.
- DESIGN.md also links a companion visual reference (a "How It Works"
  mindmap artifact) — the two are meant to be kept in sync; update both
  when either changes.

For the Next.js app itself, see `app/CLAUDE.md` and `app/AGENTS.md`.
