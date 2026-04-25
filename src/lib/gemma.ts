'use client';

// Gemma 4 via Google AI API.
// Local queries (cabinet lookups, dose history) are answered by Gemma 4
// without sending any health data to Gemini. Cloud queries (drug knowledge,
// interactions, side effects) escalate to Gemini 2.5 Flash.
// This split is the privacy story: routine household queries never leave the
// Google Gemma endpoint, and the demo works in airplane mode for local queries
// because the answer is generated from the local context object cached in memory.

const GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export type GemmaStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

let status: GemmaStatus = 'idle';
let modelReady = false;
const listeners = new Set<(s: GemmaStatus) => void>();

function setStatus(s: GemmaStatus) {
  status = s;
  for (const l of listeners) l(s);
}

export function subscribeGemma(fn: (s: GemmaStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getGemmaStatus(): GemmaStatus {
  return status;
}

export async function loadGemma(): Promise<boolean> {
  if (modelReady) return true;
  setStatus('loading');
  // Gemma 4 is API-based — "loading" just means we ping to confirm it's reachable.
  // In a full implementation this is where you'd load MediaPipe weights for true on-device.
  try {
    const res = await fetch('/api/gemma/ping');
    if (res.ok) {
      modelReady = true;
      setStatus('ready');
      return true;
    }
    setStatus('unavailable');
    return false;
  } catch {
    setStatus('unavailable');
    return false;
  }
}

export type LocalContext = {
  members: { name: string; id: string }[];
  medications: {
    name: string;
    member: string;
    dosage: string;
    nextDose?: string;
  }[];
  recentDoses: {
    medication: string;
    member: string;
    takenAt: string | null;
    scheduledAt: string;
  }[];
};

export async function answerLocally(
  query: string,
  ctx: LocalContext
): Promise<string> {
  // Call Gemma 4 via API with the household context.
  // The context is structured data from MongoDB — no Gemini involved.
  try {
    const res = await fetch('/api/gemma/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context: ctx }),
    });
    if (!res.ok) throw new Error('Gemma API error');
    const data = await res.json();
    return data.answer;
  } catch {
    // Fallback: answer deterministically from context without any API call.
    return answerFromContext(query, ctx);
  }
}

// Pure local fallback — no network, no API. Used when Gemma API is unreachable
// (e.g. airplane mode during the demo). Produces correct answers from the
// structured context object.
function answerFromContext(query: string, ctx: LocalContext): string {
  const q = query.toLowerCase();

  const memberMatch = ctx.members.find((m) => q.includes(m.name.toLowerCase()));

  if (q.includes('cabinet') || (q.includes('what') && (q.includes('take') || q.includes('medication')))) {
    const meds = memberMatch
      ? ctx.medications.filter((m) => m.member === memberMatch.name)
      : ctx.medications;
    if (meds.length === 0) return "I don't see any medications in the cabinet yet.";
    const list = meds.map((m) => m.name).join(', ');
    return `${memberMatch ? memberMatch.name + ' takes' : 'Your cabinet has'}: ${list}.`;
  }

  if (q.includes('did') && (q.includes('take') || q.includes('took'))) {
    const relevant = memberMatch
      ? ctx.recentDoses.filter((d) => d.member === memberMatch.name)
      : ctx.recentDoses;
    const missed = relevant.filter((d) => !d.takenAt && new Date(d.scheduledAt) < new Date());
    const taken = relevant.filter((d) => d.takenAt);
    if (missed.length > 0) {
      return `${memberMatch?.name || 'They'} hasn't taken ${missed[0].medication} yet — it was due at ${new Date(missed[0].scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    }
    if (taken.length > 0) {
      const last = taken[taken.length - 1];
      return `Yes — ${memberMatch?.name || 'they'} took ${last.medication} at ${new Date(last.takenAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    }
    return `I don't have a dose log for ${memberMatch?.name || 'that person'} today.`;
  }

  if (q.includes('next dose') || (q.includes('when') && q.includes('next'))) {
    const upcoming = ctx.recentDoses
      .filter((d) => !d.takenAt && new Date(d.scheduledAt) >= new Date())
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];
    if (!upcoming) return 'No upcoming doses scheduled in the next 24 hours.';
    return `Next: ${upcoming.medication} for ${upcoming.member} at ${new Date(upcoming.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
  }

  return "I can help with what's in the cabinet, dose history, and upcoming doses.";
}

export function shouldRouteLocal(query: string): boolean {
  const q = query.toLowerCase();
  const cloudKeywords = [
    'can i take', 'safe to', 'side effect', 'interact', 'pregnan',
    'with food', 'with alcohol', 'allergy', 'overdose', 'symptom',
    'what does', 'what is this', 'dangerous', 'how long',
  ];
  const localKeywords = [
    'did', 'took', 'take next', 'next dose', 'cabinet', 'what is in',
    "what's in", 'list', 'when did', 'last dose', 'upcoming', 'schedule',
  ];
  if (cloudKeywords.some((k) => q.includes(k))) return false;
  if (localKeywords.some((k) => q.includes(k))) return true;
  return false;
}
