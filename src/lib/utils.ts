import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateHouseholdCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const MEMBER_COLORS = [
  '#E11D48',
  '#14B8A6',
  '#8B5CF6',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
];

export function pickMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
