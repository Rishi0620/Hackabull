'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useHousehold } from '@/hooks/useHousehold';

export default function AddMemberPage() {
  const router = useRouter();
  const { household } = useHousehold();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!household) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: household.householdId,
          name,
          age: age ? parseInt(age) : undefined,
          index: Math.floor(Math.random() * 6),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh flex flex-col px-6 py-10 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <h2 className="text-3xl font-bold">Add a household member</h2>
        <p className="text-muted">Their meds will be kept separate from yours.</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mom" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Age (optional)</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="68"
            />
          </div>
        </div>
        {error && <Card className="p-4 bg-danger/10 border-danger text-danger">{error}</Card>}
        <Button size="xl" onClick={add} disabled={!name.trim() || submitting}>
          {submitting ? 'Adding...' : 'Add member'}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
