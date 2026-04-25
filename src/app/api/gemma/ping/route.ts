import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'no key' }, { status: 500 });
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: GEMMA_MODEL });
    await model.generateContent('hi');
    return NextResponse.json({ ok: true, model: GEMMA_MODEL });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
