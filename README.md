# The Long-Distance Photobooth

Next.js app. Room state (host + partner sync) is stored in **Vercel KV**
instead of the browser's `window.storage` (which only works inside Claude's
own artifact preview).

## Deploy to Vercel — step by step

### 1. Push this folder to GitHub
```bash
cd photobooth-app
git init
git add .
git commit -m "initial commit"
gh repo create photobooth-app --public --source=. --push
```
(No GitHub CLI? Just create an empty repo on github.com, then `git remote add origin <url>` and `git push -u origin main`.)

### 2. Import into Vercel
- Go to https://vercel.com/new
- Import the GitHub repo you just pushed
- Framework preset: **Next.js** (auto-detected) — click **Deploy**
- First deploy will fail or the app will error on room create/join — that's expected, KV isn't attached yet.

### 3. Add a Redis database (Upstash, free tier is enough)
Vercel KV itself is retired — storage now comes from the Marketplace.
- In your Vercel project → **Storage** tab → **Create Database**
- Under Marketplace Database Providers, choose **Redis** (Upstash) → **Create**
- Pick the free plan and a region close to you → **Continue** → **Create**
- Once it's ready, click **Connect Project** and select this project (all environments)
- This auto-adds env vars like `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — the app's code (`Redis.fromEnv()`) reads either naming automatically)

### 4. Redeploy
- Go to **Deployments** tab → click **...** on the latest deployment → **Redeploy**
- (Needed so the new env vars get picked up)

### 5. Test it
- Open the deployed URL on your phone → "Start a room" → note the code
- Open the same URL on another device/browser → "Join a room" → enter the code
- Both cameras should show "connected", then "Start the photobooth" works

## Local development
```bash
npm install
npm run dev
```
For local dev with real KV, pull env vars with `vercel env pull .env.local`
(requires `vercel login` + `vercel link` first).

## Notes
- Rooms auto-expire after 6 hours (see `app/api/room/route.js`) so old sessions don't pile up in KV.
- Camera access requires HTTPS — Vercel gives you this by default, so it'll work fine once deployed.
