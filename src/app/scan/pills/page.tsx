'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HelpCircle, Shield, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { WarningBanner } from '@/components/warning-banner'
import { CameraCapture } from '@/components/camera-capture'
import { LoadingSpinner } from '@/components/loading-spinner'
import { PillIdentification, Interaction } from '@/lib/types'

type Step = 'camera' | 'loading' | 'result'

interface ScanPillsResult {
  pills: PillIdentification[]
  interactions: Interaction[]
  imageUrl?: string
}

export default function ScanPillsPage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [step, setStep] = useState<Step>('camera')
  const [result, setResult] = useState<ScanPillsResult | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  const handleCapture = useCallback(
    async (imageBase64: string) => {
      if (!household) return

      setCapturedImage(imageBase64)
      setStep('loading')
      setError(null)

      try {
        const res = await fetch('/api/scan/pills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageBase64,
            householdId: household.householdId,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setResult(data)
          setStep('result')
        } else {
          throw new Error('Scan failed')
        }
      } catch (err) {
        console.error('[v0] Pill scan failed:', err)
        setError('Could not identify pills. Please try again with better lighting.')
        setStep('camera')
      }
    },
    [household]
  )

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!household) return null

  // Step 1: Camera
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

  // Step 2: Loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" className="mb-6" />
        <p className="text-2xl font-bold text-fg mb-2">Looking at your pills...</p>
        <p className="text-lg text-med-muted">Identifying shapes, colors, and imprints.</p>
      </div>
    )
  }

  // Step 3: Result
  if (step === 'result' && result) {
    const hasInteractions = result.interactions.length > 0

    return (
      <div className="min-h-screen bg-bg">
        <div className="w-full max-w-[430px] mx-auto px-6 py-8 pb-24">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-fg">Pill identification</h1>
            <Link
              href="/"
              className={cn(
                'px-4 py-2 rounded-xl text-med-muted font-medium',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              Done
            </Link>
          </header>

          {/* Captured image */}
          {capturedImage && (
            <div className="mb-6">
              <img
                src={capturedImage}
                alt="Captured pills"
                className="w-full rounded-2xl object-cover aspect-video"
              />
            </div>
          )}

          {/* Interaction warnings */}
          {hasInteractions && (
            <div className="space-y-3 mb-6">
              {result.interactions.map((interaction, i) => (
                <WarningBanner
                  key={i}
                  severity={interaction.severity}
                  title={interaction.title}
                  message={interaction.message}
                />
              ))}
            </div>
          )}

          {/* Pills list */}
          <div className="space-y-3">
            {result.pills.length === 0 ? (
              <div className="bg-med-card rounded-2xl p-8 text-center">
                <HelpCircle className="w-12 h-12 text-med-muted mx-auto mb-4" />
                <p className="text-xl font-bold text-fg mb-2">No pills detected</p>
                <p className="text-med-muted text-lg">
                  Try again with better lighting or a clearer view of the pills.
                </p>
              </div>
            ) : (
              result.pills.map((pill, i) => (
                <PillCard key={i} pill={pill} />
              ))
            )}
          </div>
        </div>

        {/* Bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-sm border-t border-med-border p-4">
          <div className="w-full max-w-[430px] mx-auto">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setCapturedImage(null)
                setError(null)
                setStep('camera')
              }}
              className={cn(
                'w-full py-5 rounded-2xl bg-med-accent text-black font-bold text-xl',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              Scan more pills
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function PillCard({ pill }: { pill: PillIdentification }) {
  // Matched to cabinet
  if (pill.matched && pill.inCabinet && pill.medicationId) {
    return (
      <Link
        href={`/medication/${pill.medicationId}`}
        className={cn(
          'block bg-med-card rounded-2xl p-4',
          'focus-visible:ring-4 focus-visible:ring-med-accent/50'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full shrink-0"
            style={{ backgroundColor: pill.color }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-fg">{pill.brandName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm px-2 py-0.5 rounded-full bg-med-ok/15 text-med-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                In cabinet
              </span>
              {pill.memberName && (
                <span className="text-med-muted text-base">{pill.memberName}</span>
              )}
            </div>
            {pill.dosage && (
              <p className="text-med-muted text-base mt-1">{pill.dosage}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-med-muted text-sm">{pill.confidence}%</span>
            <ChevronRight className="w-5 h-5 text-med-muted" />
          </div>
        </div>
      </Link>
    )
  }

  // FDA identified but not in cabinet
  if (pill.fdaIdentified && pill.brandName) {
    return (
      <div className="bg-med-card rounded-2xl p-4">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full shrink-0"
            style={{ backgroundColor: pill.color }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-fg">{pill.brandName}</p>
            {pill.genericName && (
              <p className="text-med-muted text-base">{pill.genericName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm px-2 py-0.5 rounded-full bg-med-accent/15 text-med-accent flex items-center gap-1">
                <Shield className="w-3 h-3" />
                FDA identified
              </span>
              <span className="text-med-muted text-sm">Not in your cabinet</span>
            </div>
            {pill.whatItDoes && (
              <p className="text-med-muted text-base mt-2">{pill.whatItDoes}</p>
            )}
            {pill.warning && (
              <p className="text-med-caution text-base mt-2">{pill.warning}</p>
            )}
          </div>
          <span className="text-med-muted text-sm shrink-0">{pill.confidence}%</span>
        </div>
      </div>
    )
  }

  // Unidentified pill
  return (
    <div className="bg-med-card rounded-2xl p-4">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-med-border"
          aria-hidden="true"
        >
          <HelpCircle className="w-6 h-6 text-med-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-fg">Unidentified pill</p>
          <p className="text-med-muted text-base mt-1">
            {pill.color} {pill.shape}
            {pill.imprint && ` • "${pill.imprint}"`}
          </p>
          <p className="text-med-accent text-base mt-2">
            Scan the bottle for details
          </p>
        </div>
        <span className="text-med-muted text-sm shrink-0">{pill.confidence}%</span>
      </div>
    </div>
  )
}
