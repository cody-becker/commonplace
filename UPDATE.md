# Commonplace Update 2 — Journal, Calendar, Daily Strip, Export, PWA

## What's new
- **JOURNAL tab** — one entry per day, autosaves, past days listed below ("The Record"). Tap any past day to reread or edit it.
- **CALENDAR tab** — month grid (dots mark days with events), tap a day to see/add events, time optional. Upcoming list below.
- **Today view** — quick links row at top (Gmail + D2L seeded, tap EDIT to change), daily RITUALS checklist that resets at midnight (starts empty — tap EDIT to name yours), and a COMING UP strip showing your next 3 events.
- **Export** — "EXPORT EVERYTHING" in the footer downloads your whole ledger as JSON. Run it a few times a year and keep the files.
- **PWA** — app icon, full-screen launch, works offline from your last visit.

## How to apply (5 minutes)
1. Unzip this over your project folder (the one containing package.json).
   It replaces `index.html` and `src/Commonplace.jsx`, and adds a `public/` folder.
2. Check it locally:
   ```
   npm run dev
   ```
3. Ship it:
   ```
   git add .
   git commit -m "journal, calendar, daily strip, export, PWA"
   git push
   ```
4. After Vercel deploys (~1 min): on your phone, delete the old home-screen
   shortcut and re-add it (Share -> Add to Home Screen). The new icon and
   full-screen behavior are baked in at install time.

## Notes
- No database changes needed — new modules use new keys in the same kv table.
- Your existing notes/tasks/goals are untouched.
- The service worker is network-first: you always get the newest version when
  online, and the last-seen version when offline.
