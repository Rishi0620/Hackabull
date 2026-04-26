'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Member } from '@/lib/types'

export default function AddMemberPage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(0)

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Get current member count for index
  useEffect(() => {
    if (household?.householdId) {
      fetch(`/api/household?id=${household.householdId}`)
        .then(res => res.json())
        .then(data => {
          if (data.members) {
            setMemberCount(data.members.length)
          }
        })
        .catch(console.error)
    }
  }, [household?.householdId])

  const handleAddMember = async () => {
    if (!name.trim() || !household) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: household.householdId,
          name: name.trim(),
          age: age ? parseInt(age) : undefined,
          index: memberCount,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add member')
      }

      router.push('/')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
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

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 w-full max-w-[430px] mx-auto px-6 py-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className={cn(
              'w-12 h-12 rounded-xl bg-med-card flex items-center justify-center',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50'
            )}
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-fg" />
          </Link>
          <h1 className="text-2xl font-bold text-fg">Add a household member</h1>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="space-y-6 flex-1">
            {/* Name input */}
            <div>
              <label htmlFor="name" className="block text-lg text-fg font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dad"
                autoFocus
                className={cn(
                  'w-full px-6 py-5 rounded-2xl bg-med-card border border-med-border',
                  'text-xl text-fg placeholder:text-med-muted',
                  'focus:outline-none focus:ring-4 focus:ring-med-accent/50'
                )}
              />
            </div>

            {/* Age input (optional) */}
            <div>
              <label htmlFor="age" className="block text-lg text-fg font-medium mb-2">
                Age <span className="text-med-muted">(optional)</span>
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 72"
                min={0}
                max={150}
                className={cn(
                  'w-full px-6 py-5 rounded-2xl bg-med-card border border-med-border',
                  'text-xl text-fg placeholder:text-med-muted',
                  'focus:outline-none focus:ring-4 focus:ring-med-accent/50'
                )}
              />
            </div>

            <p className="text-med-muted text-lg">
              Their meds will be kept separate from yours.
            </p>

            {error && (
              <p className="text-med-danger text-lg">{error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddMember}
            disabled={!name.trim() || isSubmitting}
            className={cn(
              'w-full py-5 rounded-2xl font-bold text-xl transition-colors',
              'focus-visible:ring-4 focus-visible:ring-med-accent/50',
              'active:scale-[0.98] transition-transform',
              'flex items-center justify-center gap-3',
              name.trim() && !isSubmitting
                ? 'bg-med-accent text-black'
                : 'bg-med-card text-med-muted cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="border-black border-t-transparent" />
                Adding...
              </>
            ) : (
              'Add member'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
