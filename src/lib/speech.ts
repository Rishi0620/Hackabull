'use client';

export type SpeechCallbacks = {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isTtsSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export function startListening(cb: SpeechCallbacks): () => void {
  if (!isSpeechSupported()) {
    cb.onError?.('Speech recognition not supported in this browser.');
    return () => {};
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (e: any) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (final) cb.onResult?.(final.trim(), true);
    else if (interim) cb.onResult?.(interim.trim(), false);
  };
  rec.onerror = (e: any) => cb.onError?.(e.error || 'Speech error');
  rec.onend = () => cb.onEnd?.();

  try {
    rec.start();
  } catch (e) {
    cb.onError?.(String(e));
  }

  return () => {
    try {
      rec.stop();
    } catch {}
  };
}

export function speak(text: string, opts?: { rate?: number; lang?: string }): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts?.rate ?? 0.95;
  u.lang = opts?.lang ?? 'en-US';
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}
