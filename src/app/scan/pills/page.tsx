'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WarningBanner } from '@/components/interactions/WarningBanner';
import { PillOverlay, type PillResult } from '@/components/medication/PillOverlay';
import { useHousehold } from '@/hooks/useHousehold';

type Result = {
  pills: PillResult[];
  interactions: { a: string; b: string; severity: string; plainLanguage: string; summary: string }[];
};

export default function ScanPillsPage() {
  const router = useRouter();
  const { household, loaded } = useHousehold();

  useEffect(() => {
    if (loaded && !household) router.replace('/onboarding');
  }, [loaded, household, router]);
  const [showCamera, setShowCamera] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCapture(image: string) {
    setShowCamera(false);
    setPhoto(image);
    if (!household) {
      setError('No household.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scan/pills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, householdId: household.householdId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Identification failed');
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!loaded || !household) return null;

  if (showCamera) {
    return (
      <CameraCapture
        prompt="Pour your pills into your palm and hold steady"
        onCapture={onCapture}
        onCancel={() => router.back()}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Identified pills</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          Done
        </Button>
      </header>

      {loading && (
        <Card className="p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="mt-4 text-lg">Looking at your pills…</p>
        </Card>
      )}

      {error && (
        <Card className="p-5 bg-danger/10 border-danger text-danger">
          <p className="font-bold">Could not identify</p>
          <p className="text-sm mt-1">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => setShowCamera(true)}>
            Try again
          </Button>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {result.interactions.length > 0 &&
            result.interactions.map((i, idx) => (
              <WarningBanner
                key={idx}
                severity={i.severity as any}
                title={`${i.a} + ${i.b}`}
                message={i.plainLanguage}
              />
            ))}

          <PillOverlay pills={result.pills} photo={photo} />

          <Button variant="secondary" className="w-full" onClick={() => setShowCamera(true)}>
            Scan again
          </Button>
        </div>
      )}
    </div>
  );
}
