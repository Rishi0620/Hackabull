import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LocalContext } from '@/lib/gemma';

const GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export const maxDuration = 30;

// Strip chain-of-thought: Gemma 4 reasons with "* " bullet lines.
// The actual answer is always the last clean paragraph.
function extractAnswer(raw: string): string {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  // Collect lines that aren't reasoning bullets
  const answerLines = lines.filter(
    (l) => !l.startsWith('*') && !l.startsWith('•') && !l.startsWith('-')
  );
  if (answerLines.length > 0) return answerLines[answerLines.length - 1];
  // Fallback: last line of anything
  return lines[lines.length - 1] || raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { query, context } = await req.json() as { query: string; context: LocalContext };
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: GEMMA_MODEL,
      generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
    });

    // context can be null if the voice page hasn't loaded household data yet
    const ctx: LocalContext = context ?? { members: [], medications: [], recentDoses: [] };

    const medsByMember = (ctx.medications ?? []).reduce<Record<string, string[]>>((acc, m) => {
      acc[m.member] = acc[m.member] || [];
      acc[m.member].push(m.name);
      return acc;
    }, {});
    const medsText = Object.entries(medsByMember)
      .map(([member, meds]) => `${member}: ${meds.join(', ')}`)
      .join(' | ');

    const taken = ctx.recentDoses
      .filter((d) => d.takenAt)
      .map((d) => `${d.medication} (${d.member})`);
    const pending = ctx.recentDoses
      .filter((d) => !d.takenAt)
      .map((d) => `${d.medication} (${d.member}) due ${new Date(d.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);

    const prompt = `You are MedSNAP. Give a direct answer in 1-2 plain sentences. No reasoning, no bullet points, no explanation. Just the answer.

Meds: ${medsText || 'none'}
Taken today: ${taken.length ? taken.join(', ') : 'none yet'}
Still due: ${pending.length ? pending.join(', ') : 'all done'}

Q: ${query}
A:`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const answer = extractAnswer(raw);

    return NextResponse.json({ answer, model: GEMMA_MODEL });
  } catch (e: any) {
    console.error('Gemma answer error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
