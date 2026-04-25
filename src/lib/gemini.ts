import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set');
  }
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export async function geminiText(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function geminiJson<T>(prompt: string): Promise<T> {
  const text = await geminiText(prompt);
  const cleaned = stripJsonFence(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Gemini returned non-JSON: ${cleaned.slice(0, 200)}`);
  }
}

export async function geminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const model = getClient().getGenerativeModel({ model: modelName });
  const cleanedB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: cleanedB64, mimeType } },
  ]);
  return result.response.text();
}

export async function geminiVisionJson<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<T> {
  const text = await geminiVision(prompt, imageBase64, mimeType);
  const cleaned = stripJsonFence(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Gemini Vision returned non-JSON: ${cleaned.slice(0, 200)}`);
  }
}
