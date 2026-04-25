'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarningBanner } from '@/components/interactions/WarningBanner';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useHousehold } from '@/hooks/useHousehold';
import { CheckCircle, ShieldCheck, Volume2 } from 'lucide-react';

type Member = { _id: string; name: string; avatarColor: string };

type ScanResult = {
  medicationId: string;
  extracted: {
    brandName: string;
    genericName?: string | null;
    dosageInstructions: string;
    activeIngredients: { name: string; strength: string }[];
    confidence: string;
  };
  plainLanguage: { whatItDoes: string; howToTake: string; watchOutFor: string };
  fdaVerified: boolean;
  fdaWarnings: string[];
  interactions: { with: string; severity: string; summary: string; plainLanguage: string }[];
};

type Step = 'pick-member' | 'camera' | 'loading' | 'result' | 'error';

export default function ScanBottlePage() {
  const router = useRouter();
  const { household, loaded } = useHousehold();
  const [step, setStep] = useState<Step>('pick-member');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!household) { router.replace('/onboarding'); return; }
    fetch(`/api/household?id=${household.householdId}`)
      .then((r) => r.json())
      .then((d) => {
        const mems: Member[] = d.members || [];
        setMembers(mems);
        const defaultId = household.activeMemberId || mems[0]?._id || null;
        setMemberId(defaultId);
        // Skip picker if only one member
        if (mems.length <= 1) setStep('camera');
      });
  }, [loaded, household, router]);

  async function onCapture(image: string) {
    if (!household || !memberId) { setError('No member selected.'); setStep('error'); return; }
    setStep('loading');
    setError(null);
    try {
      const res = await fetch('/api/scan/bottle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, householdId: household.householdId, memberId, language: 'en' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Scan failed');
      setResult(await res.json());
      setStep('result');
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
  }

  async function speakResult(r: ScanResult) {
    const text = `${r.extracted.brandName}. ${r.plainLanguage.whatItDoes} ${r.plainLanguage.howToTake} ${r.plainLanguage.watchOutFor}`;
    try {
      const res = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch {
      // fallback to browser TTS
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
      }
    }
  }

  if (!loaded || !household) return null;

  // ── Step 1: Member picker ─────────────────────────────────────────────────
  if (step === 'pick-member') {
    return (
      <div className="max-w-md mx-auto px-5 py-10 flex flex-col min-h-svh">
        <Button variant="ghost" size="sm" className="self-start mb-6" onClick={() => router.back()}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">Who is this for?</h1>
        <p className="text-muted mb-8">Select the household member before scanning.</p>
        <div className="grid grid-cols-2 gap-3">
          {members.map((m) => (
            <button
              key={m._id}
              onClick={() => { setMemberId(m._id); setStep('camera'); }}
              className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all active:scale-[0.97] ${
                memberId === m._id
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-card'
              }`}
            >
              <MemberAvatar name={m.name} color={m.avatarColor} size="lg" />
              <span className="text-lg font-semibold">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2: Camera ────────────────────────────────────────────────────────
  if (step === 'camera') {
    const selectedMember = members.find((m) => m._id === memberId);
    return (
      <CameraCapture
        prompt={`Scanning for ${selectedMember?.name ?? 'member'} — hold the label clearly in frame`}
        onCapture={onCapture}
        onCancel={() => (members.length > 1 ? setStep('pick-member') : router.back())}
      />
    );
  }

  // ── Step 3: Loading ───────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-full border-4 border-accent border-t-transparent animate-spin" />
        <p className="mt-6 text-xl font-semibold">Reading the label…</p>
        <p className="text-muted text-base mt-2">Verifying against the FDA database.</p>
      </div>
    );
  }

  // ── Step 4: Error ─────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="max-w-md mx-auto px-5 py-10">
        <Card className="p-6 bg-danger/10 border-danger">
          <p className="text-xl font-bold text-danger">Could not read label</p>
          <p className="text-base mt-2 text-fg/80">{error}</p>
          <p className="text-sm text-muted mt-2">Make sure the text is in frame and well-lit.</p>
          <div className="flex gap-3 mt-5">
            <Button className="flex-1" onClick={() => setStep('camera')}>Try again</Button>
            <Button variant="secondary" className="flex-1" onClick={() => router.push('/')}>Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Step 5: Result ────────────────────────────────────────────────────────
  const selectedMember = members.find((m) => m._id === memberId);
  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scan result</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>Done</Button>
      </header>

      {result && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold">{result.extracted.brandName}</h2>
                {result.extracted.genericName &&
                  result.extracted.genericName.toLowerCase() !== result.extracted.brandName.toLowerCase() && (
                    <p className="text-muted text-lg mt-1">{result.extracted.genericName}</p>
                  )}
                {selectedMember && (
                  <div className="flex items-center gap-2 mt-2">
                    <MemberAvatar name={selectedMember.name} color={selectedMember.avatarColor} size="sm" />
                    <span className="text-sm text-muted">For {selectedMember.name}</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speakResult(result)}>
                <Volume2 className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {result.fdaVerified && (
                <Badge variant="ok"><ShieldCheck className="w-4 h-4" /> FDA verified</Badge>
              )}
              <Badge variant="info">{result.extracted.confidence} confidence</Badge>
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">What it does</p>
            <p className="text-xl mt-2 leading-snug">{result.plainLanguage.whatItDoes}</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">How to take it</p>
            <p className="text-xl mt-2 leading-snug">{result.plainLanguage.howToTake}</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">Watch out for</p>
            <p className="text-xl mt-2 leading-snug">{result.plainLanguage.watchOutFor}</p>
          </Card>

          {result.interactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wide text-muted font-semibold mt-2">Interactions detected</p>
              {result.interactions.map((i, idx) => (
                <WarningBanner key={idx} severity={i.severity as any} title={`Conflict with ${i.with}`} message={i.plainLanguage} />
              ))}
            </div>
          )}

          {result.fdaWarnings.length > 0 && (
            <Card className="p-5">
              <p className="text-sm uppercase tracking-wide text-muted font-semibold">FDA warnings</p>
              <ul className="list-disc list-inside text-fg/80 mt-2 space-y-1 text-sm">
                {result.fdaWarnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w.slice(0, 200)}</li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Button asChild className="flex-1">
              <Link href={`/medication/${result.medicationId}`}>
                <CheckCircle className="w-5 h-5" /> View details
              </Link>
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setStep('camera')}>
              Scan another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
