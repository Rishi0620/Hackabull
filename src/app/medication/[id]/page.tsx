'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { ShieldCheck, Volume2, Trash2, CheckCircle } from 'lucide-react';
import { speak } from '@/lib/speech';

type Med = {
  _id: string;
  brandName: string;
  genericName?: string | null;
  activeIngredients: { name: string; strength: string }[];
  dosage: { raw: string };
  warnings: { code: string; text: string; severity: string }[];
  plainLanguage: { whatItDoes: string; howToTake: string; watchOutFor: string };
  fdaVerified: boolean;
  rxNumber?: string | null;
  prescriber?: string | null;
  pharmacy?: string | null;
};
type Member = { name: string; avatarColor: string };

export default function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [med, setMed] = useState<Med | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    fetch(`/api/medication/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setMed(d.medication);
        setMember(d.member);
      });
  }, [id]);

  async function logDose() {
    if (!med) return;
    setLogging(true);
    try {
      await fetch('/api/dose/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId: med._id, source: 'manual' }),
      });
      setLogged(true);
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    } finally {
      setLogging(false);
    }
  }

  async function remove() {
    if (!med) return;
    if (!confirm('Remove this medication from your cabinet?')) return;
    await fetch(`/api/medication/${med._id}`, { method: 'DELETE' });
    router.push('/cabinet');
  }

  if (!med) return <div className="p-6 text-muted">Loading...</div>;

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-24">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
        ← Back
      </Button>

      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{med.brandName}</h1>
            {med.genericName && <p className="text-muted text-lg mt-1">{med.genericName}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Read aloud"
            onClick={() =>
              speak(
                `${med.brandName}. ${med.plainLanguage.whatItDoes} ${med.plainLanguage.howToTake} ${med.plainLanguage.watchOutFor}`
              )
            }
          >
            <Volume2 className="w-6 h-6" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {member && (
            <Badge variant="info">
              <MemberAvatar name={member.name} color={member.avatarColor} size="sm" />
              {member.name}
            </Badge>
          )}
          {med.fdaVerified && (
            <Badge variant="ok">
              <ShieldCheck className="w-4 h-4" /> FDA verified
            </Badge>
          )}
        </div>
      </header>

      <div className="space-y-3">
        <Card className="p-5">
          <p className="text-sm uppercase tracking-wide text-muted font-semibold">Dosage</p>
          <p className="text-xl mt-2 leading-snug">{med.dosage.raw || '—'}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-wide text-muted font-semibold">What it does</p>
          <p className="text-xl mt-2 leading-snug">{med.plainLanguage.whatItDoes}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-wide text-muted font-semibold">How to take it</p>
          <p className="text-xl mt-2 leading-snug">{med.plainLanguage.howToTake}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-wide text-muted font-semibold">Watch out for</p>
          <p className="text-xl mt-2 leading-snug">{med.plainLanguage.watchOutFor}</p>
        </Card>

        {med.activeIngredients.length > 0 && (
          <Card className="p-5">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">Active ingredients</p>
            <ul className="mt-2 space-y-1">
              {med.activeIngredients.map((i, idx) => (
                <li key={idx} className="text-base">
                  {i.name} — {i.strength}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {med.warnings.length > 0 && (
          <Card className="p-5">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">Warnings</p>
            <ul className="mt-2 space-y-2">
              {med.warnings.map((w, idx) => (
                <li key={idx} className="text-sm text-fg/80">
                  • {w.text}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(med.rxNumber || med.prescriber || med.pharmacy) && (
          <Card className="p-5">
            <p className="text-sm uppercase tracking-wide text-muted font-semibold">Prescription</p>
            <dl className="mt-2 text-sm space-y-1">
              {med.rxNumber && (
                <div>
                  <dt className="inline text-muted">Rx #: </dt>
                  <dd className="inline">{med.rxNumber}</dd>
                </div>
              )}
              {med.prescriber && (
                <div>
                  <dt className="inline text-muted">Prescriber: </dt>
                  <dd className="inline">{med.prescriber}</dd>
                </div>
              )}
              {med.pharmacy && (
                <div>
                  <dt className="inline text-muted">Pharmacy: </dt>
                  <dd className="inline">{med.pharmacy}</dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button size="lg" className="flex-1" onClick={logDose} disabled={logging || logged}>
          <CheckCircle className="w-5 h-5" />
          {logged ? 'Logged ✓' : logging ? 'Logging...' : 'I just took this'}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Remove" onClick={remove}>
          <Trash2 className="w-6 h-6 text-danger" />
        </Button>
      </div>
    </div>
  );
}
