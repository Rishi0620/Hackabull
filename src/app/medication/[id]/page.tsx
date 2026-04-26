'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Volume2, Shield, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { MemberAvatar } from '@/components/member-avatar'
import { WarningBanner } from '@/components/warning-banner'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Medication, MEMBER_COLOR_MAP, MemberColor } from '@/lib/types'

function resolveHex(avatarColor: string): string {
  if (!avatarColor) return '#14B8A6'
  if (avatarColor.startsWith('#')) return avatarColor
  return MEMBER_COLOR_MAP[avatarColor as MemberColor]?.hex ?? '#14B8A6'
}

export default function MedicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { household, loaded } = useHousehold()
  const [medication, setMedication] = useState<Medication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [doseLogged, setDoseLogged] = useState(false)
  const [isLoggingDose, setIsLoggingDose] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Fetch medication
  useEffect(() => {
    if (!params.id) return

    async function fetchMedication() {
      try {
        const res = await fetch(`/api/medication/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          // Our API returns member as a separate top-level field — embed it
          setMedication({
            ...data.medication,
            member: data.member ?? data.medication.member ?? { name: 'Unknown', avatarColor: '#14B8A6' },
          })
        }
      } catch (err) {
        console.error('[v0] Failed to fetch medication:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMedication()
  }, [params.id])

  const handleReadAloud = useCallback(async () => {
    if (!medication || isSpeaking) return

    setIsSpeaking(true)

    try {
      const textToSpeak = `${medication.brandName}. ${medication.plainLanguage.whatItDoes}. ${medication.plainLanguage.howToTake}. ${medication.plainLanguage.watchOutFor}`

      const res = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
          // Fallback to browser TTS
          speakWithBrowserTTS(textToSpeak)
        }
        await audio.play()
      } else {
        // Fallback to browser TTS
        speakWithBrowserTTS(textToSpeak)
      }
    } catch (err) {
      console.error('[v0] Failed to read aloud:', err)
      setIsSpeaking(false)
    }
  }, [medication, isSpeaking])

  const speakWithBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      speechSynthesis.speak(utterance)
    } else {
      setIsSpeaking(false)
    }
  }

  const handleLogDose = useCallback(async () => {
    if (!medication || isLoggingDose || doseLogged) return

    setIsLoggingDose(true)

    try {
      const res = await fetch('/api/dose/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationId: medication._id,
          source: 'manual',
        }),
      })

      if (res.ok) {
        setDoseLogged(true)
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 60, 40])
        }
      }
    } catch (err) {
      console.error('[v0] Failed to log dose:', err)
    } finally {
      setIsLoggingDose(false)
    }
  }, [medication, isLoggingDose, doseLogged])

  const handleDelete = useCallback(async () => {
    if (!medication || isDeleting) return

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/medication/${medication._id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/cabinet')
      }
    } catch (err) {
      console.error('[v0] Failed to delete medication:', err)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [medication, isDeleting, router])

  if (!loaded || isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!medication) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <p className="text-xl text-fg mb-4">Medication not found</p>
        <Link href="/cabinet" className="text-med-accent font-medium">
          Go to Cabinet
        </Link>
      </div>
    )
  }

  const memberHex = resolveHex(medication.member?.avatarColor ?? '')
  const hasDangerWarnings = medication.warnings.some((w) => {
    const text = typeof w === 'string' ? w : (w as any).text ?? ''
    return text.toLowerCase().includes('serious') ||
      text.toLowerCase().includes('danger') ||
      text.toLowerCase().includes('fatal') ||
      (w as any).severity === 'danger'
  })

  return (
    <div className="min-h-screen bg-bg">
      <div className="w-full max-w-[430px] mx-auto px-6 py-8 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/cabinet"
            className={cn(
              'w-12 h-12 rounded-xl bg-med-card flex items-center justify-center',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50'
            )}
            aria-label="Go back to cabinet"
          >
            <ArrowLeft className="w-6 h-6 text-fg" />
          </Link>

          <button
            type="button"
            onClick={handleReadAloud}
            disabled={isSpeaking}
            className={cn(
              'w-12 h-12 rounded-xl bg-med-card flex items-center justify-center',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50',
              isSpeaking && 'bg-med-accent'
            )}
            aria-label={isSpeaking ? 'Speaking...' : 'Read aloud'}
          >
            <Volume2 className={cn('w-6 h-6', isSpeaking ? 'text-black' : 'text-fg')} />
          </button>
        </header>

        {/* Drug name */}
        <section className="mb-6">
          <h1 className="text-4xl font-bold text-fg mb-1">{medication.brandName}</h1>
          {medication.genericName && (
            <p className="text-xl text-med-muted">{medication.genericName}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-base font-medium"
              style={{ backgroundColor: `${memberHex}20`, color: memberHex }}
            >
              <MemberAvatar
                name={medication.member.name}
                color={medication.member.avatarColor}
                size="sm"
              />
              For {medication.member.name}
            </span>
            {medication.fdaVerified && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-med-ok/15 text-med-ok text-base font-medium">
                <Shield className="w-4 h-4" aria-hidden="true" />
                FDA verified
              </span>
            )}
          </div>
        </section>

        {/* Warning banners */}
        {hasDangerWarnings && (
          <div className="mb-6">
            <WarningBanner
              severity="danger"
              title="Important Warning"
              message={
                medication.warnings.find(
                  (w) =>
                    w.toLowerCase().includes('serious') ||
                    w.toLowerCase().includes('danger')
                ) || medication.warnings[0]
              }
            />
          </div>
        )}

        {/* Info cards */}
        <div className="space-y-4">
          {/* Dosage */}
          <div className="bg-med-card rounded-2xl p-5">
            <p className="text-sm text-med-muted uppercase tracking-wide mb-2">Dosage</p>
            <p className="text-xl text-fg">{medication.dosage.raw}</p>
          </div>

          {/* What it does */}
          <div className="bg-med-card rounded-2xl p-5">
            <p className="text-sm text-med-muted uppercase tracking-wide mb-2">What it does</p>
            <p className="text-xl text-fg">{medication.plainLanguage.whatItDoes}</p>
          </div>

          {/* How to take it */}
          <div className="bg-med-card rounded-2xl p-5">
            <p className="text-sm text-med-muted uppercase tracking-wide mb-2">How to take it</p>
            <p className="text-xl text-fg">{medication.plainLanguage.howToTake}</p>
          </div>

          {/* Watch out for */}
          <div className="bg-med-card rounded-2xl p-5">
            <p className="text-sm text-med-muted uppercase tracking-wide mb-2">Watch out for</p>
            <p className="text-xl text-fg">{medication.plainLanguage.watchOutFor}</p>
          </div>

          {/* Active ingredients */}
          {medication.activeIngredients && medication.activeIngredients.length > 0 && (
            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">
                Active ingredients
              </p>
              <ul className="space-y-2">
                {medication.activeIngredients.map((ingredient, i) => (
                  <li key={i} className="text-xl text-fg">
                    {ingredient.name} — {ingredient.strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {medication.warnings.length > 0 && (
            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">Warnings</p>
              <ul className="space-y-2 list-disc list-inside">
                {medication.warnings.map((warning, i) => (
                  <li key={i} className="text-lg text-fg">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prescription info — our API returns these as flat fields */}
          {((medication as any).rxNumber || (medication as any).prescriber || (medication as any).pharmacy || medication.rxInfo) && (
            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">
                Prescription info
              </p>
              {((medication as any).rxNumber || medication.rxInfo?.rxNumber) && (
                <p className="text-lg text-fg">Rx#: {(medication as any).rxNumber || medication.rxInfo?.rxNumber}</p>
              )}
              {((medication as any).prescriber || medication.rxInfo?.prescriber) && (
                <p className="text-lg text-fg">Prescriber: {(medication as any).prescriber || medication.rxInfo?.prescriber}</p>
              )}
              {((medication as any).pharmacy || medication.rxInfo?.pharmacy) && (
                <p className="text-lg text-fg">Pharmacy: {(medication as any).pharmacy || medication.rxInfo?.pharmacy}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom fixed bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-sm border-t border-med-border p-4">
        <div className="w-full max-w-[430px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogDose}
            disabled={isLoggingDose || doseLogged}
            className={cn(
              'flex-1 py-5 rounded-2xl font-bold text-xl transition-colors',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50',
              'flex items-center justify-center gap-2',
              doseLogged
                ? 'bg-med-ok text-white'
                : 'bg-med-accent text-black active:scale-[0.98]'
            )}
          >
            {isLoggingDose ? (
              <LoadingSpinner size="sm" className="border-black border-t-transparent" />
            ) : doseLogged ? (
              <>
                <Check className="w-6 h-6" aria-hidden="true" />
                Logged
              </>
            ) : (
              'I just took this'
            )}
          </button>

          {/* Delete button */}
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={cn(
                  'px-4 py-5 rounded-2xl bg-med-card text-fg font-semibold',
                  'focus-visible:ring-4 focus-visible:ring-med-accent/50'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  'px-4 py-5 rounded-2xl bg-med-danger text-white font-semibold',
                  'focus-visible:ring-4 focus-visible:ring-med-danger/50',
                  'flex items-center justify-center'
                )}
              >
                {isDeleting ? <LoadingSpinner size="sm" /> : 'Delete'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className={cn(
                'w-14 h-14 rounded-2xl bg-med-card flex items-center justify-center',
                'focus-visible:ring-4 focus-visible:ring-med-danger/50'
              )}
              aria-label="Delete medication"
            >
              <Trash2 className="w-6 h-6 text-med-danger" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
