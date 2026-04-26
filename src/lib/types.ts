export interface Household {
  householdId: string
  code: string
  name: string
  activeMemberId?: string
}

export interface Member {
  _id: string
  name: string
  age?: number
  avatarColor: MemberColor
  index: number
}

// Safe color palette - no red (looks dangerous for medical app)
export type MemberColor = 'teal' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose'

export const MEMBER_COLORS: MemberColor[] = ['teal', 'sky', 'violet', 'amber', 'emerald', 'rose']

export const MEMBER_COLOR_MAP: Record<MemberColor, { bg: string; text: string; bgFaded: string; hex: string }> = {
  teal: { bg: 'bg-member-teal', text: 'text-member-teal', bgFaded: 'bg-member-teal/15', hex: '#14B8A6' },
  sky: { bg: 'bg-member-sky', text: 'text-member-sky', bgFaded: 'bg-member-sky/15', hex: '#38BDF8' },
  violet: { bg: 'bg-member-violet', text: 'text-member-violet', bgFaded: 'bg-member-violet/15', hex: '#A78BFA' },
  amber: { bg: 'bg-member-amber', text: 'text-member-amber', bgFaded: 'bg-member-amber/15', hex: '#FBBF24' },
  emerald: { bg: 'bg-member-emerald', text: 'text-member-emerald', bgFaded: 'bg-member-emerald/15', hex: '#34D399' },
  rose: { bg: 'bg-member-rose', text: 'text-member-rose', bgFaded: 'bg-member-rose/15', hex: '#F472B6' },
}

export interface Medication {
  _id: string
  brandName: string
  genericName?: string
  dosage: {
    raw: string
  }
  warnings: string[]
  plainLanguage: {
    whatItDoes: string
    howToTake: string
    watchOutFor: string
  }
  fdaVerified: boolean
  member: {
    name: string
    avatarColor: MemberColor
  }
  memberId: string
  activeIngredients?: Array<{
    name: string
    strength: string
  }>
  rxInfo?: {
    rxNumber?: string
    prescriber?: string
    pharmacy?: string
  }
}

export interface ScanResult {
  medicationId: string
  extracted: {
    brandName: string
    genericName?: string
    dosage: string
  }
  plainLanguage: {
    whatItDoes: string
    howToTake: string
    watchOutFor: string
  }
  fdaVerified: boolean
  fdaWarnings: string[]
  interactions: Interaction[]
}

export interface PillIdentification {
  matched: boolean
  medicationId?: string
  brandName?: string
  genericName?: string
  inCabinet: boolean
  memberName?: string
  dosage?: string
  whatItDoes?: string
  warning?: string
  color: string
  shape?: string
  imprint?: string
  confidence: number
  fdaIdentified: boolean
}

export interface Interaction {
  severity: 'danger' | 'caution' | 'info'
  title: string
  message: string
  drugs: string[]
}

export interface VoiceContext {
  members: Member[]
  medications: Medication[]
  recentDoses: Array<{
    medicationId: string
    timestamp: string
  }>
}

export interface DoseLog {
  doseId: string
  medicationId: string
  timestamp: string
  source: 'manual' | 'voice'
}
