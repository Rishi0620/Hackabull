'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { X, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  prompt: string
  onCapture: (imageBase64: string) => void
  onCancel: () => void
}

export function CameraCapture({ prompt, onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)

  // Start camera
  useEffect(() => {
    let mounted = true

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }

        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setIsStarting(false)
      } catch (err) {
        if (mounted) {
          setError('Could not access camera. Please check permissions.')
          setIsStarting(false)
        }
      }
    }

    startCamera()

    return () => {
      mounted = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)
    setPreviewImage(imageBase64)

    // Stop the camera while showing preview
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }, [stream])

  const retake = useCallback(async () => {
    setPreviewImage(null)
    setIsStarting(true)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsStarting(false)
    } catch (err) {
      setError('Could not restart camera.')
      setIsStarting(false)
    }
  }, [])

  const confirmPhoto = useCallback(() => {
    if (previewImage) {
      onCapture(previewImage)
    }
  }, [previewImage, onCapture])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera view or preview */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-xl text-fg mb-4">{error}</p>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-med-card rounded-2xl text-fg font-semibold"
              >
                Go back
              </button>
            </div>
          </div>
        ) : previewImage ? (
          <img
            src={previewImage}
            alt="Captured photo"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Top prompt bar */}
        <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-6 py-4 safe-area-top">
          <p className="text-lg text-fg text-center font-medium">{prompt}</p>
        </div>

        {/* Loading indicator */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-med-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 backdrop-blur-sm px-6 py-6 safe-area-bottom">
        {previewImage ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={retake}
              className={cn(
                'flex-1 py-4 px-6 rounded-2xl bg-med-card text-fg font-semibold text-lg',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              Retake
            </button>
            <button
              type="button"
              onClick={confirmPhoto}
              className={cn(
                'flex-1 py-4 px-6 rounded-2xl bg-med-accent text-black font-semibold text-lg',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
            >
              Use this photo
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {/* Cancel button */}
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'w-14 h-14 rounded-full bg-med-card flex items-center justify-center',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50'
              )}
              aria-label="Cancel"
            >
              <X className="w-6 h-6 text-fg" />
            </button>

            {/* Shutter button */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isStarting || !!error}
              className={cn(
                'w-20 h-20 rounded-full bg-white flex items-center justify-center',
                'focus-visible:ring-4 focus-visible:ring-med-accent/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'active:scale-95 transition-transform'
              )}
              aria-label="Take photo"
            >
              <Camera className="w-8 h-8 text-black" />
            </button>

            {/* Spacer for alignment */}
            <div className="w-14 h-14" />
          </div>
        )}
      </div>
    </div>
  )
}
