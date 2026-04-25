'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw } from 'lucide-react';

type Props = {
  onCapture: (imageDataUrl: string) => void;
  onCancel?: () => void;
  prompt?: string;
};

export function CameraCapture({ onCapture, onCancel, prompt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (e: any) {
        setError(e?.message || 'Camera access denied.');
      }
    }
    start();
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const url = c.toDataURL('image/jpeg', 0.85);
    setPreview(url);
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function confirm() {
    if (preview) onCapture(preview);
  }

  function retake() {
    setPreview(null);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center gap-4">
        <p className="text-xl text-danger">Camera error: {error}</p>
        <p className="text-muted">Make sure you've allowed camera access in your browser.</p>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} size="lg">
            Go back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      {prompt && !preview && (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <p className="text-white text-center text-lg font-medium">{prompt}</p>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="captured" className="w-full h-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="bg-black p-6 flex items-center justify-around gap-4">
        {preview ? (
          <>
            <Button variant="secondary" size="lg" onClick={retake}>
              <RotateCcw className="w-6 h-6" /> Retake
            </Button>
            <Button size="xl" onClick={confirm}>
              Use this photo
            </Button>
          </>
        ) : (
          <>
            {onCancel && (
              <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
                <X className="w-7 h-7 text-white" />
              </Button>
            )}
            <button
              onClick={capture}
              aria-label="Take photo"
              className="w-20 h-20 rounded-full bg-white border-4 border-white/40 active:scale-95 transition-transform shadow-2xl flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-black" />
            </button>
            <div className="w-14" />
          </>
        )}
      </div>
    </div>
  );
}
