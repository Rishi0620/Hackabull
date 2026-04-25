import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

export const maxDuration = 30;

// Cache name→ID lookups for the session
const voiceCache = new Map<string, string>();

async function resolveVoiceId(client: ElevenLabsClient, nameOrId: string): Promise<string> {
  // If it looks like an ID (alphanumeric, ~20 chars) use it directly
  if (/^[A-Za-z0-9]{15,25}$/.test(nameOrId)) return nameOrId;

  const cacheKey = nameOrId.toLowerCase();
  if (voiceCache.has(cacheKey)) return voiceCache.get(cacheKey)!;

  try {
    const { voices } = await client.voices.getAll();
    const match = voices.find((v) => v.name?.toLowerCase() === cacheKey);
    if (match?.voice_id) {
      voiceCache.set(cacheKey, match.voice_id);
      return match.voice_id;
    }
  } catch {}

  // Fallback: Sarah (calm, reassuring — good for medical)
  return 'EXAVITQu4vr4xnSDxMaL';
}

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });

    const client = new ElevenLabsClient({ apiKey });
    const rawVoice = voiceId || process.env.ELEVENLABS_VOICE_ID || 'Sarah';
    const resolvedVoiceId = await resolveVoiceId(client, rawVoice);

    const audio = await client.textToSpeech.convert(resolvedVoiceId, {
      text,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('ElevenLabs error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
