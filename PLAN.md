# MedSNAP — Hackabull Build Plan

> Household medication memory. Scan once, remember forever. Voice-first, privacy-first, verified against the FDA.

---

## 1. Project Summary

**One-liner:** A PWA that turns a household's medicine cabinet into a verified, voice-accessible knowledge graph — so elderly users, caregivers, and families can identify pills, catch dangerous interactions, and understand their meds in plain language.

**Tracks targeted:**
- Tech for Good (primary)
- The Design of Everyday Life (UX/UI)
- Healthcare
- Best Use of Gemini API
- Best Use of MongoDB
- Best Use of Gemma

**Target user (primary):** A 68-year-old managing 5+ prescriptions for herself and her husband. Has reading glasses, mild tremor, no patience for app stores.

**Target user (secondary):** Adult child remotely helping a parent manage meds.

---

## 2. Why This Wins

| Concern a judge will raise | Our answer |
|---|---|
| "Isn't this just a Gemini wrapper?" | No — we maintain a persistent household graph in MongoDB, run on-device Gemma for privacy-sensitive routine queries, and verify every dosage claim against OpenFDA. |
| "What if the AI hallucinates?" | OpenFDA cross-check on every dosage/warning. If Gemini's output disagrees with FDA, we surface FDA and flag the conflict. |
| "Who specifically does this help?" | Elderly users on polypharmacy regimens (avg 5+ meds) and their caregivers. ~7,000 US deaths/year from preventable medication errors. |
| "Why is this novel?" | Pill-in-hand verification + hybrid local/cloud inference + household graph. None of these alone are new; the combination is. |
| "Why a PWA, not native?" | Demo friction: judges scan a QR code and use it on their phone in 5 seconds. No sideloading, no TestFlight. |

---

## 3. Core Features (MVP)

### 3.1 Bottle Scan & Onboard
- Camera capture of a pill bottle.
- Gemini 2.0 Flash (vision) extracts: drug name, active ingredient(s), strength, dosage instructions, warnings, prescriber, Rx number, refill date.
- Cross-check against OpenFDA `/drug/label.json` — if mismatch, FDA wins.
- User assigns to a household member ("Mom", "Me", "Grandpa Joe").
- Stored in MongoDB.

### 3.2 Pill-in-Hand Identification (the demo moment)
- User pours pills into palm, takes photo.
- Gemini Vision identifies each pill by shape, color, imprint code.
- Cross-reference against the household's known meds.
- Output: labeled overlay — *"Left: Lisinopril 10mg (Dad, 8am dose). Right: Metformin 500mg (Dad, with meals)."*
- Flags anomalies: *"This third pill isn't in your cabinet. Want to add it?"*

### 3.3 Interaction & Conflict Engine
- On every new scan, check against every active med in the household graph.
- Use OpenFDA + a local interaction list (RxNorm/DrugBank-derived JSON we ship) for top 200 dangerous combos.
- Severity levels: Info / Caution / Danger.
- Example: *"You scanned ibuprofen. Dad takes warfarin. Combo increases bleeding risk — confirm with doctor."*

### 3.4 Voice-First Accessibility Mode
- Web Speech API for STT + TTS.
- Wake phrase: tap-to-talk button (large, high-contrast, bottom of screen).
- Sample queries:
  - "Did Mom take her morning pills?"
  - "What is this for?" (after a scan)
  - "Can I take this with food?"
- Routing:
  - **On-device (Gemma 3 via MediaPipe LLM Inference):** queries answerable from the local graph (adherence lookups, "what did I take", "when's the next dose").
  - **Cloud (Gemini):** queries needing reasoning over drug knowledge ("can I take X with Y", "what does this warning mean").

### 3.5 Plain-Language Translation
- Every drug fact is rewritten by Gemini at a 6th-grade reading level.
- Toggle: original label text ↔ plain language ↔ user's preferred language (Spanish, Mandarin, Vietnamese for the demo).

### 3.6 Adherence Tracking (lightweight)
- Each med has a schedule extracted from the label.
- "I took it" button → logs to MongoDB.
- Voice: "I just took my blood pressure pill" → matches and logs.
- Caregiver view: "Mom hasn't logged her 8pm dose."

---

## 4. Stretch Features (only if Saturday night is going well)

- **AR warning overlays** — point camera at bottle, see floating "no alcohol" / "no sun" / "no driving" icons. WebXR or a 2D overlay on the camera feed.
- **Pharmacist voice notes** — pharmacist scans bottle, records 30s of instructions, pinned to that med.
- **Refill prediction** — "You'll run out of Lisinopril on May 8. Want to call in the refill?"
- **Smart cabinet view** — visual grid of all meds, color-coded by who/when/risk.
- **Caregiver share link** — read-only access to a household member's regimen.

---

## 5. Tech Stack

### Frontend
- **Next.js 15** (App Router) — fast to scaffold, easy PWA setup.
- **TypeScript**.
- **Tailwind CSS** + **shadcn/ui** — accessible primitives, radix under the hood.
- **PWA:** `next-pwa` for service worker + manifest.
- **Camera:** `getUserMedia` + a thin React wrapper.
- **Voice:** Web Speech API (STT + TTS), with a fallback to OpenAI Whisper if a teammate has time.

### On-device inference
- **Gemma 3 1B (or 2B if perf allows)** via **MediaPipe LLM Inference for Web** (`@mediapipe/tasks-genai`).
- Loaded once, cached in IndexedDB. ~500MB-1.5GB download — show a one-time setup screen.
- Fallback: if device can't run Gemma, route those queries to Gemini cloud and note in the UI.

### Backend
- **Next.js API routes** (no separate server).
- **MongoDB Atlas** (free tier) — household, members, medications, scans, doses, interactions collections.
- **Atlas Vector Search** — semantic match for "the white oval one" against past scans.
- **Gemini API** (`@google/generative-ai`) — `gemini-2.0-flash` for vision + reasoning.
- **OpenFDA REST API** — `https://api.fda.gov/drug/label.json` and `/drug/ndc.json`.

### Auth (minimal)
- Magic link via Resend, or just a household code (6-digit) for the demo. Don't burn time on real auth.

### Hosting
- **Vercel** — instant deploy, custom domain in 5 minutes, Vercel KV for any rate-limit caches.
- **MongoDB Atlas** free cluster.

---

## 6. Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      PWA (Next.js, on phone)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │   Camera    │  │  Voice UI   │  │  Gemma 3 (MediaPipe) │  │
│  │  capture    │  │  STT / TTS  │  │  on-device inference │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                │                     │              │
│         └────────┬───────┴─────────────────────┘              │
│                  │                                            │
│         ┌────────▼─────────┐                                  │
│         │  Local cache     │  (IndexedDB: household graph,    │
│         │  + service worker│   Gemma weights, recent scans)   │
│         └────────┬─────────┘                                  │
└──────────────────┼────────────────────────────────────────────┘
                   │ HTTPS (Next.js API routes on Vercel)
                   │
        ┌──────────▼──────────────────────────────────────┐
        │              Server (Next.js API)               │
        │  /api/scan     /api/identify   /api/interact    │
        │  /api/voice    /api/dose       /api/household   │
        └──┬──────────────┬─────────────────────┬─────────┘
           │              │                     │
   ┌───────▼──────┐ ┌─────▼──────┐  ┌──────────▼─────────┐
   │ Gemini 2.0   │ │ OpenFDA    │  │  MongoDB Atlas     │
   │ Flash        │ │ REST API   │  │  + Vector Search   │
   │ (vision +    │ │ (label,    │  │  household graph   │
   │  reasoning)  │ │  ndc, RX)  │  │                    │
   └──────────────┘ └────────────┘  └────────────────────┘
```

### Request routing logic (the "smart" part)

```
User asks something via voice
        │
        ▼
Is the answer in the local household graph?
   (e.g. "did mom take her pill", "what's in the cabinet")
        │
   ┌────┴────┐
  YES        NO
   │         │
   ▼         ▼
Gemma 3   Does it need drug-knowledge reasoning?
on-device   (e.g. "can I mix these", "what's this warning")
            │
       ┌────┴────┐
      YES        NO → fallback to Gemma with retrieved context
       │
       ▼
   Gemini cloud + RAG over OpenFDA
```

---

## 7. MongoDB Schema

Database: `medmate`

### `households`
```js
{
  _id: ObjectId,
  code: "428193",                // 6-digit join code
  name: "The Garcia Family",
  createdAt: ISODate,
  members: [ObjectId],           // refs members
  preferredLanguage: "en",
  accessibility: {
    largeText: true,
    highContrast: false,
    voiceFirst: true,
    readingLevel: 6              // grade level for plain-language rewrite
  }
}
```

### `members`
```js
{
  _id: ObjectId,
  householdId: ObjectId,
  name: "Mom",
  age: 68,                       // optional, used for age-based warnings
  conditions: ["hypertension", "type 2 diabetes"],  // optional
  allergies: ["penicillin"],
  avatarColor: "#E11D48"         // for quick visual ID in the UI
}
```

### `medications`
```js
{
  _id: ObjectId,
  householdId: ObjectId,
  memberId: ObjectId,
  brandName: "Lisinopril",
  genericName: "lisinopril",
  activeIngredients: [
    { name: "lisinopril", strength: "10mg" }
  ],
  ndc: "00071-0222-23",          // National Drug Code, the canonical ID
  rxNumber: "4829301",
  prescriber: "Dr. Patel",
  pharmacy: "CVS #4421",
  dosage: {
    raw: "Take one tablet by mouth daily",
    parsed: { amount: 1, unit: "tablet", frequency: "daily", times: ["08:00"] }
  },
  warnings: [
    { code: "DROWSY", text: "May cause drowsiness", severity: "caution" },
    { code: "NO_ALCOHOL", text: "Do not consume alcohol", severity: "danger" }
  ],
  plainLanguage: {
    whatItDoes: "Lowers your blood pressure.",
    howToTake: "One pill every morning with water.",
    watchOutFor: "Dizziness when standing up too fast."
  },
  pillAppearance: {
    shape: "round",
    color: "white",
    imprint: "LUPIN 10",
    embedding: [0.123, -0.45, ...]   // for vector search "the white round one"
  },
  refillsRemaining: 3,
  nextRefillDate: ISODate,
  firstScannedAt: ISODate,
  active: true
}
```

### `scans`
```js
{
  _id: ObjectId,
  householdId: ObjectId,
  memberId: ObjectId,
  type: "bottle" | "pills_in_hand",
  imageUrl: "...",               // Vercel Blob or just base64 in Mongo for hackathon
  geminiRaw: { ... },            // raw Gemini response for debugging
  fdaVerified: true,
  fdaConflicts: [],
  resultMedicationIds: [ObjectId],
  createdAt: ISODate
}
```

### `doses`
```js
{
  _id: ObjectId,
  medicationId: ObjectId,
  memberId: ObjectId,
  scheduledAt: ISODate,
  takenAt: ISODate | null,
  source: "manual" | "voice" | "auto",
  notes: ""
}
```

### `interactions` (cached results)
```js
{
  _id: ObjectId,
  ingredientPair: ["warfarin", "ibuprofen"],   // sorted
  severity: "danger",
  summary: "Increased risk of bleeding.",
  plainLanguage: "Taking these together can make you bleed more easily, even from small cuts.",
  source: "openfda" | "rxnorm" | "gemini",
  cachedAt: ISODate
}
```

### Indexes
- `households.code` — unique
- `medications.householdId, memberId, active`
- `medications.pillAppearance.embedding` — Atlas Vector Search index (cosine, 768 dims)
- `doses.scheduledAt` — for "what's due now" queries
- `interactions.ingredientPair` — compound index

---

## 8. API Routes

All under `/api/`. JSON in/out. Auth via household code in header `x-household-code`.

| Route | Method | Purpose |
|---|---|---|
| `/api/household` | POST | Create household, returns code |
| `/api/household/join` | POST | Join by code |
| `/api/member` | POST | Add household member |
| `/api/scan/bottle` | POST | Image → extracted med → save |
| `/api/scan/pills` | POST | Image → identify pills against household graph |
| `/api/medication` | GET / PATCH / DELETE | CRUD on a med |
| `/api/medication/:id/plain-language` | GET | On-demand re-translate to a different reading level / language |
| `/api/interactions/check` | POST | Body: `[ingredient, ingredient, ...]` → conflicts |
| `/api/dose/log` | POST | Mark a dose as taken |
| `/api/dose/upcoming` | GET | What's due in next 24h for the household |
| `/api/voice/query` | POST | Voice transcript → routed answer (Gemma vs Gemini) |
| `/api/fda/label` | GET | Proxy to OpenFDA, cached in Mongo |

### Example: `POST /api/scan/bottle`

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "memberId": "65f...",
  "language": "en"
}
```

**Server flow:**
1. Send image to Gemini 2.0 Flash with extraction prompt (see §9).
2. Parse structured response. Validate with Zod.
3. Look up NDC in OpenFDA. If mismatch on dosage/warnings, FDA wins, flag a conflict.
4. Generate plain-language fields (Gemini, separate call).
5. Generate pill appearance embedding (Gemini text-embedding).
6. Insert into `medications` and `scans`.
7. Run interaction check against existing meds.
8. Return the new med + any interactions surfaced.

**Response:**
```json
{
  "medication": { ...full doc... },
  "fdaConflicts": [],
  "newInteractions": [
    {
      "with": "warfarin",
      "severity": "danger",
      "plainLanguage": "Taking these together can make you bleed more easily."
    }
  ]
}
```

---

## 9. Prompts

### 9.1 Bottle extraction prompt (Gemini 2.0 Flash, vision)
```
You are a pharmacist's assistant. Extract structured data from this prescription
or OTC medication label. Return ONLY valid JSON matching this schema:

{
  "brandName": string,
  "genericName": string | null,
  "activeIngredients": [{ "name": string, "strength": string }],
  "ndc": string | null,
  "rxNumber": string | null,
  "prescriber": string | null,
  "pharmacy": string | null,
  "dosageInstructions": string,
  "warnings": [string],
  "refillsRemaining": number | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- If you cannot read a field clearly, return null. DO NOT GUESS.
- For NDC, look for a hyphenated number like 12345-678-90.
- If confidence is "low", explain in a separate "concerns" field.
- Do not include any text outside the JSON object.
```

### 9.2 Pill identification prompt
```
Identify each distinct pill in this image. For each pill, return:

{
  "shape": "round" | "oval" | "capsule" | "oblong" | "other",
  "color": string,
  "secondaryColor": string | null,
  "imprint": string | null,
  "approximateSize": "small" | "medium" | "large",
  "scoreLine": boolean
}

Then, given this list of medications known to be in this household:
{HOUSEHOLD_MEDS_JSON}

For each pill, return the most likely match (or "unknown") with a confidence
score 0-1. If confidence < 0.6, mark as "unknown" and suggest the user scan the bottle.
```

### 9.3 Plain-language rewrite
```
Rewrite this medication information for someone reading at a {GRADE_LEVEL}-grade level.
Use short sentences. Avoid medical jargon. If you must use a medical term, define it
in parentheses. Output JSON:

{
  "whatItDoes": string,   // one sentence
  "howToTake": string,    // one sentence, action-oriented
  "watchOutFor": string   // one sentence, the most important warning
}

Source:
{ORIGINAL_LABEL_TEXT}
```

### 9.4 Voice query routing (runs on-device via Gemma 3)
```
You are a router. Given a user query about their medications, classify it:

LOCAL — answerable from the household's medication list and dose log.
CLOUD — needs general drug knowledge or reasoning about interactions.

Examples:
"Did mom take her morning pill?" → LOCAL
"Can I take ibuprofen with my blood pressure med?" → CLOUD
"What's in the cabinet for Dad?" → LOCAL
"What does 'take with food' actually mean?" → CLOUD

Query: {USER_QUERY}
Output: LOCAL or CLOUD only.
```

### 9.5 Local Gemma answer prompt
```
You are MedSNAP, a calm, clear voice assistant for a household's medications.
You have access to this data:

Members: {MEMBERS}
Medications: {MEDS}
Recent doses: {DOSES_LAST_24H}

Answer the user's question in 1-2 short sentences. If you don't have enough
information, say so plainly — never guess about doses or medications.

Question: {USER_QUERY}
```

---

## 10. UX Flow

### 10.1 First-run (60 seconds)
1. Splash → "MedSNAP. Your medicine cabinet, but smarter."
2. "Who is this for?" → Just me / My family / I'm a caregiver
3. Add first member (name, optional photo).
4. "Let's scan your first bottle." → camera permission → first scan.
5. Result screen: large text, plain language, "I take this" / "Someone else takes this".
6. Offer voice mode: "Want to use your voice? Tap the mic anytime."

### 10.2 Daily use
- **Home screen:** big "Scan" button, "What's due now" list, voice mic button.
- **Cabinet view:** grid of meds grouped by member, each card shows next dose, color-coded urgency.
- **Voice:** tap mic → speak → answer is read aloud + shown in large text.

### 10.3 The pill-in-hand flow (the demo flow)
1. From home, tap "Identify pills".
2. Camera opens with prompt: "Pour your pills into your palm and hold steady."
3. Auto-capture when stable (use device motion).
4. Loading: "Looking at your pills…" (1-2s)
5. Result: photo with overlays — colored circles around each pill, label below.
6. If a pill is unknown: "I don't recognize this one. Want to scan its bottle?"
7. If conflict: red banner — "⚠ Bleeding risk. Tap to learn more."

### 10.4 Accessibility defaults
- Minimum touch target 56x56px.
- Body text 18pt minimum, scales to 28pt with system setting.
- Color contrast ≥ 7:1 (WCAG AAA).
- Every interactive element has an aria-label.
- Voice mode is one tap away from every screen.
- All animation respects `prefers-reduced-motion`.
- Haptic confirmation on every successful action.

---

## 11. Design System

### Colors (high-contrast, AAA compliant)
- `--bg`: #0A0A0A (or #FFFFFF in light mode)
- `--fg`: #FAFAFA / #0A0A0A
- `--accent`: #14B8A6 (teal, calming, medical-adjacent)
- `--danger`: #DC2626
- `--caution`: #EAB308
- `--ok`: #22C55E
- Member colors: rotating palette of 6 high-contrast hues.

### Typography
- Headings: Inter Display, 600 weight.
- Body: Inter, 400 weight, 18pt min.
- Numbers (doses, times): tabular figures.

### Components (shadcn/ui base)
- `Card` (member, medication, dose-due)
- `BigButton` (the scan, the mic)
- `VoiceWave` (animated mic indicator)
- `PillBadge` (color, shape preview)
- `WarningBanner` (severity-colored)
- `MemberAvatar` (initial + color)

---

## 12. Demo Script (90 seconds)

**Setup:** 3 real bottles (or printed labels) on the table. Phone in airplane mode toggle ready.

**0:00 — Hook (10s)**
> "Every year, 7,000 Americans die from preventable medication errors. Most happen at home, with people who can't read the tiny print on their bottle. This is MedSNAP."

**0:10 — Scan (20s)**
- Scan bottle 1 (Lisinopril) → "This is your blood pressure medicine. One pill every morning." Plain language appears.
- Scan bottle 2 (Metformin) → assigns to Dad.
- Scan bottle 3 (a fake "Warfarin").

**0:30 — The pill-in-hand moment (20s)**
- Pour all three pills into palm.
- "Looking at your pills…"
- Overlays appear: each labeled with name + member + when to take.
- **Red banner appears:** "⚠ Warfarin + Ibuprofen risk detected — but you didn't pour ibuprofen. Skip it next time you reach for the Advil."

**0:50 — Voice + privacy (25s)**
- Toggle airplane mode ON in front of judges.
- Tap mic: "Did Dad take his morning Metformin?"
- Local response (Gemma): "Not yet. It's scheduled for 8am with breakfast."
- "This ran entirely on the phone. Your health data never left the device."

**1:15 — Verification (10s)**
- Tap an info icon: "Every dosage was cross-checked against the FDA's official drug database. We don't trust the AI alone."

**1:25 — Close (5s)**
> "MedSNAP. Built in 36 hours. Saves lives."

---

## 13. Build Timeline (36 hours, 4-person team)

Roles assumed: **F1** (frontend lead), **F2** (frontend / UX), **B** (backend / DB / FDA), **A** (AI / Gemini / Gemma).

### Hour 0-2: Setup & alignment
- All: agree on this plan, divide work.
- F1: scaffold Next.js, Tailwind, shadcn, deploy hello-world to Vercel.
- F2: set up Figma board, sketch the 5 main screens.
- B: Mongo Atlas cluster, schema migrations, base API routes returning mock data.
- A: get Gemini API key working, test bottle extraction on 3 sample images.

### Hour 2-8: Vertical slice — bottle scan
- F1: camera component, scan screen, result screen.
- F2: design system, accessibility primitives, member onboarding.
- B: `/api/scan/bottle`, `medications` collection, OpenFDA proxy + cache.
- A: lock in extraction prompt, plain-language prompt, JSON validation.

**Milestone (hour 8):** End-to-end: scan a real bottle, see plain-language result on phone.

### Hour 8-16: Pill-in-hand + interactions
- F1: pill-in-hand camera + overlay rendering.
- F2: cabinet view, member switcher, warning banners.
- B: `/api/scan/pills`, `/api/interactions/check`, ship the top-200 interaction JSON.
- A: pill identification prompt, embedding generation, vector index.

**Milestone (hour 16):** Pour 3 pills, see them labeled, see one interaction warning.

### Hour 16-22: Voice + Gemma
- F1: voice UI (mic button, wave, transcript display).
- F2: polish, accessibility audit, dark mode.
- B: `/api/voice/query` routing, dose log endpoints.
- A: Gemma 3 via MediaPipe — get it loading and answering one query.

**Milestone (hour 22):** Voice query "what's in the cabinet" works on-device.

### Hour 22-28: Polish & integration
- All: hunt bugs, fix the demo path specifically.
- F2: lead an accessibility pass — large text mode, contrast, screen reader.
- B: seed demo data, fast-path the demo bottles.
- A: rehearse the airplane-mode demo, make sure Gemma loads from cache.

### Hour 28-32: Demo prep
- Record a 60s backup video in case wifi dies.
- Print bottle labels if real ones are too risky.
- Write 1-paragraph project description for submission.
- Submit on Devpost / hackathon platform.

### Hour 32-36: Buffer + rehearsal
- Practice the demo 5+ times.
- Stretch features if time: AR overlays, refill prediction.
- Sleep is allowed.

---

## 14. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemma 3 won't load on judges' phones | Med | High | Pre-load on our demo phone; fall back to "cloud Gemma" via API for judges trying it. |
| Gemini misreads a bottle live on stage | Med | High | Pre-scan demo bottles, cache results. Have backup video. |
| OpenFDA API down or slow | Low | Med | Cache aggressively in Mongo; ship a static fallback for the demo bottles. |
| Vercel cold start eats demo time | Low | Med | Hit the API once before demo to warm it. |
| Camera permission fails on Safari | Med | High | Test on iOS Safari early. Have an Android phone as backup. |
| Demo wifi dies | Med | High | Phone hotspot ready. Backup video as last resort. |
| Pill identification is unreliable | High | Med | Pick demo pills with very distinct colors/shapes. Hardcode the demo case if needed (and be honest about it in the README). |
| Scope creep | High | High | This doc IS the scope. Anything not here goes in stretch or post-hackathon. |
| Submission deadline missed | Low | Catastrophic | Set a hard deadline of T-2h to start submission paperwork. |

---

## 15. What We Are NOT Building

To stay disciplined:
- ❌ Real authentication (household code is enough for the demo).
- ❌ Payment / subscription.
- ❌ Pharmacy integration (Surescripts, etc).
- ❌ Real-time multi-device sync (one phone per household for the demo).
- ❌ Apple Watch / Android Wear.
- ❌ Pill dispenser hardware.
- ❌ Insurance / cost lookup.
- ❌ Symptom tracking.
- ❌ Doctor messaging.

If a judge asks: "We scoped these for v2. The MVP is verification + accessibility + privacy."

---

## 16. Submission Checklist

- [ ] Devpost (or platform) project page filled in
- [ ] 60-second demo video uploaded (backup)
- [ ] GitHub repo public, README has setup instructions
- [ ] Live URL working on `medmate.vercel.app` (or similar)
- [ ] Demo phone charged + 2nd backup phone ready
- [ ] All 4 team members listed
- [ ] Tracks selected: Tech for Good, UX/UI, Healthcare, Gemini, MongoDB, Gemma
- [ ] Tech stack section mentions every sponsor tech we used
- [ ] Screenshots: home, scan, pill-in-hand, voice, cabinet view
- [ ] One-line elevator pitch memorized by every team member

---

## 17. Repo Layout

```
medmate/
├── PLAN.md                          # this file
├── README.md                        # setup, demo, credits
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── gemma/                       # cached model files (or load from CDN)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # home
│   │   ├── scan/
│   │   │   ├── bottle/page.tsx
│   │   │   └── pills/page.tsx
│   │   ├── cabinet/page.tsx
│   │   ├── member/[id]/page.tsx
│   │   ├── voice/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── api/
│   │       ├── scan/bottle/route.ts
│   │       ├── scan/pills/route.ts
│   │       ├── interactions/check/route.ts
│   │       ├── voice/query/route.ts
│   │       ├── medication/[id]/route.ts
│   │       ├── dose/log/route.ts
│   │       ├── household/route.ts
│   │       └── fda/label/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn primitives
│   │   ├── camera/CameraCapture.tsx
│   │   ├── voice/MicButton.tsx
│   │   ├── voice/VoiceWave.tsx
│   │   ├── medication/MedCard.tsx
│   │   ├── medication/PillOverlay.tsx
│   │   ├── interactions/WarningBanner.tsx
│   │   └── members/MemberAvatar.tsx
│   ├── lib/
│   │   ├── mongo.ts                 # client + collections
│   │   ├── gemini.ts                # API wrapper
│   │   ├── gemma.ts                 # MediaPipe wrapper
│   │   ├── openfda.ts               # client + cache
│   │   ├── interactions.ts          # local top-200 + lookup
│   │   ├── prompts.ts               # all prompts in one place
│   │   ├── speech.ts                # STT + TTS wrappers
│   │   ├── schema.ts                # Zod schemas matching Mongo
│   │   └── a11y.ts                  # accessibility helpers
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useVoice.ts
│   │   ├── useGemma.ts
│   │   └── useHousehold.ts
│   └── data/
│       ├── interactions-top200.json
│       └── demo-seed.json
├── scripts/
│   ├── seed-demo.ts
│   └── warm-cache.ts
└── .env.example
```

---

## 18. Environment Variables

```
# .env.local
MONGODB_URI=mongodb+srv://...
MONGODB_DB=medmate

GOOGLE_AI_API_KEY=...                 # Gemini
GEMINI_MODEL=gemini-2.0-flash

OPENFDA_API_KEY=...                   # optional, raises rate limit

GEMMA_MODEL_URL=https://...           # MediaPipe-compatible Gemma 3 weights
GEMMA_VARIANT=gemma-3-1b-it

NEXT_PUBLIC_APP_URL=https://medmate.vercel.app
```

---

## 19. Open Questions to Resolve in Hour 0

1. Do we have any team member with iOS Safari to test on? (PWA camera quirks)
2. Will we use Vercel Blob for scan images, or just store as base64 in Mongo? (base64 is simpler for hackathon)
3. Are we allowed to ship Gemma weights or do we link to a CDN? (check sponsor terms)
4. Who is the on-stage demoer? They drive UI choices that affect timing.
5. Real bottles or printed labels for the demo? Real is more impactful but lighting is a wildcard.

---

## 20. Done Means Done

The MVP is shippable when, in airplane mode for #4 only, a fresh judge can:

1. ✅ Open `medmate.vercel.app` on their phone.
2. ✅ Tap "scan", point at a real bottle, see plain-language results in <5s.
3. ✅ Pour 3 pills into palm, see them all labeled correctly.
4. ✅ Tap mic, ask "what's in the cabinet for Mom", hear a spoken answer (no network).
5. ✅ See a red banner for a real interaction risk we set up.
6. ✅ Tap an info icon and see "Verified against OpenFDA".

Everything else is bonus.

---

*Built for Hackabull. Last updated at the start of the build.*
