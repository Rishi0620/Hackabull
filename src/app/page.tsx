'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, ScanLine, Mic, Pill, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { AppShell } from '@/components/app-shell'
import { MemberAvatar } from '@/components/member-avatar'
import { MedCard } from '@/components/med-card'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ThemeToggle } from '@/components/theme-toggle'
import { Member, Medication } from '@/lib/types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

// Vibrant action card colors
const ACTION_CARDS = [
  {
    href: '/scan/bottle',
    icon: Camera,
    title: 'Scan a bottle',
    subtitle: 'Add a new medication',
    // Vibrant teal
    bgClass: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    iconColor: 'text-white',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  {
    href: '/scan/pills',
    icon: ScanLine,
    title: 'Identify pills',
    subtitle: 'From your hand',
    // Vibrant blue
    bgClass: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconColor: 'text-white',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  {
    href: '/voice',
    icon: Mic,
    title: 'Ask a question',
    subtitle: 'Voice or text',
    // Vibrant violet
    bgClass: 'bg-gradient-to-br from-violet-500 to-purple-600',
    iconColor: 'text-white',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  {
    href: '/cabinet',
    icon: Pill,
    title: 'My cabinet',
    subtitle: null, // Will be dynamic
    // Warm amber
    bgClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
    iconColor: 'text-white',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
]

export default function HomePage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [members, setMembers] = useState<Member[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Fetch household data
  useEffect(() => {
    if (!household?.householdId) return

    async function fetchData() {
      try {
        const hid = household!.householdId
        const [householdRes, medsRes] = await Promise.all([
          fetch(`/api/household?id=${hid}`),
          fetch(`/api/medication?householdId=${hid}`),
        ])

        if (householdRes.ok) {
          const data = await householdRes.json()
          setMembers(data.members || [])
        }

        if (medsRes.ok) {
          const data = await medsRes.json()
          setMedications(data.medications || [])
        }
      } catch (err) {
        console.error('[v0] Failed to fetch data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [household?.householdId])

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!household) return null

  const recentMeds = medications.slice(0, 3)

  return (
    <AppShell>
      <div className="px-6 py-8">
        {/* Header with theme toggle */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-med-muted text-base mb-1">{household.name}</p>
              <h1 className="text-3xl font-bold text-fg">{getGreeting()}</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Member row */}
        <section className="mb-8" aria-label="Household members">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6">
            {members.map((member) => (
              <Link
                key={member._id}
                href={`/cabinet?member=${member._id}`}
                className={cn(
                  'flex flex-col items-center gap-2 shrink-0',
                  'focus-visible:ring-4 focus-visible:ring-med-accent/50 rounded-xl p-2'
                )}
              >
                <MemberAvatar name={member.name} color={member.avatarColor} size="lg" />
                <span className="text-fg text-base font-medium">{member.name}</span>
              </Link>
            ))}

            {/* Add member button */}
            <Link
              href="/onboarding/member"
              className={cn(
                'flex flex-col items-center gap-2 shrink-0',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50 rounded-xl p-2'
              )}
              aria-label="Add household member"
            >
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-med-border flex items-center justify-center">
                <Plus className="w-8 h-8 text-med-muted" />
              </div>
              <span className="text-med-muted text-base font-medium">Add</span>
            </Link>
          </div>
        </section>

        {/* Action grid */}
        <section className="mb-8" aria-label="Quick actions">
          <div className="grid grid-cols-2 gap-4">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon
              const subtitle = card.subtitle ?? `${medications.length} medication${medications.length !== 1 ? 's' : ''}`
              
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={cn(
                    'p-5 rounded-2xl shadow-lg',
                    card.bgClass,
                    'focus-visible:ring-4 focus-visible:ring-white/50',
                    'active:scale-[0.98] transition-transform'
                  )}
                >
                  <Icon className={cn('w-8 h-8 mb-3', card.iconColor)} aria-hidden="true" />
                  <p className={cn('text-xl font-bold', card.textColor)}>{card.title}</p>
                  <p className={cn('text-base', card.subtextColor)}>{subtitle}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Recent medications */}
        <section aria-label="Recent medications">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-fg">Recent</h2>
            {medications.length > 3 && (
              <Link
                href="/cabinet"
                className="text-med-accent text-base font-medium focus-visible:underline"
              >
                See all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : recentMeds.length > 0 ? (
            <div className="space-y-3">
              {recentMeds.map((med) => (
                <MedCard key={med._id} medication={med} />
              ))}
            </div>
          ) : (
            <div className="bg-med-card rounded-2xl p-8 text-center border border-med-border">
              <Pill className="w-12 h-12 text-med-muted mx-auto mb-4" aria-hidden="true" />
              <p className="text-xl font-bold text-fg mb-2">No medications yet</p>
              <p className="text-med-muted text-lg mb-6">
                Scan your first bottle to get started.
              </p>
              <Link
                href="/scan/bottle"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
                  'bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold',
                  'focus-visible:ring-4 focus-visible:ring-med-accent/50'
                )}
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                Scan a bottle
              </Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
