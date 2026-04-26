import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LocalContext } from '@/lib/gemma';

const GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export const maxDuration = 30;

function extractAnswer(raw: string): string {
  let text = raw.trim();

  // Strip XML/markdown artifacts
  text = text.replace(/<\/?answer>/gi, '').replace(/```[^`]*```/g, '').trim();

  // Strip any "Label:" or "Two Word Label:" prefix Gemma adds (handles any invented prefix)
  text = text.replace(/^([A-Za-z]+(\s[A-Za-z]+)?)\s*:\s*(?=[A-Z])/g, '').trim();
  text = text.replace(/^(here\s+is|here's|based on|according to)[^.!?]*[:.]\s*/i, '').trim();

  // Strip bullet chars from every line (don't filter — strip), take the last non-empty line
  const lines = text
    .split('\n')
    .map((l) => l.trim()
      .replace(/^[*•\-]\s*/, '')   // remove bullet char
      .replace(/^([A-Za-z\s']+)\s*:\s*(?=[A-Z"'])/, '') // strip any label prefix per-line
      .trim()
    )
    .filter(Boolean);
  const answer = lines[lines.length - 1] || text;

  // Deduplicate — normalise quotes, insert spaces at boundaries, split
  const sentences = answer
    .replace(/["""]/g, '')                  // strip decorative quotes Gemma adds
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // ensure space before next sentence
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^([A-Za-z\s']+)\s*:\s*(?=[A-Z"'])/g, ''))
    .filter(Boolean);

  const unique: string[] = [];
  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/\s+/g, ' ');
    if (!unique.some((u) => u.toLowerCase().replace(/\s+/g, ' ') === norm)) unique.push(s);
  }

  // Gemma always puts the real answer last — take the final unique sentence
  return (unique[unique.length - 1] ?? unique[0] ?? text).trim();
}

export async function POST(req: NextRequest) {
  try {
    const { query, context } = await req.json() as { query: string; context: LocalContext };
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: GEMMA_MODEL,
      generationConfig: { maxOutputTokens: 150, temperature: 0.1 },
    });

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

    // Build facts as natural-language bullets so Gemma doesn't echo structure
    const factLines: string[] = [];
    for (const [member, meds] of Object.entries(medsByMember)) {
      factLines.push(`- ${member} takes: ${meds.join(', ')}`);
    }
    if (taken.length) factLines.push(`- Taken today: ${taken.join(', ')}`);
    if (pending.length) factLines.push(`- Still due today: ${pending.join(', ')}`);

    const prompt = `Facts:
${factLines.join('\n')}

Question: ${query}
Answer:`;


    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const answer = extractAnswer(raw);

    return NextResponse.json({ answer, model: GEMMA_MODEL });
  } catch (e: any) {
    console.error('Gemma answer error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
