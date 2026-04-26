'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Volume2, Shield, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { MemberAvatar } from '@/components/member-avatar'
import { WarningBanner } from '@/components/warning-banner'
import { CameraCapture } from '@/components/camera-capture'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Member, ScanResult, MEMBER_COLOR_MAP, MemberColor } from '@/lib/types'

function resolveHex(avatarColor: string): string {
  if (!avatarColor) return '#14B8A6'
  if (avatarColor.startsWith('#')) return avatarColor
  return MEMBER_COLOR_MAP[avatarColor as MemberColor]?.hex ?? '#14B8A6'
}

type Step = 'member' | 'camera' | 'loading' | 'result'

export default function ScanBottlePage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [step, setStep] = useState<Step>('member')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Fetch members
  useEffect(() => {
    if (!household?.householdId) return

    async function fetchMembers() {
      try {
        const res = await fetch(`/api/household?id=${household!.householdId}`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members || [])

          // If only one member, skip member selection
          if (data.members?.length === 1) {
            setSelectedMember(data.members[0])
            setStep('camera')
          }
        }
      } catch (err) {
        console.error('[v0] Failed to fetch members:', err)
      }
    }

    fetchMembers()
  }, [household?.householdId])

  const handleCapture = useCallback(
    async (imageBase64: string) => {
      if (!household || !selectedMember) return

      setStep('loading')
      setError(null)

      try {
        const res = await fetch('/api/scan/bottle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageBase64,
            householdId: household.householdId,
            memberId: selectedMember._id,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setScanResult(data)
          setStep('result')
        } else {
          throw new Error('Scan failed')
        }
      } catch (err) {
        console.error('[v0] Scan failed:', err)
        setError('Could not read the label. Please try again with better lighting.')
        setStep('camera')
      }
    },
    [household, selectedMember]
  )

  const handleReadAloud = useCallback(async () => {
    if (!scanResult || isSpeaking) return

    setIsSpeaking(true)

    try {
      const textToSpeak = `${scanResult.extracted.brandName}. ${scanResult.plainLanguage.whatItDoes}. ${scanResult.plainLanguage.howToTake}. ${scanResult.plainLanguage.watchOutFor}`

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
          speakWithBrowserTTS(textToSpeak)
        }
        audio.play().catch(() => {
          setIsSpeaking(false)
          URL.revokeObjectURL(url)
          speakWithBrowserTTS(textToSpeak)
        })
      } else {
        speakWithBrowserTTS(textToSpeak)
      }
    } catch (err) {
      console.error('[v0] Failed to read aloud:', err)
      setIsSpeaking(false)
    }
  }, [scanResult, isSpeaking])

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

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!household) return null

  // Step 1: Member picker
  if (step === 'member' && members.length > 1) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="w-full max-w-[430px] mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-fg mb-8">Who is this for?</h1>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {members.map((member) => {
              const isSelected = selectedMember?._id === member._id
              const hex = resolveHex(member.avatarColor)

              return (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className={cn(
                    'p-5 rounded-2xl flex flex-col items-center gap-3 transition-all',
                    'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                    'bg-med-card border border-med-border'
                  )}
                  style={isSelected ? { outline: `2px solid ${hex}`, outlineOffset: '2px' } : {}}
                >
                  <MemberAvatar name={member.name} color={member.avatarColor} size="lg" />
                  <span className="text-xl font-medium text-fg">{member.name}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setStep('camera')}
            disabled={!selectedMember}
            className={cn(
              'w-full py-5 rounded-2xl font-bold text-xl transition-colors',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50',
              selectedMember
                ? 'bg-med-accent text-black active:scale-[0.98]'
                : 'bg-med-card text-med-muted cursor-not-allowed'
            )}
          >
            Start scanning
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Camera
  if (step === 'camera') {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-4 right-4 z-[60]">
            <WarningBanner severity="caution" title="Scan failed" message={error} />
          </div>
        )}
        <CameraCapture
          prompt="Hold the label steady and in good light"
          onCapture={handleCapture}
          onCancel={() => router.push('/')}
        />
      </>
    )
  }

  // Step 3: Loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" className="mb-6" />
        <p className="text-2xl font-bold text-fg mb-2">Reading the label...</p>
        <p className="text-lg text-med-muted">Verifying against the FDA database.</p>
      </div>
    )
  }

  // Step 4: Result
  if (step === 'result' && scanResult && selectedMember) {
    const memberHex = resolveHex(selectedMember.avatarColor)
    const hasInteractions = scanResult.interactions.length > 0
    const hasFdaWarnings = scanResult.fdaWarnings.length > 0

    return (
      <div className="min-h-screen bg-bg">
        <div className="w-full max-w-[430px] mx-auto px-6 py-8 pb-32">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-fg">Scan result</h1>
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

          {/* Interaction warnings */}
          {hasInteractions && (
            <div className="space-y-3 mb-6">
              {scanResult.interactions.map((interaction, i) => (
                <WarningBanner
                  key={i}
                  severity={interaction.severity}
                  title={interaction.title}
                  message={interaction.message}
                />
              ))}
            </div>
          )}

          {/* Drug name card */}
          <div className="bg-med-card rounded-2xl p-5 mb-6">
            <p className="text-4xl font-bold text-fg mb-1">
              {scanResult.extracted.brandName}
            </p>
            {scanResult.extracted.genericName && (
              <p className="text-xl text-med-muted mb-4">
                {scanResult.extracted.genericName}
              </p>
            )}

            {/* Member and badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-base font-medium"
                style={{ backgroundColor: `${memberHex}20`, color: memberHex }}
              >
                <MemberAvatar
                  name={selectedMember.name}
                  color={selectedMember.avatarColor}
                  size="sm"
                />
                For {selectedMember.name}
              </span>
              {scanResult.fdaVerified && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-med-ok/15 text-med-ok text-base font-medium">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  FDA verified
                </span>
              )}
            </div>

            {/* Read aloud button */}
            <button
              type="button"
              onClick={handleReadAloud}
              disabled={isSpeaking}
              className={cn(
                'w-full py-4 rounded-xl font-semibold text-lg transition-colors',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'flex items-center justify-center gap-2',
                isSpeaking
                  ? 'bg-med-accent text-black'
                  : 'bg-med-border text-fg'
              )}
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" />
              {isSpeaking ? 'Speaking...' : 'Read aloud'}
            </button>
          </div>

          {/* Info cards */}
          <div className="space-y-4">
            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">
                What it does
              </p>
              <p className="text-xl text-fg">{scanResult.plainLanguage.whatItDoes}</p>
            </div>

            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">
                How to take it
              </p>
              <p className="text-xl text-fg">{scanResult.plainLanguage.howToTake}</p>
            </div>

            <div className="bg-med-card rounded-2xl p-5">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">
                Watch out for
              </p>
              <p className="text-xl text-fg">{scanResult.plainLanguage.watchOutFor}</p>
            </div>

            {/* FDA Warnings */}
            {hasFdaWarnings && (
              <div className="bg-med-card rounded-2xl p-5">
                <p className="text-sm text-med-muted uppercase tracking-wide mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-med-caution" />
                  FDA Warnings
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  {scanResult.fdaWarnings.map((warning, i) => (
                    <li key={i} className="text-lg text-fg">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-sm border-t border-med-border p-4">
          <div className="w-full max-w-[430px] mx-auto flex gap-3">
            <Link
              href={`/medication/${scanResult.medicationId}`}
              className={cn(
                'flex-1 py-5 rounded-2xl bg-med-accent text-black font-bold text-xl text-center',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              View details
            </Link>
            <button
              type="button"
              onClick={() => {
                setScanResult(null)
                setError(null)
                setStep('camera')
              }}
              className={cn(
                'flex-1 py-5 rounded-2xl bg-med-card text-fg font-bold text-xl',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              Scan another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default: show loading
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
