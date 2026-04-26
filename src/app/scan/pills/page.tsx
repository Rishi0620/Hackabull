'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HelpCircle, Shield, Check, ChevronRight, PlusCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { WarningBanner } from '@/components/warning-banner'
import { CameraCapture } from '@/components/camera-capture'
import { LoadingSpinner } from '@/components/loading-spinner'
import { MemberAvatar } from '@/components/member-avatar'
import { MEMBER_COLOR_MAP, MemberColor } from '@/lib/types'

type Step = 'camera' | 'loading' | 'result'

type ApiPill = {
  shape: string
  color: string
  imprint?: string | null
  match: { medicationName: string | null; confidence: number }
  member?: string
  dosageNote?: string
  medicationId?: string
  fdaInfo?: { whatItDoes: string; warnings: string[] } | null
  inCabinet?: boolean
  dbSource?: string | null
}

type ApiInteraction = {
  a: string; b: string; severity: string; plainLanguage: string; summary: string
}

type Member = { _id: string; name: string; avatarColor: string }

function resolveHex(avatarColor: string): string {
  if (!avatarColor) return '#14B8A6'
  if (avatarColor.startsWith('#')) return avatarColor
  return MEMBER_COLOR_MAP[avatarColor as MemberColor]?.hex ?? '#14B8A6'
}

const COLOR_SWATCH: Record<string, string> = {
  white: '#F1F5F9', yellow: '#EAB308', blue: '#3B82F6', red: '#DC2626',
  pink: '#EC4899', green: '#22C55E', orange: '#F97316', purple: '#8B5CF6',
  amber: '#F59E0B', gray: '#6B7280', brown: '#92400E', black: '#111827',
}

function pillColor(color: string) {
  const k = color?.toLowerCase().split(/\s|\//)[0] ?? ''
  return COLOR_SWATCH[k] || '#9CA3AF'
}

export default function ScanPillsPage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [step, setStep] = useState<Step>('camera')
  const [pills, setPills] = useState<ApiPill[]>([])
  const [interactions, setInteractions] = useState<ApiInteraction[]>([])
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add to cabinet flow
  const [addingName, setAddingName] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [adding, setAdding] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addResult, setAddResult] = useState<{ name: string; whatItDoes: string } | null>(null)

  useEffect(() => {
    if (loaded && !household) router.replace('/onboarding')
  }, [loaded, household, router])

  useEffect(() => {
    if (!household?.householdId) return
    fetch(`/api/household?id=${household.householdId}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
  }, [household?.householdId])

  const handleCapture = useCallback(async (imageBase64: string) => {
    if (!household) return
    setCapturedImage(imageBase64)
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/scan/pills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, householdId: household.householdId }),
      })
      if (res.ok) {
        const data = await res.json()
        setPills(data.pills || [])
        setInteractions(data.interactions || [])
        setStep('result')
      } else throw new Error('Scan failed')
    } catch {
      setError('Could not identify pills. Try again with better lighting.')
      setStep('camera')
    }
  }, [household])

  async function addToCabinet(name: string, memberId: string) {
    if (!household) return
    setAdding(true)
    try {
      const res = await fetch('/api/scan/from-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, householdId: household.householdId, memberId }),
      })
      if (res.ok) {
        const data = await res.json()
        setAddedIds((s) => new Set(s).add(name))
        setAddResult({ name, whatItDoes: data.plainLanguage?.whatItDoes || '' })
        setAddingName(null)
        if (navigator.vibrate) navigator.vibrate([40, 60, 40])
      }
    } finally {
      setAdding(false)
    }
  }

  if (!loaded) return <div className="min-h-screen bg-bg flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!household) return null

  if (step === 'camera') {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-4 right-4 z-[60]">
            <WarningBanner severity="caution" title="Scan failed" message={error} />
          </div>
        )}
        <CameraCapture
          prompt="Pour pills into your palm and hold steady"
          onCapture={handleCapture}
          onCancel={() => router.push('/')}
        />
      </>
    )
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" className="mb-6" />
        <p className="text-2xl font-bold text-fg mb-2">Looking at your pills...</p>
        <p className="text-lg text-med-muted">Reading shapes, colors, and imprints.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="w-full max-w-[430px] mx-auto px-6 py-8 pb-32">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-fg">Pill identification</h1>
          <Link href="/" className="px-4 py-2 rounded-xl text-med-muted font-medium focus-visible:ring-4 focus-visible:ring-med-accent/50">
            Done
          </Link>
        </header>

        {capturedImage && (
          <img src={capturedImage} alt="Captured pills" className="w-full rounded-2xl object-cover aspect-video mb-6" />
        )}

        {/* Add result banner */}
        {addResult && (
          <div className="mb-4 p-4 rounded-2xl bg-med-ok/10 border border-med-ok flex items-start gap-3">
            <Check className="w-5 h-5 text-med-ok shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-med-ok">{addResult.name} added to cabinet</p>
              {addResult.whatItDoes && <p className="text-sm text-fg/80 mt-0.5">{addResult.whatItDoes}</p>}
            </div>
          </div>
        )}

        {interactions.length > 0 && (
          <div className="space-y-3 mb-6">
            {interactions.map((ix, i) => (
              <WarningBanner
                key={i}
                severity={ix.severity as any}
                title={`${ix.a} + ${ix.b}`}
                message={ix.plainLanguage}
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {pills.length === 0 ? (
            <div className="bg-med-card rounded-2xl p-8 text-center">
              <HelpCircle className="w-12 h-12 text-med-muted mx-auto mb-4" />
              <p className="text-xl font-bold text-fg mb-2">No pills detected</p>
              <p className="text-med-muted text-lg">Try again with better lighting.</p>
            </div>
          ) : (
            pills.map((pill, i) => {
              const name = pill.match.medicationName
              const confidence = Math.round(pill.match.confidence * 100)
              const cabinetMatch = pill.inCabinet && pill.match.confidence >= 0.75
              const nameKnown = !!name && !pill.inCabinet
              const fdaMatch = nameKnown && !!pill.fdaInfo
              const nameOnly = nameKnown && !pill.fdaInfo
              const unknown = !cabinetMatch && !nameKnown
              const alreadyAdded = name ? addedIds.has(name) : false

              return (
                <div key={i} className="bg-med-card rounded-2xl p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full shrink-0 border-2 border-white/10"
                      style={{ backgroundColor: pillColor(pill.color) }}
                    />
                    <div className="flex-1 min-w-0">

                      {cabinetMatch && (
                        <>
                          <Link href={`/medication/${pill.medicationId}`} className="flex items-center gap-2 group">
                            <p className="text-xl font-bold text-fg">{name}</p>
                            <ChevronRight className="w-5 h-5 text-med-muted group-hover:text-fg transition-colors" />
                          </Link>
                          <div className="flex gap-2 mt-1">
                            <span className="text-sm px-2 py-0.5 rounded-full bg-med-ok/15 text-med-ok flex items-center gap-1">
                              <Check className="w-3 h-3" /> In cabinet
                            </span>
                            {pill.member && <span className="text-med-muted text-sm">{pill.member}</span>}
                          </div>
                          {pill.dosageNote && <p className="text-med-muted text-base mt-1">{pill.dosageNote}</p>}
                        </>
                      )}

                      {fdaMatch && (
                        <>
                          <p className="text-xl font-bold text-fg">{name}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-sm px-2 py-0.5 rounded-full bg-med-accent/15 text-med-accent flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {pill.dbSource?.includes('RxImage') ? 'NLM RxImage' : 'FDA identified'}
                            </span>
                            <span className="text-med-muted text-sm">Not in cabinet</span>
                          </div>
                          <p className="text-med-muted text-base mt-2">{pill.fdaInfo!.whatItDoes}</p>
                          {pill.fdaInfo!.warnings[0] && (
                            <p className="text-med-caution text-sm mt-1">⚠ {pill.fdaInfo!.warnings[0]}</p>
                          )}
                        </>
                      )}

                      {nameOnly && (
                        <>
                          <p className="text-xl font-bold text-fg">{name}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-sm px-2 py-0.5 rounded-full bg-med-caution/15 text-med-caution">
                              Not in cabinet
                            </span>
                            {pill.imprint && <span className="text-med-muted text-sm">Imprint: "{pill.imprint}"</span>}
                          </div>
                        </>
                      )}

                      {unknown && (
                        <>
                          <p className="text-xl font-bold text-fg flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-med-muted" /> Unidentified pill
                          </p>
                          <p className="text-med-muted text-base mt-1">
                            {pill.color} {pill.shape}
                            {pill.imprint && ` · imprint "${pill.imprint}"`}
                          </p>
                          <p className="text-med-accent text-base mt-2">Scan the bottle for details</p>
                        </>
                      )}

                      {/* Add to cabinet button for non-cabinet pills with a known name */}
                      {nameKnown && name && !alreadyAdded && (
                        <button
                          onClick={() => setAddingName(name)}
                          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-med-accent hover:opacity-80 active:scale-95 transition-all"
                        >
                          <PlusCircle className="w-4 h-4" /> Add to cabinet
                        </button>
                      )}
                      {alreadyAdded && (
                        <p className="mt-3 text-sm text-med-ok flex items-center gap-1">
                          <Check className="w-4 h-4" /> Added to cabinet
                        </p>
                      )}
                    </div>

                    <span className="text-med-muted text-sm shrink-0">{confidence}%</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-sm border-t border-med-border p-4">
        <div className="w-full max-w-[430px] mx-auto">
          <button
            type="button"
            onClick={() => { setPills([]); setInteractions([]); setCapturedImage(null); setError(null); setAddResult(null); setStep('camera') }}
            className="w-full py-5 rounded-2xl bg-med-accent text-black font-bold text-xl focus-visible:ring-4 focus-visible:ring-med-accent/50"
          >
            Scan more pills
          </button>
        </div>
      </div>

      {/* Member picker overlay for "Add to cabinet" */}
      {addingName && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-bg rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-fg">Add {addingName}</h2>
                <p className="text-med-muted mt-1">Who is this for?</p>
              </div>
              <button onClick={() => setAddingName(null)} className="p-2 rounded-xl hover:bg-med-card" aria-label="Close">
                <X className="w-6 h-6 text-med-muted" />
              </button>
            </div>

            {adding ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <LoadingSpinner />
                <p className="text-med-muted">Looking up {addingName} and adding to cabinet…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {members.map((m) => {
                  const hex = resolveHex(m.avatarColor)
                  return (
                    <button
                      key={m._id}
                      onClick={() => addToCabinet(addingName, m._id)}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-med-card border border-med-border active:scale-[0.97] transition-transform"
                    >
                      <MemberAvatar name={m.name} color={m.avatarColor} size="lg" />
                      <span className="text-lg font-semibold text-fg">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
