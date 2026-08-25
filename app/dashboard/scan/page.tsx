'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// @ts-ignore — jsqr n'expose pas de types officiels compatibles avec le build strict
import jsQR from 'jsqr'

export default function ScanPage() {
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [manualId, setManualId] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?next=/dashboard/scan'); return }
      setChecking(false)
    }
    check()
  }, [])

  useEffect(() => {
    if (checking) return
    let stream: MediaStream | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          tick()
        }
      } catch {
        setError("Impossible d'accéder à la caméra. Vérifie les autorisations, ou entre l'identifiant manuellement.")
      }
    }

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data) {
            handleScan(code.data)
            return
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    start()
    return () => {
      cancelAnimationFrame(frameRef.current)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [checking])

  function extractCustomerId(text: string): string | null {
    const match = text.match(/\/dashboard\/scan\/([0-9a-f-]{36})/i)
    if (match) return match[1]
    if (/^[0-9a-f-]{36}$/i.test(text.trim())) return text.trim()
    return null
  }

  function handleScan(text: string) {
    const id = extractCustomerId(text)
    if (id) router.push(`/dashboard/scan/${id}`)
    else setError("QR code non reconnu — ce n'est pas une carte fidélité EatUp.")
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault()
    const id = extractCustomerId(manualId)
    if (id) router.push(`/dashboard/scan/${id}`)
    else setError('Identifiant invalide.')
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBF5' }}>
      <p style={{ color: '#78716C', fontSize: 14 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(255,251,245,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#78716C', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1208', margin: 0 }}>📷 Scanner un client</p>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 440, margin: '0 auto' }}>
        <div style={{ borderRadius: 24, overflow: 'hidden', background: '#1A1208', aspectRatio: '1', position: 'relative', marginBottom: 20, border: '1.5px solid rgba(0,0,0,0.07)' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ position: 'absolute', inset: 24, border: '2.5px dashed rgba(249,115,22,0.7)', borderRadius: 20, pointerEvents: 'none' }} />
        </div>

        <p style={{ fontSize: 13, color: '#78716C', textAlign: 'center', margin: '0 0 20px' }}>
          Vise le QR code de la carte fidélité du client, présentée sur son téléphone.
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
          <input
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            placeholder="Ou colle l'identifiant / le lien du client"
            style={{ flex: 1, borderRadius: 12, padding: '12px 14px', fontSize: 13, background: 'white', border: '1.5px solid rgba(0,0,0,0.1)', color: '#1A1208', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '12px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 13 }}>
            OK
          </button>
        </form>
      </main>
    </div>
  )
}
