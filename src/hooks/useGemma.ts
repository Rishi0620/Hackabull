'use client';

import { useEffect, useState } from 'react';
import { getGemmaStatus, loadGemma, subscribeGemma, type GemmaStatus } from '@/lib/gemma';

export function useGemma(autoload = true) {
  const [status, setStatus] = useState<GemmaStatus>(getGemmaStatus());

  useEffect(() => {
    const unsub = subscribeGemma(setStatus);
    if (autoload) loadGemma();
    return unsub;
  }, [autoload]);

  return { status, load: loadGemma };
}
