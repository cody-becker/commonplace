# Commonplace

A private life ledger — notes, tasks, and goals — that syncs across your phone and laptop.

Stack: React (Vite) + Supabase (Postgres + auth) + Vercel. All free tier.

Developed using Claude Fable 5 as a pair programmer, deployed and maintained independently

---

## Setup (~30 minutes, one time)

### 1. Create the Supabase project (your database)

1. Go to [supabase.com](https://supabase.com) → sign up (GitHub login is easiest) → **New project**
2. Name it `commonplace`, pick any region near you, set a database password (you won't need it day-to-day)
3. Once it finishes provisioning, open **SQL Editor** → **New query**
4. Paste the entire contents of `supabase.sql` from this repo and hit **Run**

That creates one table (`kv`) with row-level security, so only you can read your own rows — even with the public API key.

2. Get your API keys
In Supabase: Settings → API Keys → if there's no key yet, click Create new API keys
Copy the Publishable key (sb_publishable_...) — this goes in .env as VITE_SUPABASE_ANON_KEY (legacy variable name, new key works as a drop-in)
For the Project URL: click Connect at the top of the dashboard, or grab your project ref from the dashboard address bar — it's https://YOUR-REF.supabase.co
Don't copy anything labeled Secret key or service_role — those bypass your security and never belong in frontend code.

### 3. Run it locally (optional but recommended)

```bash
npm install
npm run dev
```

Open http://localhost:5173. Enter your email → Supabase sends a sign-in link → click it → you're in.

> If the magic link redirects somewhere weird: in Supabase go to
> **Authentication → URL Configuration** and add `http://localhost:5173`
> to the Redirect URLs.

### 4. Push to GitHub

```bash
git init
git add .
git commit -m "Commonplace v1"
```

Create an empty repo on github.com (private is fine), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/commonplace.git
git push -u origin main
```

Note: `.env` is gitignored on purpose — your keys never go in the repo.

### 5. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New Project** → import the `commonplace` repo
2. Vercel auto-detects Vite. Before deploying, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. Deploy. You'll get a URL like `commonplace-xyz.vercel.app`

### 6. Point auth at your live URL

In Supabase: **Authentication → URL Configuration** → set **Site URL** to your Vercel URL (and add it to Redirect URLs). Otherwise magic links will point at localhost.

### 7. Install it on your devices

- **Phone:** open the Vercel URL in Safari/Chrome → Share → **Add to Home Screen**. Opens full-screen like a native app.
- **Laptop:** bookmark it, or in Chrome: ⋮ → Cast, Save and Share → Install as app.

Sign in with the same email everywhere and everything syncs.

---

## How data is stored

One Postgres table, `kv`, holding JSON blobs per user:

| user_id (uuid) | key        | value (jsonb)      |
|----------------|------------|--------------------|
| you            | `cp:notes` | array of notes     |
| you            | `cp:tasks` | array of tasks     |
| you            | `cp:goals` | array of goals     |

Row-level security means the anon key in the frontend is safe to expose — Postgres itself refuses to serve rows that aren't yours.

**Future exercise for a data person:** normalize this into proper `notes`, `tasks`, and `goals` tables with real columns, then query your own life with SQL. The KV design makes v1 simple; the migration makes a good weekend project.

## Day-to-day

- `npm run dev` — local development
- `git push` — Vercel redeploys automatically on every push

## Troubleshooting

- **"Missing Supabase config" on load** → your `.env` (local) or Vercel env vars (prod) aren't set
- **Magic link email never arrives** → check spam; Supabase free tier limits auth emails to ~3–4/hour
- **Link opens but you're not signed in** → Site URL / Redirect URLs in Supabase don't match where you opened it
