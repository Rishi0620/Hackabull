# MedMate — v0.dev UI Prompt

Paste everything below the line into v0.dev as a single prompt.

---

Build a complete Next.js 15 App Router PWA called **MedMate** — a household medication management app designed primarily for elderly users and their caregivers. This is a real production app, not a demo. Every design decision should serve accessibility and clarity over aesthetics.

## Design philosophy — read this before generating anything

**NOT generic AI slop.** Do not use:
- Gradient hero sections
- Floating cards with drop shadows everywhere
- "Dashboard" grid layouts with bar charts
- Purple/blue AI gradients
- Generic "Get started" CTAs with rockets or sparkles
- Light mode with white backgrounds and gray text

**This app is used by someone who:**
- May have cataracts or wear reading glasses
- Has slightly shaky hands
- Uses their phone one-handed while holding a pill bottle in the other
- Is often in poor lighting (medicine cabinet, bathroom at night)

**Design rules:**
- Dark background `#0A0A0A`, cards `#18181B`, borders `#27272A`
- Primary accent: teal `#14B8A6`
- Danger: `#DC2626` / Caution: `#EAB308` / OK: `#22C55E`
- Minimum body text: 18px. Headings: 28-36px bold
- Minimum touch target: 56x56px
- All interactive elements need visible focus rings
- Member colors: each person gets a distinct color (red, teal, purple, amber, blue, pink)
- Zero decorative illustrations or icons used as art — icons only next to text for clarity
- Bottom nav bar always visible, 4 tabs: Home, Cabinet, Scan, Voice
- No sidebars. No hamburger menus. Mobile-only layout, max-width 430px centered

---

## Color tokens (use these exactly as CSS variables)

```css
--bg: #0A0A0A
--fg: #FAFAFA
--muted: #94A3B8
--card: #18181B
--border: #27272A
--accent: #14B8A6
--danger: #DC2626
--caution: #EAB308
--ok: #22C55E
```

---

## Tech stack

- Next.js 15 App Router, TypeScript, Tailwind CSS
- shadcn/ui for base primitives (use radix under the hood)
- lucide-react for icons
- No framer-motion (keep bundle small)
- `getUserMedia` for camera
- Web Speech API for STT
- All pages are `'use client'` where needed

---

## API endpoints (backend already exists — integrate these exactly)

### Household
- `POST /api/household` — `{ name, firstMemberName }` → `{ householdId, code, name, activeMemberId }`
- `GET /api/household?id=` → `{ household, members[] }`
- `POST /api/member` — `{ householdId, name, age?, index }` → `{ memberId }`

### Medications
- `GET /api/medication?householdId=` → `{ medications[] }` each has `{ _id, brandName, genericName, dosage: { raw }, warnings[], plainLanguage: { whatItDoes, howToTake, watchOutFor }, fdaVerified, member: { name, avatarColor }, memberId }`
- `GET /api/medication/:id` → `{ medication, member }`
- `DELETE /api/medication/:id`

### Scanning
- `POST /api/scan/bottle` — `{ image (base64), householdId, memberId }` → `{ medicationId, extracted, plainLanguage, fdaVerified, fdaWarnings[], interactions[] }`
- `POST /api/scan/pills` — `{ image (base64), householdId }` → `{ pills[], interactions[] }`

### Voice / Gemma 4
- `GET /api/voice/context?householdId=` → `{ members[], medications[], recentDoses[] }`
- `POST /api/gemma/answer` — `{ query, context }` → `{ answer, model }`
- `POST /api/voice/query` — `{ query, householdId }` → `{ answer, source }`
- `GET /api/gemma/ping` → `{ ok, model }`

### Doses & ElevenLabs
- `POST /api/dose/log` — `{ medicationId, source }` → `{ doseId }`
- `GET /api/dose/upcoming?householdId=`
- `POST /api/elevenlabs/speak` — `{ text }` → audio/mpeg binary stream

### Interactions
- `POST /api/interactions/check` — `{ ingredients[] }` → `{ interactions[] }`

### localStorage key: `medmate.household`
```ts
{ householdId: string, code: string, name: string, activeMemberId?: string }
```

---

## Pages to build

### 1. `/onboarding` — First run (3 steps)

**Step 1: Welcome**
- Full screen dark background
- Large pill bottle icon (lucide `Pill`) in a teal rounded square
- H1: "MedMate" — large, bold
- Subtitle: "Your medicine cabinet, but smarter."
- 4 bullet points with teal checkmarks (no icons, just `✓`):
  - "Scan a bottle, get plain-language instructions"
  - "Catch dangerous drug interactions automatically"
  - "Identify pills by photo"
  - "Voice answers — no typing needed"
- Large "Get started" button, full width, teal background

**Step 2: Name your household**
- "What should I call your home?" — large heading
- Subtext: "Could be your family name, or just 'My place.'"
- Large input field (18px text, 56px height, rounded-2xl)
- "Continue" button disabled until input has text

**Step 3: Add yourself**
- "Who's the first member?" heading
- Subtext: "You can add more family members later."
- Large name input
- Large "Finish setup" button
- On submit: `POST /api/household`, save to localStorage, redirect to `/`

---

### 2. `/` — Home

**Header:**
- Small muted text: household name
- Large bold: "Welcome back." or "Good morning." based on time of day

**Member row** (horizontal scroll, no scrollbar visible):
- Each member is a large circle avatar (initials, member color background)
- Name label below
- Tap → navigate to `/cabinet?member=ID`
- Last item: `+` circle with dashed border → `/onboarding/member`

**Action grid (2×2):**
- **Scan a bottle** — teal background, `Camera` icon, "Add a new medication" subtitle. Navigates to `/scan/bottle`
- **Identify pills** — dark card, `ScanLine` icon, "From your hand" subtitle. Navigates to `/scan/pills`
- **Ask a question** — dark card, `Mic` icon, "Voice or text" subtitle. Navigates to `/voice`
- **My cabinet** — dark card, `Pill` icon, "[N] medications" subtitle. Navigates to `/cabinet`

**Recent medications** (fetched from `GET /api/medication?householdId=`):
- Section header: "Recent" + "See all" link right-aligned
- Max 3 MedCards (see component below)
- Empty state: centered card with "Scan your first bottle" CTA

---

### 3. `/scan/bottle` — Bottle scanner (4 steps internally)

**Step 1: Member picker** (shown only if household has >1 member)
- "Who is this for?" — large heading
- 2-column grid of member cards: large avatar + name
- Selected member gets teal ring border
- "Start scanning" button at bottom

**Step 2: Camera** 
- Full screen camera view using `getUserMedia({ video: { facingMode: 'environment' } })`
- Top overlay: semi-transparent dark bar with instruction text (passed as prop)
- Bottom: large circular shutter button (white circle, 80px), back arrow left, nothing right
- No camera UI chrome — pure viewfinder feel

**Step 3: Loading**
- Centered spinner (teal border, top transparent, spinning)
- "Reading the label…" — large text
- "Verifying against the FDA database." — muted subtitle

**Step 4: Result**
- "Scan result" heading + "Done" ghost button top right
- **Drug name card**: large drug name (36px bold), generic name muted below, member avatar + "For [Name]", FDA verified badge (green shield), confidence badge
- Read aloud button (speaker icon) — calls `POST /api/elevenlabs/speak` with the three plain-language fields, plays returned audio/mpeg
- Three info cards stacked:
  - "WHAT IT DOES" (muted uppercase label) + large plain text
  - "HOW TO TAKE IT" + large plain text
  - "WATCH OUT FOR" + large plain text
- If interactions: red/yellow WarningBanner for each
- If FDA warnings: dark card with "FDA WARNINGS" label + list
- Bottom: "View details" (teal) + "Scan another" (secondary) buttons side by side

---

### 4. `/scan/pills` — Pill identifier

**Camera step:** Full screen, prompt "Pour pills into your palm and hold steady"

**Loading:** Spinner + "Looking at your pills…"

**Result:**
- Photo shown at top (rounded-2xl, full width)
- For each pill identified — a card with:
  - Colored circle (pill's actual color) on left
  - If matched to cabinet: drug name bold, "In cabinet" green badge, member name muted, dosage note
  - If FDA-identified but not in cabinet: drug name bold, "FDA identified" teal badge, "Not in your cabinet" muted, what it does in small text, warning if any in amber
  - If totally unknown: "Unidentified pill" with `HelpCircle` icon, physical description (color + shape + imprint), "Scan the bottle for details"
  - Confidence % badge right-aligned
- If interactions between pills: WarningBanner at top before the list

---

### 5. `/cabinet` — Medicine cabinet

**Header:** "Cabinet" + "[N] medications" muted

**Member filter row** (horizontal scroll):
- "All / Everyone" chip first (selected state: teal bg)
- Then each member as a chip with their avatar circle
- Tap filters the list below

**Medication list grouped by member:**
- Section header: member name (if All selected, show all groups)
- MedCards stacked below each header

**Empty state:** centered card "No medications yet. Tap Scan to add one."

---

### 6. `/medication/[id]` — Medication detail

- Back arrow top left
- Drug name (large, bold) + generic name muted
- Read aloud button (speaker, top right) — calls ElevenLabs
- Member avatar badge + FDA verified badge
- **Dosage card:** full-width, "DOSAGE" label, dosage instructions large
- **What it does card**
- **How to take it card**  
- **Watch out for card**
- **Active ingredients card** (if any): list of name + strength
- **Warnings card** (if any): bulleted list
- **Prescription info card** (if Rx#, prescriber, pharmacy)
- Bottom fixed bar:
  - Large "I just took this" button (teal) — calls `POST /api/dose/log`
  - After tap: button turns green, shows checkmark, "Logged ✓", haptic if available
  - Small trash icon button (danger color) — DELETE with confirm

---

### 7. `/voice` — Ask MedMate

**Header:**
- "Ask MedMate" large bold
- Muted subtitle: "Voice or tap a question."
- Badge row: "Gemma 4: [status]" (green if ready), "ElevenLabs voice" (teal with speaker icon), "Privacy-first" (shield icon)

**Main content area (flex-1, scrollable):**
- When idle: suggestion chips — 4 preset questions, each a full-width button with border
- When transcript appears: "YOU ASKED" muted label + user's words in a dark card
- When thinking: spinner card + model badge (green "Gemma 4" for local, teal "Gemini 2.5" for cloud)
- When speaking: animated speaker icon + "Speaking…" muted text
- When answer ready: answer card with:
  - "ANSWER" muted uppercase label
  - Answer text (large, 20px)
  - Model badge (Gemma 4 or Gemini 2.5)
  - If Gemma 4: small muted note "✓ Answered using Gemma 4 — your health data stayed on this network."

**Voice routing logic (client-side):**
```ts
// Local keywords → Gemma 4 via POST /api/gemma/answer (pass context from GET /api/voice/context)
// Cloud keywords → Gemini via POST /api/voice/query
const cloudKeywords = ['can i take','safe to','side effect','interact','pregnan','with food','with alcohol','allergy','overdose','symptom','what does','what is this']
```

**Bottom fixed:**
- Animated wave bars (5 bars, pulse animation, only visible while listening)
- Large mic button (96px circle):
  - Idle: teal background, white mic icon
  - Listening: red background, red ping animation, white mic-off icon
- "Listening…" / "Tap and ask anything" label

**Speech flow:**
1. Tap mic → `navigator.mediaDevices` / Web Speech API starts
2. Transcript appears in real time
3. On final transcript: run routing logic, call appropriate API
4. On answer: call `POST /api/elevenlabs/speak`, play returned audio blob as `new Audio(url)`
5. Fallback to browser TTS if ElevenLabs fails

---

### 8. `/onboarding/member` — Add member

- "Add a household member" heading
- Name input + Age input (optional)
- "Their meds will be kept separate from yours." muted text
- "Add member" button → `POST /api/member` → redirect home

---

## Shared components

### `MedCard`
- Rounded-2xl card, full width, tap → navigate to `/medication/:id`
- Left: colored square (member color with 15% opacity) containing `Pill` icon in member color
- Right: drug name (large bold), generic name (muted, small), dosage (muted), badge row: "For [member]" teal, "FDA verified" green if true, "Warning" red if any danger severity
- Chevron right icon far right

### `WarningBanner`
- Full width, rounded-2xl, 2px border
- Danger: red border, red bg at 10%, `AlertTriangle` red icon
- Caution: yellow border, yellow bg at 10%, `AlertCircle` yellow icon
- Info: teal border, teal bg at 10%, `Info` teal icon
- Icon + title (bold) + message text + optional action slot

### `MemberAvatar`
- Sizes: sm (32px), md (48px), lg (80px)
- Circle with member color background, white bold initial letter
- aria-label with name

### `MicButton`
- 96px circle
- Idle: teal bg, white `Mic` icon
- Listening: red bg, `MicOff` icon, outer ring pulse animation, inner ping animation
- active:scale-95 transition

### `AppShell`
- Wraps all main pages
- `<main>` with bottom padding for nav
- Fixed bottom nav with 4 tabs: Home (house), Cabinet (pill), Scan (camera), Voice (mic)
- Active tab: teal color, inactive: muted
- Nav background: `#0A0A0A` at 95% opacity with backdrop-blur

### `CameraCapture`
- Full screen fixed overlay, z-50, black background
- Video element fills screen, object-cover
- Top: prompt text in semi-transparent dark bar
- Bottom: cancel X left, shutter button center (white circle 80px with camera icon), empty div right
- On capture: canvas draws frame, shows preview image
- Preview state: "Use this photo" (large teal) + "Retake" (secondary) buttons

---

## State management

Use localStorage for household state:
```ts
const STORAGE_KEY = 'medmate.household'
// { householdId, code, name, activeMemberId }
```

Use a custom hook `useHousehold()` that:
- Reads from localStorage on mount
- Exposes `{ household, save, loaded }`
- All pages check `if (!loaded) return null` and `if (loaded && !household) router.replace('/onboarding')`

---

## Accessibility requirements

- All interactive elements: `aria-label`
- `prefers-reduced-motion`: all animations off
- Color contrast: minimum 7:1 (WCAG AAA)
- `<html lang="en">`
- Focus rings: `focus-visible:ring-4 focus-visible:ring-accent/50`
- `viewport` meta: `maximum-scale=1` (prevents iOS zoom on input focus)
- Haptic on dose log: `navigator.vibrate([40, 60, 40])`

---

## PWA manifest (`public/manifest.json`)

```json
{
  "name": "MedMate",
  "short_name": "MedMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#14B8A6",
  "orientation": "portrait"
}
```

## `app/layout.tsx` viewport:
```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#14B8A6',
}
```

---

## What NOT to generate

- No light mode toggle
- No authentication pages (we use household code in localStorage)
- No settings page
- No onboarding carousel with swipe
- No loading skeletons with shimmer (use simple spinners)
- No toast notifications (use inline error cards)
- No charts, analytics, or dashboard widgets
- No modals or dialogs (use full page navigation instead)
- No animations beyond: spinner rotation, mic pulse, voice wave pulse
