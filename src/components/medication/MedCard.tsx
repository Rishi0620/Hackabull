'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, ChevronRight } from 'lucide-react';

type Props = {
  id: string;
  brandName: string;
  genericName?: string | null;
  memberName: string;
  memberColor: string;
  dosageRaw: string;
  fdaVerified?: boolean;
  hasWarning?: boolean;
};

export function MedCard({
  id,
  brandName,
  genericName,
  memberName,
  memberColor,
  dosageRaw,
  fdaVerified,
  hasWarning,
}: Props) {
  return (
    <Link href={`/medication/${id}`}>
      <Card className="p-5 hover:bg-card/80 transition-colors active:scale-[0.99]">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${memberColor}20`, color: memberColor }}
          >
            <Pill className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold truncate">{brandName}</h3>
              <ChevronRight className="w-5 h-5 text-muted shrink-0" />
            </div>
            {genericName && genericName.toLowerCase() !== brandName.toLowerCase() && (
              <p className="text-sm text-muted">{genericName}</p>
            )}
            <p className="mt-2 text-base text-fg/80">{dosageRaw}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="info">For {memberName}</Badge>
              {fdaVerified && <Badge variant="ok">FDA verified</Badge>}
              {hasWarning && <Badge variant="danger">Warning</Badge>}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
