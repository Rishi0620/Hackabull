'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { MedCard } from '@/components/medication/MedCard';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useHousehold } from '@/hooks/useHousehold';

type Med = {
  _id: string;
  brandName: string;
  genericName?: string | null;
  memberId: string;
  dosage: { raw: string };
  fdaVerified: boolean;
  warnings: { severity: string }[];
  member?: { name: string; avatarColor: string } | null;
};
type Member = { _id: string; name: string; avatarColor: string };

function CabinetContent() {
  const search = useSearchParams();
  const memberFilter = search.get('member');
  const { household } = useHousehold();
  const [meds, setMeds] = useState<Med[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/medication?householdId=${household.householdId}`).then((r) => r.json()),
      fetch(`/api/household?id=${household.householdId}`).then((r) => r.json()),
    ])
      .then(([m, h]) => {
        setMeds(m.medications || []);
        setMembers(h.members || []);
      })
      .finally(() => setLoading(false));
  }, [household]);

  if (!household) return <p className="p-6 text-muted">Loading...</p>;

  const filtered = memberFilter ? meds.filter((m) => m.memberId === memberFilter) : meds;
  const grouped: Record<string, Med[]> = {};
  for (const m of filtered) {
    const key = m.member?.name || 'Unknown';
    grouped[key] = grouped[key] || [];
    grouped[key].push(m);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Cabinet</h1>
        <p className="text-muted mt-1">{filtered.length} medication{filtered.length === 1 ? '' : 's'}</p>
      </header>

      {members.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-4">
          <a
            href="/cabinet"
            className={`flex flex-col items-center gap-1 shrink-0 p-2 rounded-2xl ${
              !memberFilter ? 'bg-accent/10 ring-2 ring-accent' : ''
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-sm">
              All
            </div>
            <span className="text-xs">Everyone</span>
          </a>
          {members.map((m) => (
            <a
              key={m._id}
              href={`/cabinet?member=${m._id}`}
              className={`flex flex-col items-center gap-1 shrink-0 p-2 rounded-2xl ${
                memberFilter === m._id ? 'bg-accent/10 ring-2 ring-accent' : ''
              }`}
            >
              <MemberAvatar name={m.name} color={m.avatarColor} size="md" />
              <span className="text-xs">{m.name}</span>
            </a>
          ))}
        </div>
      )}

      {loading && <Card className="p-6 text-muted">Loading...</Card>}

      {!loading && filtered.length === 0 && (
        <Card className="p-6 text-center">
          <p className="font-semibold">No medications yet.</p>
          <p className="text-sm text-muted mt-1">Tap Scan to add one.</p>
        </Card>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([memberName, list]) => (
          <section key={memberName}>
            <h2 className="text-lg font-semibold mb-3">{memberName}</h2>
            <div className="space-y-3">
              {list.map((m) => (
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
        ))}
      </div>
    </div>
  );
}

export default function CabinetPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="p-6 text-muted">Loading...</p>}>
        <CabinetContent />
      </Suspense>
    </AppShell>
  );
}
