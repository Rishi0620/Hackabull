'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pill, ChevronRight, Search, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { AppShell } from '@/components/app-shell'
import { MemberAvatar } from '@/components/member-avatar'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Member, Medication, MemberColor, MEMBER_COLOR_MAP } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'

// Mock medication data for demonstration
const MOCK_MEDICATIONS: Medication[] = [
  {
    _id: 'med-1',
    brandName: 'Aspirin',
    genericName: 'Acetylsalicylic acid',
    dosage: { raw: '81mg once daily' },
    warnings: ['May cause stomach upset', 'Bleeding risk'],
    plainLanguage: {
      whatItDoes: 'Helps prevent blood clots and reduce inflammation',
      howToTake: 'Take with food, once daily',
      watchOutFor: 'Signs of bleeding, stomach pain'
    },
    fdaVerified: true,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
  {
    _id: 'med-2',
    brandName: 'Atorvastatin',
    genericName: 'Lipitor',
    dosage: { raw: '20mg at bedtime' },
    warnings: ['May cause muscle pain'],
    plainLanguage: {
      whatItDoes: 'Lowers cholesterol levels',
      howToTake: 'Take in the evening',
      watchOutFor: 'Unexplained muscle pain or weakness'
    },
    fdaVerified: true,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
  {
    _id: 'med-3',
    brandName: 'Lisinopril',
    genericName: 'Prinivil, Zestril',
    dosage: { raw: '10mg once daily' },
    warnings: ['May cause dry cough', 'Dizziness when standing'],
    plainLanguage: {
      whatItDoes: 'Lowers blood pressure',
      howToTake: 'Take at the same time each day',
      watchOutFor: 'Persistent dry cough, swelling of face or throat'
    },
    fdaVerified: true,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
  {
    _id: 'med-4',
    brandName: 'Metformin',
    genericName: 'Glucophage',
    dosage: { raw: '500mg twice daily' },
    warnings: ['Take with meals', 'May cause stomach upset initially'],
    plainLanguage: {
      whatItDoes: 'Helps control blood sugar levels',
      howToTake: 'Take with breakfast and dinner',
      watchOutFor: 'Signs of low blood sugar'
    },
    fdaVerified: true,
    member: { name: 'Leonard', avatarColor: 'amber' },
    memberId: 'member-2',
  },
  {
    _id: 'med-5',
    brandName: 'Omeprazole',
    genericName: 'Prilosec',
    dosage: { raw: '20mg before breakfast' },
    warnings: ['Long-term use may affect bone health'],
    plainLanguage: {
      whatItDoes: 'Reduces stomach acid production',
      howToTake: 'Take 30 minutes before eating',
      watchOutFor: 'Persistent stomach pain, difficulty swallowing'
    },
    fdaVerified: true,
    member: { name: 'Leonard', avatarColor: 'amber' },
    memberId: 'member-2',
  },
  {
    _id: 'med-6',
    brandName: 'Vitamin D3',
    genericName: 'Cholecalciferol',
    dosage: { raw: '2000 IU daily' },
    warnings: [],
    plainLanguage: {
      whatItDoes: 'Supports bone health and immune function',
      howToTake: 'Take with a meal containing fat',
      watchOutFor: 'No common concerns at this dose'
    },
    fdaVerified: false,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
  {
    _id: 'med-7',
    brandName: 'Gabapentin',
    genericName: 'Neurontin',
    dosage: { raw: '300mg three times daily' },
    warnings: ['May cause drowsiness', 'Do not stop suddenly'],
    plainLanguage: {
      whatItDoes: 'Treats nerve pain and seizures',
      howToTake: 'Take three times daily with or without food',
      watchOutFor: 'Drowsiness, mood changes'
    },
    fdaVerified: true,
    member: { name: 'Leonard', avatarColor: 'amber' },
    memberId: 'member-2',
  },
  {
    _id: 'med-8',
    brandName: 'Amlodipine',
    genericName: 'Norvasc',
    dosage: { raw: '5mg once daily' },
    warnings: ['May cause ankle swelling'],
    plainLanguage: {
      whatItDoes: 'Lowers blood pressure and treats chest pain',
      howToTake: 'Take at the same time each day',
      watchOutFor: 'Swelling in ankles, flushing'
    },
    fdaVerified: true,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
  {
    _id: 'med-9',
    brandName: 'Clopidogrel',
    genericName: 'Plavix',
    dosage: { raw: '75mg once daily' },
    warnings: ['Serious bleeding risk', 'Do not stop without consulting doctor'],
    plainLanguage: {
      whatItDoes: 'Prevents blood clots',
      howToTake: 'Take at the same time each day',
      watchOutFor: 'Unusual bleeding or bruising'
    },
    fdaVerified: true,
    member: { name: 'Leonard', avatarColor: 'amber' },
    memberId: 'member-2',
  },
  {
    _id: 'med-10',
    brandName: 'Levothyroxine',
    genericName: 'Synthroid',
    dosage: { raw: '50mcg on empty stomach' },
    warnings: ['Take on empty stomach', 'Avoid calcium within 4 hours'],
    plainLanguage: {
      whatItDoes: 'Replaces thyroid hormone',
      howToTake: 'Take 30-60 minutes before breakfast',
      watchOutFor: 'Rapid heartbeat, weight changes'
    },
    fdaVerified: true,
    member: { name: 'Katherine', avatarColor: 'teal' },
    memberId: 'member-1',
  },
]

// Mock members for demonstration
const MOCK_MEMBERS: Member[] = [
  {
    _id: 'member-1',
    name: 'Katherine',
    avatarColor: 'teal' as MemberColor,
    index: 0,
  },
  {
    _id: 'member-2',
    name: 'Leonard',
    avatarColor: 'amber' as MemberColor,
    index: 1,
  },
]

// Pill bottle component - visual representation of a medication
// Resolve avatarColor to a hex string — handles both named colors ('teal') and
// hex strings ('#3B82F6') returned by the real API.
function resolveHex(avatarColor: string): string {
  if (!avatarColor) return '#14B8A6';
  if (avatarColor.startsWith('#')) return avatarColor;
  return MEMBER_COLOR_MAP[avatarColor as MemberColor]?.hex ?? '#14B8A6';
}

function PillBottle({ medication, onClick }: { medication: Medication; onClick: () => void }) {
  const hex = resolveHex(medication.member?.avatarColor ?? '');
  // Shorten name to fit: max 10 chars then ellipsis, shown only inside bottle label
  const shortName = medication.brandName.length > 11
    ? medication.brandName.slice(0, 10) + '…'
    : medication.brandName;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={medication.brandName}
      className={cn(
        'flex flex-col items-center p-2 rounded-2xl',
        'hover:opacity-80 active:scale-95',
        'focus-visible:ring-4 focus-visible:ring-med-accent/50',
        'transition-all duration-150 w-full'
      )}
    >
      {/* Bottle cap */}
      <div
        className="w-10 h-2.5 rounded-t-md mb-0.5"
        style={{ backgroundColor: hex }}
      />
      {/* Bottle body */}
      <div
        className="w-14 h-20 rounded-b-xl flex items-center justify-center relative overflow-hidden border"
        style={{ backgroundColor: `${hex}18`, borderColor: `${hex}40` }}
      >
        {/* Label strip — uses CSS variable so it adapts to light/dark */}
        <div className="absolute inset-x-1.5 top-2 bottom-2 bg-med-card rounded-lg flex flex-col items-center justify-center p-1 gap-1">
          <Pill className="w-4 h-4 shrink-0" style={{ color: hex }} />
          <span className="text-[9px] font-bold text-fg text-center leading-tight">
            {shortName}
          </span>
        </div>
      </div>
    </button>
  )
}

// Shelf component — grouped by member name
function CabinetShelf({
  label,
  medications,
  onMedicationClick,
}: {
  label: string
  medications: Medication[]
  onMedicationClick: (med: Medication) => void
}) {
  if (medications.length === 0) return null
  const hex = label ? resolveHex(medications[0]?.member?.avatarColor ?? '') : undefined

  return (
    <div className="mb-6">
      {label && (
        <div className="flex items-center gap-3 mb-3">
          {hex && (
            <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: hex }} />
          )}
          <span className="text-xl font-bold" style={{ color: hex }}>
            {label}
          </span>
          <span className="text-sm text-med-muted">
            {medications.length} med{medications.length !== 1 ? 's' : ''}
          </span>
          <div className="flex-1 h-px bg-med-border" />
        </div>
      )}

      <div className="cabinet-shelf rounded-2xl p-4 bg-med-card/50 border border-med-border">
        <div className="grid grid-cols-4 gap-2">
          {medications.map((med) => (
            <PillBottle
              key={med._id}
              medication={med}
              onClick={() => onMedicationClick(med)}
            />
          ))}
        </div>
        <div className="h-2 mt-4 -mx-4 -mb-4 bg-gradient-to-b from-transparent to-med-border/30 rounded-b-2xl" />
      </div>
    </div>
  )
}

function CabinetInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { household, loaded } = useHousehold()
  const [members, setMembers] = useState<Member[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get initial member filter from URL
  useEffect(() => {
    const memberParam = searchParams.get('member')
    if (memberParam) {
      setSelectedMember(memberParam)
    }
  }, [searchParams])

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Fetch data or use mock data
  useEffect(() => {
    if (!household?.householdId) return

    async function fetchData() {
      try {
        const hid = household!.householdId
        const [householdRes, medsRes] = await Promise.all([
          fetch(`/api/household?id=${hid}`),
          fetch(`/api/medication?householdId=${hid}`),
        ])

        let fetchedMembers: Member[] = []
        let fetchedMeds: Medication[] = []

        if (householdRes.ok) {
          const data = await householdRes.json()
          fetchedMembers = data.members || []
        }

        if (medsRes.ok) {
          const data = await medsRes.json()
          fetchedMeds = data.medications || []
        }

        // Use mock data if no real data exists
        if (fetchedMembers.length === 0) {
          fetchedMembers = MOCK_MEMBERS
        }
        if (fetchedMeds.length === 0) {
          fetchedMeds = MOCK_MEDICATIONS
        }

        setMembers(fetchedMembers)
        setMedications(fetchedMeds)
      } catch (err) {
        console.error('[v0] Failed to fetch data:', err)
        // Use mock data on error
        setMembers(MOCK_MEMBERS)
        setMedications(MOCK_MEDICATIONS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [household?.householdId])

  // Group medications by member name (or single member if one is selected)
  const shelves = useMemo(() => {
    let filteredMeds = selectedMember
      ? medications.filter((m) => m.memberId === selectedMember)
      : medications

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredMeds = filteredMeds.filter((m) =>
        m.brandName.toLowerCase().includes(query) ||
        m.genericName?.toLowerCase().includes(query)
      )
    }

    if (selectedMember) {
      // Single member selected — one shelf, no label needed
      return [{ label: '', medications: filteredMeds }]
    }

    // Everyone — group by member name, preserve member order from the members array
    const memberOrder = members.map((m) => m.name)
    const groups: Record<string, Medication[]> = {}
    filteredMeds.forEach((med) => {
      const name = med.member?.name || 'Unknown'
      if (!groups[name]) groups[name] = []
      groups[name].push(med)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => {
        const ai = memberOrder.indexOf(a)
        const bi = memberOrder.indexOf(b)
        if (ai === -1 && bi === -1) return a.localeCompare(b)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      .map(([label, meds]) => ({ label, medications: meds }))
  }, [medications, selectedMember, searchQuery, members])

  const totalMeds = selectedMember
    ? medications.filter((m) => m.memberId === selectedMember).length
    : medications.length

  const handleMedicationClick = (med: Medication) => {
    router.push(`/medication/${med._id}`)
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
    <AppShell>
      <div className="px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-fg">Medicine Cabinet</h1>
              <p className="text-med-muted text-lg">
                {totalMeds} medication{totalMeds !== 1 ? 's' : ''}
              </p>
            </div>
            <ThemeToggle />
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-med-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medications..."
              className={cn(
                'w-full pl-12 pr-10 py-4 rounded-xl text-lg',
                'bg-med-card border border-med-border text-fg',
                'placeholder:text-med-muted',
                'focus:outline-none focus:ring-4 focus:ring-med-accent/50'
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                aria-label="Clear search"
              >
                <X className="w-5 h-5 text-med-muted" />
              </button>
            )}
          </div>
        </header>

        {/* Member filter row */}
        <section className="mb-6" aria-label="Filter by member">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6">
            {/* All/Everyone chip */}
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-full shrink-0 font-medium text-lg',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'transition-colors',
                selectedMember === null
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white'
                  : 'bg-med-card text-fg border border-med-border'
              )}
            >
              Everyone
            </button>

            {/* Member chips */}
            {members.map((member) => (
              <button
                key={member._id}
                type="button"
                onClick={() => setSelectedMember(member._id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-full shrink-0 font-medium text-lg',
                  'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                  'transition-colors',
                  selectedMember === member._id
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white'
                    : 'bg-med-card text-fg border border-med-border'
                )}
              >
                <MemberAvatar name={member.name} color={member.avatarColor} size="sm" />
                {member.name}
              </button>
            ))}
          </div>
        </section>

        {/* Cabinet visualization */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : shelves.length > 0 ? (
          <div className="space-y-2">
            {/* Cabinet frame */}
            <div className="rounded-3xl border-4 border-med-border/50 bg-gradient-to-b from-med-card/30 to-transparent p-4 sm:p-6">
              {/* Cabinet header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-med-card border border-med-border">
                  <Pill className="w-5 h-5 text-med-accent" />
                  <span className="text-sm font-medium text-med-muted">
                    {selectedMember 
                      ? members.find(m => m._id === selectedMember)?.name + "'s Medications"
                      : "Family Cabinet"
                    }
                  </span>
                </div>
              </div>
              
              {/* Shelves grouped by member */}
              {shelves.map(({ label, medications: meds }) => (
                <CabinetShelf
                  key={label || 'all'}
                  label={label}
                  medications={meds}
                  onMedicationClick={handleMedicationClick}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-med-card rounded-2xl p-8 text-center border border-med-border">
            <Pill className="w-12 h-12 text-med-muted mx-auto mb-4" aria-hidden="true" />
            <p className="text-xl font-bold text-fg mb-2">
              {searchQuery ? 'No medications found' : 'No medications yet'}
            </p>
            <p className="text-med-muted text-lg mb-6">
              {searchQuery ? 'Try a different search term.' : 'Tap Scan to add one.'}
            </p>
            {!searchQuery && (
              <Link
                href="/scan/bottle"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
                  'bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold',
                  'focus-visible:ring-4 focus-visible:ring-med-accent/50'
                )}
              >
                Scan a bottle
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

import { Suspense } from 'react'

export default function CabinetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <CabinetInner />
    </Suspense>
  )
}
