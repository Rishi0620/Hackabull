'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { LoadingSpinner } from '@/components/loading-spinner'

type Step = 'welcome' | 'household' | 'member'

const features = [
  'Scan a bottle, get plain-language instructions',
  'Catch dangerous drug interactions automatically',
  'Identify pills by photo',
  'Voice answers — no typing needed',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { save } = useHousehold()
  const [step, setStep] = useState<Step>('welcome')
  const [householdName, setHouseholdName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFinishSetup = async () => {
    if (!householdName.trim() || !memberName.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: householdName.trim(),
          firstMemberName: memberName.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create household')
      }

      const data = await response.json()

      // Save to localStorage
      save({
        householdId: data.householdId,
        code: data.code,
        name: data.name,
        activeMemberId: data.activeMemberId,
      })

      router.replace('/')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 w-full max-w-[430px] mx-auto px-6 py-8 flex flex-col">
        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col">
            {/* Logo */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-3xl bg-med-accent flex items-center justify-center mb-8">
                <Pill className="w-12 h-12 text-black" aria-hidden="true" />
              </div>

              <h1 className="text-4xl font-bold text-fg mb-3">MedSNAP</h1>
              <p className="text-xl text-med-muted text-center mb-10">
                Your medicine cabinet, but smarter.
              </p>

              {/* Features */}
              <ul className="w-full space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="text-med-accent text-xl font-bold mt-0.5">
                      <Check className="w-6 h-6" aria-hidden="true" />
                    </span>
                    <span className="text-lg text-fg">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setStep('household')}
              className={cn(
                'w-full py-5 rounded-2xl bg-med-accent text-black font-bold text-xl',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'active:scale-[0.98] transition-transform'
              )}
            >
              Get started
            </button>
          </div>
        )}

        {/* Step 2: Name your household */}
        {step === 'household' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-fg mb-3">
                What should I call your home?
              </h1>
              <p className="text-lg text-med-muted mb-8">
                {"Could be your family name, or just \"My place.\""}
              </p>

              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., The Smiths"
                autoFocus
                className={cn(
                  'w-full px-6 py-5 rounded-2xl bg-med-card border border-med-border',
                  'text-xl text-fg placeholder:text-med-muted',
                  'focus:outline-none focus:ring-4 focus:ring-med-accent/50'
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => setStep('member')}
              disabled={!householdName.trim()}
              className={cn(
                'w-full py-5 rounded-2xl font-bold text-xl transition-colors',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'active:scale-[0.98] transition-transform',
                householdName.trim()
                  ? 'bg-med-accent text-black'
                  : 'bg-med-card text-med-muted cursor-not-allowed'
              )}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Add yourself */}
        {step === 'member' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-fg mb-3">
                {"Who's the first member?"}
              </h1>
              <p className="text-lg text-med-muted mb-8">
                You can add more family members later.
              </p>

              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="e.g., Mom"
                autoFocus
                className={cn(
                  'w-full px-6 py-5 rounded-2xl bg-med-card border border-med-border',
                  'text-xl text-fg placeholder:text-med-muted',
                  'focus:outline-none focus:ring-4 focus:ring-med-accent/50'
                )}
              />

              {error && (
                <p className="mt-4 text-med-danger text-lg">{error}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinishSetup}
              disabled={!memberName.trim() || isSubmitting}
              className={cn(
                'w-full py-5 rounded-2xl font-bold text-xl transition-colors',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'active:scale-[0.98] transition-transform',
                'flex items-center justify-center gap-3',
                memberName.trim() && !isSubmitting
                  ? 'bg-med-accent text-black'
                  : 'bg-med-card text-med-muted cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="border-black border-t-transparent" />
                  Setting up...
                </>
              ) : (
                'Finish setup'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
