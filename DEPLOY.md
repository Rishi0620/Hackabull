# MedSNAP — Deployment Guide

## Live URL

**https://medmate-hackabull.vercel.app**

Open this on your phone. Add to home screen for the full PWA experience:
- **iOS Safari:** Share → Add to Home Screen
- **Android Chrome:** three-dot menu → Add to Home Screen

---

## Re-deploying after changes

This is all you need every time. Run from the project folder:

```bash
vercel --prod --yes
```

That's it. Vercel builds, deploys, and keeps the same URL.

**Estimated time:** ~60 seconds from run to live.

---

## First-time setup (already done — for reference)

These steps were completed once and don't need to be repeated:

```bash
# 1. Install Vercel CLI (already installed)
npm i -g vercel

# 2. Login (already done as rishi0620)
vercel login

# 3. Initial deploy (links the project)
vercel --yes

# 4. Add env vars (already set in Vercel dashboard)
vercel env add MONGODB_URI production
vercel env add MONGODB_DB production
vercel env add GOOGLE_AI_API_KEY production
vercel env add GEMINI_MODEL production
vercel env add ELEVENLABS_API_KEY production
vercel env add ELEVENLABS_VOICE_ID production

# 5. Deploy to production
vercel --prod --yes

# 6. Set clean URL alias
vercel alias set <deployment-url> medmate-hackabull.vercel.app
```

---

## If you change an env var

```bash
# Remove old value
vercel env rm VARIABLE_NAME production

# Add new value
vercel env add VARIABLE_NAME production
# (paste the new value when prompted)

# Redeploy for it to take effect
vercel --prod --yes
```

---

## Env vars currently set

| Variable | What it's for |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | Database name (`medmate`) |
| `GOOGLE_AI_API_KEY` | Gemini 2.5 Flash + Gemma 4 API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key |
| `ELEVENLABS_VOICE_ID` | `6xPz2opT0y5qtoRh1U1Y` (Christian voice) |

These are set in the Vercel dashboard and are NOT in your code or git repo.

---

## View logs / debug a production error

```bash
# See recent deployments
vercel ls

# Stream live logs from production
vercel logs medmate-hackabull.vercel.app --follow

# Or open the dashboard
vercel inspect medmate-hackabull.vercel.app
```

---

## Load the demo household on your phone

After opening the app on your phone for the first time, you'll go through onboarding. To skip to the pre-seeded Martinez Family demo instead:

1. Open the app in Safari/Chrome on your phone
2. Open the browser's developer console (or use the URL bar trick below)
3. Paste this into the address bar and hit enter:

```
javascript:localStorage.setItem('medmate.household',JSON.stringify({householdId:'69ed1ada1ac724d6f11ce0fb',code:'999999',name:'The Martinez Family',activeMemberId:'69ed1ada1ac724d6f11ce0fc'}));location.reload();
```

This loads the 4-member family with 13 medications and 35 days of dose history.

---

## Vercel project dashboard

[vercel.com/rishabh-bhargavs-projects/medmate-hackabull](https://vercel.com/rishabh-bhargavs-projects/medmate-hackabull)

---

## Common issues

**Build fails with "Command npm install exited with 1"**
The `.npmrc` file at the root sets `legacy-peer-deps=true` which should prevent this. If it happens again: `vercel env ls` to confirm all vars are set.

**App loads but API calls fail (500 errors)**
Usually means env vars aren't set. Check: `vercel env ls` — all 6 vars should appear under `production`.

**Camera/mic doesn't work**
HTTPS is required for camera and microphone. The Vercel URL is always HTTPS so this should never be an issue on the deployed version. On `localhost`, camera works because browsers whitelist localhost.

**Changes aren't showing after deploy**
Hard refresh on the phone: hold the reload button in Safari → Reload Without Content Blockers, or close and reopen the app if installed as PWA.
