# MedSNAP

> Scan a pill bottle. Understand what's inside. Catch dangerous interactions. Ask questions with your voice.

MedSNAP is a PWA that turns a household medicine cabinet into a verified, voice-accessible medication assistant — built for elderly users, caregivers, and families managing multiple prescriptions.

**Live:** https://medmate-hackabull.vercel.app

Built for **Hackabull 2026** — Tracks: Tech for Good · UX/UI · Healthcare · Gemini API · MongoDB · Gemma 4 · ElevenLabs

---

## What it does

- **Scan a bottle** — Point the camera at any prescription or OTC label. Gemini Vision extracts the drug name, dosage, warnings, and active ingredients. Every result is cross-checked against the FDA's official drug database and rewritten in plain language at a 6th-grade reading level.
- **Identify pills** — Pour pills into your palm, take a photo. Gemini reads the imprint code and we look it up in NLM's RxImage database to confirm identity — the same database pill identifier apps use. Dangerous combinations are flagged instantly.
- **Catch interactions** — Every scan is checked against everything else in the household cabinet. Warfarin + ibuprofen fires a red warning the moment you scan it.
- **Ask questions by voice** — ElevenLabs speaks the answers aloud. Household-specific questions (dose history, cabinet contents) are answered by Gemma 4. Medical knowledge questions go to Gemini 2.5.
- **Track doses** — Today's schedule lives on the home screen. Mark doses taken with one tap.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS, Nunito font |
| Camera | `getUserMedia` — works on iOS Safari + Android Chrome, no app required |
| Vision AI | Gemini 2.5 Flash — bottle extraction, pill identification, plain-language rewriting |
| Voice AI | Gemma 4 (`gemma-4-26b-a4b-it`) for household queries, ElevenLabs for speech output |
| Drug databases | OpenFDA (verification), DailyMed (structured labels), NLM RxImage (pill ID by imprint) |
| Storage | MongoDB Atlas — household graph, medication records, dose history, interaction cache |
| Hosting | Vercel (PWA, HTTPS, edge functions) |

---

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and GOOGLE_AI_API_KEY
npm run dev
```

Open http://localhost:3000. Camera and microphone require HTTPS or localhost.

### Environment variables

| Variable | Value |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB` | `medmate` |
| `GOOGLE_AI_API_KEY` | Gemini + Gemma API key (aistudio.google.com) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | Voice ID from your ElevenLabs account |

### Seed demo data

```bash
# Small demo: Dad (Lisinopril, Metformin) + Mom (Warfarin)
MONGODB_URI=... MONGODB_DB=medmate npx tsx scripts/seed-demo.ts

# Full demo: The Martinez Family — 4 members, 13 medications, 35 days of dose history
MONGODB_URI=... MONGODB_DB=medmate npx tsx scripts/seed-rich-demo.ts
```

---

## API routes

| Route | Purpose |
|---|---|
| `POST /api/scan/bottle` | Image → Gemini extraction → FDA verification → plain language |
| `POST /api/scan/pills` | Image → Gemini imprint reading → RxImage lookup → DailyMed info |
| `GET /api/medication?householdId=` | All active medications for a household |
| `POST /api/dose/log` | Mark a dose taken (finds scheduled dose in ±4h window) |
| `GET /api/voice/context?householdId=` | Today's dose schedule for Gemma context |
| `POST /api/gemma/answer` | Gemma 4 answers household-specific voice queries |
| `POST /api/voice/query` | Gemini answers medical knowledge questions |
| `POST /api/elevenlabs/speak` | Text → ElevenLabs audio (mp3) |
| `POST /api/interactions/check` | Check ingredient list against static interaction database |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 Home — member row, action grid, today's doses, recent meds
│   ├── cabinet/                 Medicine cabinet — pill bottle visualization, grouped by member
│   ├── scan/bottle/             Bottle scanner — member picker → camera → result
│   ├── scan/pills/              Pill identifier — camera → RxImage lookup → overlay
│   ├── medication/[id]/         Medication detail — plain language, warnings, log dose
│   ├── voice/                   Voice assistant — Gemma 4 / Gemini routing, ElevenLabs TTS
│   ├── onboarding/              First-run setup
│   └── api/                     All API routes
├── components/
│   ├── TodaysDoses.tsx          Home screen dose tracker with expand/collapse
│   ├── med-card.tsx             Medication list card
│   ├── member-avatar.tsx        Color-coded member avatar
│   └── ...                      Camera, voice, warning banner, app shell
├── lib/
│   ├── gemini.ts                Gemini API wrapper (vision + text)
│   ├── gemma.ts                 Gemma 4 routing logic
│   ├── openfda.ts               OpenFDA label + NDC lookup
│   ├── dailymed.ts              DailyMed structured label data
│   ├── rximage.ts               NLM RxImage pill identification by imprint
│   ├── interactions.ts          Static top-20 drug interaction list
│   ├── mongo.ts                 MongoDB client + typed collections
│   └── prompts.ts               All AI prompts in one place
└── data/
    └── interactions-top200.json Top drug interactions (static, no API needed)
```

---

## Tracks

**Tech for Good** — Medication errors kill ~7,000 Americans per year, mostly elderly people misreading labels. MedSNAP makes the label readable for anyone, in any language, without reading glasses or a pharmacy degree.

**UX/UI** — Designed specifically for users with reduced vision and motor control. 56px minimum touch targets, 18px minimum body text, AAA contrast, voice-first navigation, Nunito for readability. Every design decision serves the user, not the aesthetic.

**Healthcare** — Three independent drug databases: OpenFDA for label verification, DailyMed for structured drug information, NLM RxImage for pill identification by imprint code. The AI never gets the final word on dosage — the FDA does.

**Gemini API** — Multimodal pipeline: Gemini reads bottle labels and pill imprints from photos, rewrites drug information in plain language, and reasons about medical questions. Used for both vision and text generation.

**MongoDB** — Document store for the household medication graph: members, medications (with embedded active ingredients and warnings), scans, dose logs, and cached interactions. Atlas Vector Search enabled for semantic pill matching.

**Gemma 4** — `gemma-4-26b-a4b-it` handles household-specific voice queries (dose history, cabinet contents) via the Google AI API. Medical knowledge questions route to Gemini instead. The routing decision is explicit and shown to the user.

**ElevenLabs** — All voice output goes through ElevenLabs TTS. The voice page speaks every answer aloud automatically. Falls back to browser speech synthesis if ElevenLabs is unavailable.
