'use client'

import { useState, useCallback } from 'react'
import { Check, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DoseEntry = {
  doseId: string | null
  medicationId: string
  medication: string
  member: string
  takenAt: string | null
  scheduledAt: string
}

type Props = {
  doses: DoseEntry[]
  onDoseLogged: (medicationId: string) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getStatus(dose: DoseEntry): 'taken' | 'overdue' | 'upcoming' {
  if (dose.takenAt) return 'taken'
  return new Date(dose.scheduledAt) < new Date() ? 'overdue' : 'upcoming'
}

export function TodaysDoses({ doses, onDoseLogged }: Props) {
  const [logging, setLogging] = useState<Set<string>>(new Set())
  const [localTaken, setLocalTaken] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_COUNT = 5

  const markTaken = useCallback(async (dose: DoseEntry) => {
    const key = dose.medicationId
    if (logging.has(key) || localTaken.has(key)) return
    setLogging((s) => new Set(s).add(key))
    try {
      await fetch('/api/dose/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId: dose.medicationId, source: 'manual' }),
      })
      setLocalTaken((s) => new Set(s).add(key))
      onDoseLogged(dose.medicationId)
      if (navigator.vibrate) navigator.vibrate([40, 60, 40])
    } finally {
      setLogging((s) => { const n = new Set(s); n.delete(key); return n })
    }
  }, [logging, localTaken, onDoseLogged])

  if (doses.length === 0) return null

  const enriched = doses.map((d) => ({
    ...d,
    status: localTaken.has(d.medicationId) ? 'taken' as const : getStatus(d),
  }))

  const takenCount = enriched.filter((d) => d.status === 'taken').length
  const totalCount = enriched.length
  const overdueCount = enriched.filter((d) => d.status === 'overdue').length
  const progress = totalCount > 0 ? takenCount / totalCount : 0

  const overdue = enriched.filter((d) => d.status === 'overdue')
  const upcoming = enriched.filter((d) => d.status === 'upcoming')
  const taken = enriched.filter((d) => d.status === 'taken')

  return (
    <section className="mb-8" aria-label="Today's doses">
      <div className="bg-med-card rounded-2xl border border-med-border overflow-hidden">
        {/* Header with progress */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-fg">Today's doses</h2>
            <span className="text-med-muted text-base font-medium">
              {takenCount} of {totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-med-border rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress === 1
                  ? 'bg-med-ok'
                  : overdueCount > 0
                  ? 'bg-gradient-to-r from-med-ok to-med-caution'
                  : 'bg-med-accent'
              )}
              style={{ width: `${progress * 100}%` }}
              role="progressbar"
              aria-valuenow={takenCount}
              aria-valuemax={totalCount}
            />
          </div>

          {/* Summary chips */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {takenCount > 0 && (
              <span className="text-sm px-2.5 py-1 rounded-full font-medium bg-med-ok/15 text-med-ok">
                {takenCount} taken
              </span>
            )}
            {upcoming.length > 0 && (
              <span className="text-sm px-2.5 py-1 rounded-full font-medium bg-med-accent/15 text-med-accent">
                {upcoming.length} upcoming
              </span>
            )}
            {overdueCount > 0 && (
              <span className="text-sm px-2.5 py-1 rounded-full font-medium bg-med-danger/15 text-med-danger">
                {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-med-border" />

        {/* Dose list — ordered by urgency */}
        {(() => {
          const ordered = [
            ...overdue.map((d) => ({ dose: d, status: 'overdue' as const })),
            ...upcoming.map((d) => ({ dose: d, status: 'upcoming' as const })),
            ...taken.map((d) => ({ dose: d, status: 'taken' as const })),
          ]
          const visible = expanded ? ordered : ordered.slice(0, PREVIEW_COUNT)
          const hiddenCount = ordered.length - PREVIEW_COUNT

          return (
            <>
              <div className="divide-y divide-med-border">
                {visible.map(({ dose, status }) => (
                  <DoseRow
                    key={`${dose.medicationId}-${dose.scheduledAt}`}
                    dose={dose}
                    status={status}
                    isLogging={logging.has(dose.medicationId)}
                    onMark={() => status !== 'taken' ? markTaken(dose) : undefined}
                  />
                ))}
              </div>

              {ordered.length > PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3.5 text-base font-medium',
                    'text-med-muted hover:text-fg transition-colors',
                    'border-t border-med-border',
                    'focus-visible:ring-4 focus-visible:ring-med-accent/50'
                  )}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      {hiddenCount} more dose{hiddenCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </>
          )
        })()}
      </div>
    </section>
  )
}

function DoseRow({
  dose,
  status,
  isLogging,
  onMark,
}: {
  dose: DoseEntry
  status: 'taken' | 'overdue' | 'upcoming'
  isLogging: boolean
  onMark: () => void
}) {
  const Icon = status === 'taken' ? Check : status === 'overdue' ? AlertTriangle : Clock

  const iconStyle = {
    taken: 'text-med-ok bg-med-ok/15',
    overdue: 'text-med-danger bg-med-danger/15',
    upcoming: 'text-med-accent bg-med-accent/15',
  }[status]

  const timeLabel =
    status === 'taken'
      ? `Taken ${formatTime(dose.takenAt!)}`
      : status === 'overdue'
      ? `Was due ${formatTime(dose.scheduledAt)}`
      : `Due ${formatTime(dose.scheduledAt)}`

  return (
    <div className={cn('flex items-center gap-4 px-5 py-4', status === 'overdue' && 'bg-med-danger/5')}>
      {/* Status icon */}
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', iconStyle)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-fg leading-tight truncate">{dose.medication}</p>
        <p className="text-sm text-med-muted">
          {dose.member} · {timeLabel}
        </p>
      </div>

      {/* Action */}
      {status !== 'taken' && (
        <button
          type="button"
          onClick={onMark}
          disabled={isLogging}
          aria-label={`Mark ${dose.medication} as taken`}
          className={cn(
            'shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95',
            'focus-visible:ring-4 focus-visible:ring-med-accent/50',
            status === 'overdue'
              ? 'bg-med-danger text-white hover:bg-med-danger/90'
              : 'bg-med-accent text-black hover:bg-med-accent/90',
            isLogging && 'opacity-50 pointer-events-none'
          )}
        >
          {isLogging ? '…' : 'Taken'}
        </button>
      )}
    </div>
  )
}
