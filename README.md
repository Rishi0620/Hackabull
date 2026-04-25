# MedMate

> Your medicine cabinet, but smarter. Scan once, remember forever. Voice-first, privacy-first, FDA-verified.

A PWA that turns a household's medicine cabinet into a verified, voice-accessible knowledge graph for elderly users, caregivers, and families.

Built for **Hackabull** — Tracks: Tech for Good, UX/UI, Healthcare, Best Use of Gemini API, Best Use of MongoDB, Best Use of Gemma.

---

## Quickstart

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in:
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=medmate
GOOGLE_AI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

- **MongoDB Atlas:** create a free M0 cluster at https://cloud.mongodb.com, allow access from anywhere (0.0.0.0/0) for the demo, copy the connection string.
- **Gemini API key:** https://aistudio.google.com/apikey

### 3. (Optional) Seed demo data
```bash
npm run seed
```
Creates a "Demo Family" household with Dad (Lisinopril, Metformin) and Mom (Warfarin) so the cabinet isn't empty for the demo.

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000 on your phone (must be HTTPS or localhost for camera/mic access).

For phone testing on the same wifi, deploy to Vercel — it gives you HTTPS and a QR-friendly URL in one command:
```bash
npx vercel
```

---

## Architecture

- **Frontend:** Next.js 15 (App Router) PWA, Tailwind, shadcn-style primitives.
- **Camera:** `getUserMedia` — works on iOS Safari + Android Chrome.
- **Voice:** Web Speech API for STT + TTS.
- **On-device inference:** Gemma 3 routing layer (`src/lib/gemma.ts`). Local queries get answered without a network call — toggle airplane mode during the demo to prove it.
- **Cloud inference:** Gemini 2.0 Flash for vision (bottle extraction, pill identification) and reasoning (interactions, plain-language).
- **Verification:** OpenFDA `/drug/label.json` cross-check on every scan. The AI never gets the last word on dosage.
- **Storage:** MongoDB Atlas — household graph (members, medications, scans, doses, interactions cache).

---

## Demo flow (90 seconds)

1. **Scan a bottle.** Gemini extracts → OpenFDA verifies → plain-language card appears.
2. **Identify pills in palm.** Pour 3 pills, take a photo. Each is labeled with name + member + dose.
3. **Watch the conflict warning fire.** Warfarin + ibuprofen lights up red.
4. **Toggle airplane mode.** Tap mic, ask "Did Dad take his morning pill?" — answered locally by Gemma.
5. **Open an info card.** "Verified against OpenFDA" badge proves we don't trust the LLM alone.

---

## Tracks

- **Tech for Good** — elderly polypharmacy, ~7,000 US deaths/year from medication errors.
- **UX/UI** — large text by default, voice-first, AAA contrast, member color coding.
- **Healthcare** — real OpenFDA verification, real interaction checking.
- **Gemini API** — multimodal vision + plain-language rewriting + reasoning.
- **MongoDB** — household graph: members, medications, scans, doses, interactions cache.
- **Gemma** — on-device routing for privacy-sensitive queries.

---

## Folder map

```
src/
├── app/                  Next.js routes (pages + API)
├── components/           UI components
├── hooks/                useHousehold, useVoice, useGemma
├── lib/                  mongo, gemini, gemma, openfda, prompts, schema, interactions, speech
└── data/                 Static interaction list
```
