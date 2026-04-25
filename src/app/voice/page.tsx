'use client';

import { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MicButton } from '@/components/voice/MicButton';
import { VoiceWave } from '@/components/voice/VoiceWave';
import { useVoice } from '@/hooks/useVoice';
import { useGemma } from '@/hooks/useGemma';
import { useHousehold } from '@/hooks/useHousehold';
import { answerLocally, shouldRouteLocal, type LocalContext } from '@/lib/gemma';
import { Cloud, Cpu, Volume2, ShieldCheck } from 'lucide-react';

const SUGGESTIONS = [
  "What's in the cabinet?",
  "Did Grandpa Joe take his morning pills?",
  "What's the next dose?",
  'Can I take ibuprofen with warfarin?',
];

async function speakWithElevenLabs(text: string): Promise<void> {
  try {
    const res = await fetch('/api/elevenlabs/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('ElevenLabs unavailable');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch {
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  }
}

export default function VoicePage() {
  const { household } = useHousehold();
  const { listening, transcript, error, toggle } = useVoice();
  const { status: gemmaStatus } = useGemma(true);
  const [answer, setAnswer] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [route, setRoute] = useState<'local' | 'cloud' | null>(null);
  const [ctx, setCtx] = useState<LocalContext | null>(null);
  const lastAnswered = useRef('');

  useEffect(() => {
    if (!household) return;
    fetch(`/api/voice/context?householdId=${household.householdId}`)
      .then((r) => r.json())
      .then((d) => setCtx(d));
  }, [household]);

  useEffect(() => {
    if (!transcript || !household) return;
    if (transcript === lastAnswered.current) return;
    if (listening) return;
    lastAnswered.current = transcript;
    runQuery(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, listening]);

  async function runQuery(query: string) {
    setThinking(true);
    setAnswer(null);
    const local = shouldRouteLocal(query);
    setRoute(local ? 'local' : 'cloud');
    try {
      let result: string;
      if (local && ctx) {
        result = await answerLocally(query, ctx);
      } else {
        const res = await fetch('/api/voice/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, householdId: household!.householdId }),
        });
        const data = await res.json();
        result = data.answer || 'I could not find an answer.';
      }
      setAnswer(result);
      setThinking(false);
      setSpeaking(true);
      await speakWithElevenLabs(result);
      setSpeaking(false);
    } catch (e: any) {
      setAnswer(`Error: ${e.message}`);
      setThinking(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-5 py-6 flex flex-col min-h-[calc(100svh-6rem)]">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Ask MedMate</h1>
          <p className="text-muted mt-1">Voice or tap a question.</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant={gemmaStatus === 'ready' ? 'ok' : 'info'}>
              <Cpu className="w-4 h-4" />
              Gemma 4: {gemmaStatus}
            </Badge>
            <Badge variant="info">
              <Volume2 className="w-4 h-4" />
              ElevenLabs voice
            </Badge>
            <Badge variant="info">
              <ShieldCheck className="w-4 h-4" />
              Privacy-first
            </Badge>
          </div>
        </header>

        <div className="flex-1 space-y-4">
          {transcript && (
            <Card className="p-4 bg-card/60">
              <p className="text-sm text-muted">You asked</p>
              <p className="text-lg mt-1">{transcript}</p>
            </Card>
          )}

          {thinking && (
            <Card className="p-5 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
              <p>Thinking…</p>
              {route && (
                <Badge variant={route === 'local' ? 'ok' : 'info'} className="ml-auto">
                  {route === 'local' ? <Cpu className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  {route === 'local' ? 'Gemma 4' : 'Gemini 2.5'}
                </Badge>
              )}
            </Card>
          )}

          {speaking && (
            <Card className="p-5 flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-accent animate-pulse shrink-0" />
              <p className="text-muted">Speaking…</p>
            </Card>
          )}

          {answer && !thinking && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm uppercase tracking-wide text-muted font-semibold">Answer</p>
                {route && (
                  <Badge variant={route === 'local' ? 'ok' : 'info'}>
                    {route === 'local' ? <><Cpu className="w-4 h-4" /> Gemma 4</> : <><Cloud className="w-4 h-4" /> Gemini 2.5</>}
                  </Badge>
                )}
              </div>
              <p className="text-xl leading-snug">{answer}</p>
              {route === 'local' && (
                <p className="text-xs text-muted mt-3">✓ Answered using Gemma 4 — your health data stayed on this network.</p>
              )}
            </Card>
          )}

          {error && (
            <Card className="p-4 bg-danger/10 border-danger text-danger text-sm">{error}</Card>
          )}

          {!transcript && !thinking && !answer && (
            <div className="space-y-2">
              <p className="text-sm text-muted px-1">Try asking</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => runQuery(s)}
                  className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:bg-card/80 active:scale-[0.98] transition-transform"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 pt-6">
          <VoiceWave active={listening} />
          <MicButton listening={listening} onClick={toggle} />
          <p className="text-sm text-muted text-center">
            {listening ? 'Listening…' : speaking ? 'Speaking…' : 'Tap and ask anything'}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
