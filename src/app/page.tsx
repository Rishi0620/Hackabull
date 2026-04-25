'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppShell } from '@/components/AppShell';
import { useHousehold } from '@/hooks/useHousehold';
import { Camera, Mic, Pill, ScanLine, Sparkles } from 'lucide-react';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MedCard } from '@/components/medication/MedCard';

type Med = {
  _id: string;
  brandName: string;
  genericName?: string | null;
  dosage: { raw: string };
  fdaVerified: boolean;
  warnings: { severity: string }[];
  member?: { name: string; avatarColor: string } | null;
};

type Member = { _id: string; name: string; avatarColor: string };

export default function HomePage() {
  const { household, loaded } = useHousehold();
  const router = useRouter();
  const [meds, setMeds] = useState<Med[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!household) {
      router.replace('/onboarding');
      return;
    }
    setFetching(true);
    Promise.all([
      fetch(`/api/medication?householdId=${household.householdId}`).then((r) => r.json()),
      fetch(`/api/household?id=${household.householdId}`).then((r) => r.json()),
    ])
      .then(([m, h]) => {
        setMeds(m.medications || []);
        setMembers(h.members || []);
      })
      .finally(() => setFetching(false));
  }, [loaded, household, router]);

  if (!loaded || !household) {
    return (
      <div className="min-h-svh flex items-center justify-center text-muted">
        Loading...
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-5 pt-6">
        <header className="mb-6">
          <p className="text-muted text-sm">{household.name}</p>
          <h1 className="text-3xl font-bold mt-1">Welcome back.</h1>
        </header>

        {members.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {members.map((m) => (
                <Link
                  key={m._id}
                  href={`/cabinet?member=${m._id}`}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <MemberAvatar name={m.name} color={m.avatarColor} size="lg" />
                  <span className="text-sm">{m.name}</span>
                </Link>
              ))}
              <Link
                href="/onboarding/member"
                className="flex flex-col items-center gap-1 shrink-0 text-muted"
              >
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-2xl">
                  +
                </div>
                <span className="text-sm">Add</span>
              </Link>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/scan/bottle">
            <Card className="p-5 h-32 flex flex-col justify-between bg-accent text-bg border-accent active:scale-[0.98] transition-transform">
              <Camera className="w-7 h-7" />
              <div>
                <p className="font-bold text-lg leading-tight">Scan a bottle</p>
                <p className="text-sm opacity-80">Add a new medication</p>
              </div>
            </Card>
          </Link>
          <Link href="/scan/pills">
            <Card className="p-5 h-32 flex flex-col justify-between active:scale-[0.98] transition-transform">
              <ScanLine className="w-7 h-7 text-accent" />
              <div>
                <p className="font-bold text-lg leading-tight">Identify pills</p>
                <p className="text-sm text-muted">From your hand</p>
              </div>
            </Card>
          </Link>
          <Link href="/voice">
            <Card className="p-5 h-32 flex flex-col justify-between active:scale-[0.98] transition-transform">
              <Mic className="w-7 h-7 text-accent" />
              <div>
                <p className="font-bold text-lg leading-tight">Ask a question</p>
                <p className="text-sm text-muted">Voice or text</p>
              </div>
            </Card>
          </Link>
          <Link href="/cabinet">
            <Card className="p-5 h-32 flex flex-col justify-between active:scale-[0.98] transition-transform">
              <Pill className="w-7 h-7 text-accent" />
              <div>
                <p className="font-bold text-lg leading-tight">My cabinet</p>
                <p className="text-sm text-muted">{meds.length} medication{meds.length === 1 ? '' : 's'}</p>
              </div>
            </Card>
          </Link>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Recent</h2>
            <Link href="/cabinet" className="text-sm text-accent">
              See all
            </Link>
          </div>
          {fetching && <p className="text-muted">Loading...</p>}
          {!fetching && meds.length === 0 && (
            <Card className="p-6 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="font-semibold">Scan your first bottle</p>
              <p className="text-sm text-muted mt-1">
                I'll translate the label into plain language and watch for drug interactions.
              </p>
              <Button asChild className="mt-4">
                <Link href="/scan/bottle">Get started</Link>
              </Button>
            </Card>
          )}
          <div className="space-y-3">
            {meds.slice(0, 3).map((m) => (
              <MedCard
                key={m._id}
                id={m._id}
                brandName={m.brandName}
                genericName={m.genericName}
                memberName={m.member?.name || ''}
                memberColor={m.member?.avatarColor || '#14B8A6'}
                dosageRaw={m.dosage.raw}
                fdaVerified={m.fdaVerified}
                hasWarning={m.warnings.some((w) => w.severity === 'danger' || w.severity === 'caution')}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
