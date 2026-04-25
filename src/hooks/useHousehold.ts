'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'medmate.household';

export type HouseholdState = {
  householdId: string;
  code: string;
  name: string;
  activeMemberId?: string;
};

export function useHousehold() {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const save = useCallback((s: HouseholdState | null) => {
    setState(s);
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setActiveMember = useCallback(
    (memberId: string) => {
      if (!state) return;
      save({ ...state, activeMemberId: memberId });
    },
    [state, save]
  );

  return { household: state, save, setActiveMember, loaded };
}
