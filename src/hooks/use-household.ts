'use client'

import { useState, useEffect, useCallback } from 'react'
import { Household } from '@/lib/types'

const STORAGE_KEY = 'medmate.household'

export function useHousehold() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Household
        setHousehold(parsed)
      }
    } catch (err) {
      console.error('[v0] Failed to load household from localStorage:', err)
    }
    setLoaded(true)
  }, [])

  // Save to localStorage
  const save = useCallback((data: Household) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setHousehold(data)
    } catch (err) {
      console.error('[v0] Failed to save household to localStorage:', err)
    }
  }, [])

  // Update active member
  const setActiveMember = useCallback((memberId: string) => {
    if (household) {
      const updated = { ...household, activeMemberId: memberId }
      save(updated)
    }
  }, [household, save])

  // Clear household (for logout/reset)
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setHousehold(null)
    } catch (err) {
      console.error('[v0] Failed to clear household from localStorage:', err)
    }
  }, [])

  return {
    household,
    loaded,
    save,
    setActiveMember,
    clear,
  }
}
