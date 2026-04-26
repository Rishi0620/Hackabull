'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, ShieldCheck } from 'lucide-react';

export type PillResult = {
  shape: string;
  color: string;
  imprint?: string | null;
  match: { medicationName: string | null; confidence: number };
  member?: string;
  dosageNote?: string;
  fdaInfo?: { whatItDoes: string; warnings: string[] } | null;
  inCabinet?: boolean;
  dbSource?: string | null;
};

const colorSwatch: Record<string, string> = {
  white: '#F1F5F9',
  yellow: '#EAB308',
  blue: '#3B82F6',
  red: '#DC2626',
  pink: '#EC4899',
  green: '#22C55E',
  orange: '#F97316',
  brown: '#92400E',
  purple: '#8B5CF6',
  black: '#111827',
  amber: '#F59E0B',
  beige: '#E5D3B3',
  peach: '#FBBF91',
  gray: '#6B7280',
};

function swatch(color: string): string {
  const k = color.toLowerCase().split(/\s|\//)[0];
  return colorSwatch[k] || '#9CA3AF';
}

export function PillOverlay({ pills, photo }: { pills: PillResult[]; photo?: string | null }) {
  return (
    <div className="space-y-4">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Captured pills" className="w-full rounded-2xl border border-border" />
      )}
      <div className="space-y-3">
        {pills.map((pill, i) => {
          const cabinetMatch = pill.inCabinet && pill.match.confidence >= 0.75;
          const fdaMatch = !pill.inCabinet && pill.fdaInfo && pill.match.medicationName;
          const totallyUnknown = !cabinetMatch && !fdaMatch;

          return (
            <Card key={i} className="p-4 flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-full border-2 border-white/10 shrink-0 mt-0.5"
                style={{ backgroundColor: swatch(pill.color) }}
                aria-label={`${pill.color} ${pill.shape}`}
              />
              <div className="flex-1 min-w-0">
                {cabinetMatch && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-semibold">{pill.match.medicationName}</p>
                      <Badge variant="ok"><ShieldCheck className="w-3 h-3" /> In cabinet</Badge>
                    </div>
                    {pill.member && <p className="text-sm text-muted">For {pill.member}</p>}
                    {pill.dosageNote && <p className="text-sm text-fg/80 mt-1">{pill.dosageNote}</p>}
                  </>
                )}

                {fdaMatch && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-semibold">{pill.match.medicationName}</p>
                      <Badge variant="info">
                        <ShieldCheck className="w-3 h-3" />
                        {pill.dbSource?.includes('RxImage') ? 'NLM RxImage' : 'FDA identified'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted mt-0.5">Not in your cabinet</p>
                    <p className="text-sm text-fg/80 mt-1">{pill.fdaInfo!.whatItDoes}</p>
                    {pill.fdaInfo!.warnings.length > 0 && (
                      <p className="text-xs text-caution mt-1">⚠ {pill.fdaInfo!.warnings[0]}</p>
                    )}
                  </>
                )}

                {totallyUnknown && (
                  <>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-caution" />
                      Unidentified pill
                    </p>
                    <p className="text-sm text-muted">
                      {pill.color} {pill.shape}
                      {pill.imprint && ` · imprint "${pill.imprint}"`}
                    </p>
                    <p className="text-xs text-muted mt-1">Scan the bottle for details.</p>
                  </>
                )}
              </div>

              <Badge variant={cabinetMatch ? 'ok' : fdaMatch ? 'info' : 'caution'} className="shrink-0">
                {cabinetMatch || fdaMatch
                  ? Math.round(pill.match.confidence * 100) + '%'
                  : '?'}
              </Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
