'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

export type PillResult = {
  shape: string;
  color: string;
  imprint?: string | null;
  match: { medicationName: string | null; confidence: number };
  member?: string;
  dosageNote?: string;
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
        <img
          src={photo}
          alt="Captured pills"
          className="w-full rounded-2xl border border-border"
        />
      )}
      <div className="space-y-3">
        {pills.map((pill, i) => {
          const known = pill.match.confidence >= 0.6 && !!pill.match.medicationName;
          return (
            <Card key={i} className="p-4 flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full border-2 border-white/20 shrink-0"
                style={{ backgroundColor: swatch(pill.color) }}
                aria-label={`${pill.color} ${pill.shape}`}
              />
              <div className="flex-1 min-w-0">
                {known ? (
                  <>
                    <p className="text-lg font-semibold">{pill.match.medicationName}</p>
                    {pill.member && (
                      <p className="text-sm text-muted">For {pill.member}</p>
                    )}
                    {pill.dosageNote && (
                      <p className="text-sm text-fg/80 mt-1">{pill.dosageNote}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-caution" />
                      Unknown pill
                    </p>
                    <p className="text-sm text-muted">
                      {pill.color} {pill.shape}
                      {pill.imprint && ` · imprint "${pill.imprint}"`}
                    </p>
                  </>
                )}
              </div>
              <Badge variant={known ? 'ok' : 'caution'}>
                {Math.round(pill.match.confidence * 100)}%
              </Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
