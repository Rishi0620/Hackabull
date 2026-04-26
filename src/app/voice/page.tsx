'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Volume2, Shield, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-household'
import { AppShell } from '@/components/app-shell'
import { MicButton } from '@/components/mic-button'
import { VoiceWaves } from '@/components/voice-waves'
import { LoadingSpinner } from '@/components/loading-spinner'
import { VoiceContext } from '@/lib/types'

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

// Keywords that should route to cloud (Gemini) for medical accuracy
const CLOUD_KEYWORDS = [
  'can i take',
  'safe to',
  'side effect',
  'interact',
  'pregnan',
  'with food',
  'with alcohol',
  'allergy',
  'overdose',
  'symptom',
  'what does',
  'what is this',
]

const SUGGESTION_QUESTIONS = [
  'What medications is Mom taking?',
  'Did anyone take their pills today?',
  'What is Lisinopril for?',
  'Are there any drug interactions?',
]

export default function VoicePage() {
  const router = useRouter()
  const { household, loaded } = useHousehold()
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState<{ text: string; model: 'gemma' | 'gemini' } | null>(null)
  const [gemmaStatus, setGemmaStatus] = useState<'checking' | 'ready' | 'offline'>('checking')
  const [voiceContext, setVoiceContext] = useState<VoiceContext | null>(null)

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Refs so recognition event handlers always see current values (no stale closure)
  const voiceStateRef = useRef<VoiceState>('idle')
  const transcriptRef = useRef('')
  const handleQueryRef = useRef<(q: string) => void>(() => {})

  // Keep refs in sync so recognition handlers always see current values
  useEffect(() => { voiceStateRef.current = voiceState }, [voiceState])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // Redirect to onboarding if no household
  useEffect(() => {
    if (loaded && !household) {
      router.replace('/onboarding')
    }
  }, [loaded, household, router])

  // Check Gemma status and fetch voice context
  useEffect(() => {
    if (!household?.householdId) return

    async function init() {
      // Check Gemma
      try {
        const gemmaRes = await fetch('/api/gemma/ping')
        if (gemmaRes.ok) {
          const data = await gemmaRes.json()
          setGemmaStatus(data.ok ? 'ready' : 'offline')
        } else {
          setGemmaStatus('offline')
        }
      } catch {
        setGemmaStatus('offline')
      }

      // Fetch voice context
      try {
        const contextRes = await fetch(`/api/voice/context?householdId=${household!.householdId}`)
        if (contextRes.ok) {
          const data = await contextRes.json()
          setVoiceContext(data)
        }
      } catch (err) {
        console.error('[v0] Failed to fetch voice context:', err)
      }
    }

    init()
  }, [household?.householdId])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('[v0] Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const result = event.results[current]
      const text = result[0].transcript
      setTranscript(text)
      transcriptRef.current = text
      // Some browsers fire isFinal here — handle immediately
      if (result.isFinal) {
        handleQueryRef.current(text)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('[v0] Speech recognition error:', event.error)
      setVoiceState('idle')
      voiceStateRef.current = 'idle'
    }

    // onend always fires when recognition stops (silence, manual stop, or error).
    // Use refs to avoid stale closure — if we were listening and have a transcript,
    // submit the query. This covers browsers that don't fire isFinal before ending.
    recognition.onend = () => {
      if (voiceStateRef.current === 'listening') {
        const pending = transcriptRef.current.trim()
        if (pending) {
          handleQueryRef.current(pending)
        } else {
          setVoiceState('idle')
          voiceStateRef.current = 'idle'
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  const shouldRouteToCloud = (query: string): boolean => {
    const lower = query.toLowerCase()
    return CLOUD_KEYWORDS.some((keyword) => lower.includes(keyword))
  }

  const handleQuery = useCallback(
    async (query: string) => {
      if (!household || !query.trim()) return

      setVoiceState('thinking')

      try {
        let response: { text: string; model: 'gemma' | 'gemini' }

        if (shouldRouteToCloud(query)) {
          // Route to cloud (Gemini)
          const res = await fetch('/api/voice/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              householdId: household.householdId,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            response = { text: data.answer, model: 'gemini' }
          } else {
            throw new Error('Cloud query failed')
          }
        } else {
          // Route to Gemma 4 — falls back to Gemini if Gemma fails or context not loaded
          const res = await fetch('/api/gemma/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, context: voiceContext }),
          })

          if (res.ok) {
            const data = await res.json()
            response = { text: data.answer, model: data.model === 'gemma' ? 'gemma' : 'gemini' }
          } else {
            // Gemma failed — fall back to Gemini cloud instead of crashing
            const fallback = await fetch('/api/voice/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, householdId: household.householdId }),
            })
            if (fallback.ok) {
              const data = await fallback.json()
              response = { text: data.answer, model: 'gemini' }
            } else {
              throw new Error('Both Gemma and Gemini failed to answer')
            }
          }
        }

        setAnswer(response)
        await speakAnswer(response.text)
      } catch (err) {
        console.error('[v0] Query failed:', err)
        setAnswer({ text: 'Sorry, I could not process that question. Please try again.', model: 'gemma' })
        setVoiceState('idle')
        voiceStateRef.current = 'idle'
      }
    },
    [household, voiceContext]
  )

  // Keep the ref current so recognition onend always calls the latest version
  useEffect(() => { handleQueryRef.current = handleQuery }, [handleQuery])

  const speakAnswer = async (text: string) => {
    setVoiceState('speaking')

    try {
      const res = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio

        audio.onended = () => {
          setVoiceState('idle')
          URL.revokeObjectURL(url)
        }

        audio.onerror = () => {
          setVoiceState('idle')
          URL.revokeObjectURL(url)
          fallbackToSpeechSynthesis(text)
        }

        // Don't await — play() rejects with a browser Event object (not Error)
        // which would become an unhandled rejection if awaited and re-thrown
        audio.play().catch(() => {
          setVoiceState('idle')
          URL.revokeObjectURL(url)
          fallbackToSpeechSynthesis(text)
        })
      } else {
        fallbackToSpeechSynthesis(text)
      }
    } catch {
      fallbackToSpeechSynthesis(text)
    }
  }

  const fallbackToSpeechSynthesis = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setVoiceState('idle')
      utterance.onerror = () => setVoiceState('idle')
      speechSynthesis.speak(utterance)
    } else {
      setVoiceState('idle')
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (voiceState === 'listening') {
      recognitionRef.current.stop()
      setVoiceState('idle')
    } else {
      setTranscript('')
      setAnswer(null)
      setVoiceState('listening')
      try {
        recognitionRef.current.start()
      } catch {
        // Already started or permission denied — reset state silently
        setVoiceState('idle')
      }
    }
  }

  const handleSuggestionClick = (question: string) => {
    setTranscript(question)
    handleQuery(question)
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
      <div className="flex flex-col h-[calc(100vh-96px)] px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-fg mb-2">Ask MedSNAP</h1>
          <p className="text-lg text-med-muted">Voice or tap a question.</p>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium',
                gemmaStatus === 'ready'
                  ? 'bg-med-ok/15 text-med-ok'
                  : gemmaStatus === 'offline'
                    ? 'bg-med-card text-med-muted'
                    : 'bg-med-card text-med-muted'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  gemmaStatus === 'ready' ? 'bg-med-ok' : 'bg-med-muted'
                )}
              />
              Gemma 4: {gemmaStatus === 'checking' ? '...' : gemmaStatus}
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-med-accent/15 text-med-accent text-sm font-medium">
              <Volume2 className="w-3 h-3" />
              ElevenLabs voice
            </span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-med-card text-med-muted text-sm font-medium">
              <Shield className="w-3 h-3" />
              Privacy-first
            </span>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Idle state: show suggestions */}
          {voiceState === 'idle' && !transcript && !answer && (
            <div className="space-y-3">
              {SUGGESTION_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSuggestionClick(question)}
                  className={cn(
                    'w-full py-4 px-5 rounded-2xl bg-med-card border border-med-border text-left',
                    'text-lg text-fg font-medium',
                    'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                    'active:bg-med-border transition-colors'
                  )}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="mb-4">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">You asked</p>
              <div className="bg-med-card rounded-2xl p-5">
                <p className="text-xl text-fg">{transcript}</p>
              </div>
            </div>
          )}

          {/* Thinking state */}
          {voiceState === 'thinking' && (
            <div className="bg-med-card rounded-2xl p-5 flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <div>
                <p className="text-lg text-fg">Thinking...</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                    shouldRouteToCloud(transcript)
                      ? 'bg-med-accent/15 text-med-accent'
                      : 'bg-med-ok/15 text-med-ok'
                  )}
                >
                  {shouldRouteToCloud(transcript) ? 'Gemini 2.5' : 'Gemma 4'}
                </span>
              </div>
            </div>
          )}

          {/* Speaking state */}
          {voiceState === 'speaking' && (
            <div className="flex items-center gap-3 mb-4">
              <Volume2 className="w-6 h-6 text-med-accent animate-pulse" />
              <p className="text-lg text-med-muted">Speaking...</p>
            </div>
          )}

          {/* Answer */}
          {answer && voiceState !== 'thinking' && (
            <div className="mb-4">
              <p className="text-sm text-med-muted uppercase tracking-wide mb-2">Answer</p>
              <div className="bg-med-card rounded-2xl p-5">
                <p className="text-xl text-fg leading-relaxed">{answer.text}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      answer.model === 'gemma'
                        ? 'bg-med-ok/15 text-med-ok'
                        : 'bg-med-accent/15 text-med-accent'
                    )}
                  >
                    {answer.model === 'gemma' ? 'Gemma 4' : 'Gemini 2.5'}
                  </span>
                </div>
                {answer.model === 'gemma' && (
                  <p className="text-sm text-med-muted mt-3 flex items-center gap-1">
                    <Check className="w-4 h-4 text-med-ok" />
                    Answered using Gemma 4 — your health data stayed on this network.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom mic area */}
        <div className="pt-6 pb-4 flex flex-col items-center">
          <VoiceWaves isActive={voiceState === 'listening'} className="mb-4" />

          <MicButton
            isListening={voiceState === 'listening'}
            onClick={toggleListening}
            disabled={voiceState === 'thinking' || voiceState === 'speaking'}
          />

          <p className="text-med-muted text-lg mt-4">
            {voiceState === 'listening' ? 'Listening...' : 'Tap and ask anything'}
          </p>
        </div>
      </div>
    </AppShell>
  )
}

