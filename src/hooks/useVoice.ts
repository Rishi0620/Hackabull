'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeechSupported, isTtsSupported, speak, startListening, stopSpeaking } from '@/lib/speech';

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (!isSpeechSupported()) {
      setError('Speech recognition not supported in this browser.');
      return;
    }
    setError(null);
    setTranscript('');
    setListening(true);
    stopRef.current = startListening({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) setListening(false);
      },
      onError: (e) => {
        setError(e);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  return {
    listening,
    transcript,
    error,
    start,
    stop,
    toggle,
    speak,
    stopSpeaking,
    supported: isSpeechSupported(),
    ttsSupported: isTtsSupported(),
  };
}
