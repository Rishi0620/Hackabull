'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useHousehold } from '@/hooks/useHousehold';
import { Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { save } = useHousehold();
  const [step, setStep] = useState<'welcome' | 'household' | 'member'>('welcome');
  const [householdName, setHouseholdName] = useState('');
  const [firstMember, setFirstMember] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createHousehold() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName || 'My Household', firstMemberName: firstMember || 'Me' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Could not create household');
      }
      const data = await res.json();
      save({
        householdId: data.householdId,
        code: data.code,
        name: data.name,
        activeMemberId: data.activeMemberId,
      });
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh flex flex-col px-6 py-10 max-w-md mx-auto">
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-bg" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">MedMate</h1>
            <p className="text-xl text-muted mt-2">Your medicine cabinet, but smarter.</p>
          </div>
          <ul className="text-left space-y-3 text-base mt-4">
            <li className="flex gap-3">
              <span className="text-accent">✓</span>
              <span>Scan a bottle, get plain-language instructions</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">✓</span>
              <span>Identify loose pills from a photo of your hand</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">✓</span>
              <span>Catch dangerous drug interactions automatically</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">✓</span>
              <span>Voice answers without sending data to the cloud</span>
            </li>
          </ul>
          <Button size="xl" className="w-full mt-6" onClick={() => setStep('household')}>
            Get started
          </Button>
        </div>
      )}

      {step === 'household' && (
        <div className="flex-1 flex flex-col justify-center gap-6">
          <h2 className="text-3xl font-bold">What should I call your home?</h2>
          <p className="text-muted text-lg">Pick anything — "The Garcia family", "My place".</p>
          <Input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="My household"
            autoFocus
          />
          <Button size="xl" onClick={() => setStep('member')} disabled={!householdName.trim()}>
            Continue
          </Button>
        </div>
      )}

      {step === 'member' && (
        <div className="flex-1 flex flex-col justify-center gap-6">
          <h2 className="text-3xl font-bold">Who's the first person?</h2>
          <p className="text-muted text-lg">You can add more family members later.</p>
          <Input
            value={firstMember}
            onChange={(e) => setFirstMember(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          {error && <Card className="p-4 bg-danger/10 border-danger text-danger">{error}</Card>}
          <Button
            size="xl"
            onClick={createHousehold}
            disabled={!firstMember.trim() || submitting}
          >
            {submitting ? 'Setting up...' : 'Finish setup'}
          </Button>
        </div>
      )}
    </div>
  );
}
