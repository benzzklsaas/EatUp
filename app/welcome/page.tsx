'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const WORDS = ['Bienvenue', 'dans', 'la', 'Team', 'EatUp']

export default function WelcomePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'words' | 'main' | 'out'>('words')
  const [wordIdx, setWordIdx] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [checkmarks, setCheckmarks] = useState<boolean[]>([false, false, false])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let i = 0
    const wordTimer = setInterval(() => {
      setWordIdx(i)
      i++
      if (i >= WORDS.length) { clearInterval(wordTimer); setTimeout(() => setPhase('main'), 600) }
    }, 250)
    return () => clearInterval(wordTimer)
  }, [])

  useEffect(() => {
    if (phase !== 'main') return
    const delays = [400, 900, 1400]
    delays.forEach((d, i) => {
      setTimeout(() => setCheckmarks(prev => { const next = [...prev]; next[i] = true; return next }), d)
    })
    let p = 0
    intervalRef.current = setInterval(() => {
      p += 1; setProgress(p)
      if (p >= 100) {
        clearInterval(intervalRef.current!)
        setTimeout(() => { setPhase('out'); setTimeout(() => router.push('/dashboard'), 600) }, 200)
      }
    }, 50)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFBF5', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: phase === 'out' ? 0 : 1, transition: 'opacity 0.6s ease',
    }}>
      <style>{`
        @keyframes slide-up { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pop { 0% { transform:scale(0) } 70% { transform:scale(1.15) } 100% { transform:scale(1) } }
        @keyframes check-draw { from { stroke-dashoffset: 30 } to { stroke-dashoffset: 0 } }
        @keyframes spin-slow { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>

      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {phase === 'words' && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
          {WORDS.map((w, i) => (
            <span key={w} style={{
              fontSize: w === 'EatUp' ? 52 : 40, fontWeight: 900, letterSpacing: '-2px',
              color: w === 'EatUp' ? 'transparent' : '#1A1208',
              background: w === 'EatUp' ? 'linear-gradient(135deg, #f97316, #ea580c)' : undefined,
              WebkitBackgroundClip: w === 'EatUp' ? 'text' : undefined,
              WebkitTextFillColor: w === 'EatUp' ? 'transparent' : undefined,
              opacity: wordIdx >= i ? 1 : 0,
              transform: wordIdx >= i ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease', display: 'inline-block',
            }}>{w}</span>
          ))}
        </div>
      )}

      {phase === 'main' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center', padding: '0 24px', animation: 'slide-up 0.5s ease' }}>

          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '2px solid transparent',
              background: 'linear-gradient(135deg, #f97316, #ea580c) border-box',
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'destination-out',
              animation: 'spin-slow 4s linear infinite',
            }} />
            <Image src="/LogoEatUp.PNG" alt="EatUp" width={96} height={96} style={{ borderRadius: '50%', position: 'relative', zIndex: 1 }} />
          </div>

          <div>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 12px', color: '#1A1208' }}>
              Bienvenue dans la Team EatUp 🎉
            </h1>
            <p style={{ color: '#78716C', fontSize: 16, margin: 0 }}>Votre restaurant est en ligne. Prêt à recevoir des commandes.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380 }}>
            {[
              { label: 'Abonnement activé', sub: 'Accès complet à la plateforme' },
              { label: 'Menu en ligne', sub: 'Visible par vos clients dès maintenant' },
              { label: 'Paiements configurés', sub: "Click & collect prêt à l'emploi" },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: checkmarks[i] ? 'rgba(249,115,22,0.04)' : 'white', borderRadius: 14,
                border: `1.5px solid ${checkmarks[i] ? 'rgba(249,115,22,0.25)' : 'rgba(0,0,0,0.07)'}`,
                transition: 'all 0.4s ease',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: checkmarks[i] ? '#f97316' : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.3s ease',
                  animation: checkmarks[i] ? 'pop 0.4s ease' : undefined,
                  boxShadow: checkmarks[i] ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
                }}>
                  {checkmarks[i] && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2,7 5.5,10.5 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'check-draw 0.3s ease' }} />
                    </svg>
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: checkmarks[i] ? '#1A1208' : '#78716C', fontSize: 14, fontWeight: 600, transition: 'color 0.3s ease' }}>{item.label}</div>
                  <div style={{ color: '#A8A29E', fontSize: 12, marginTop: 2 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#78716C', fontSize: 12 }}>Accès au dashboard dans…</span>
              <span style={{ color: '#f97316', fontSize: 12, fontWeight: 600 }}>{Math.ceil((100 - progress) / 20)}s</span>
            </div>
            <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, width: `${progress}%`,
                background: 'linear-gradient(90deg, #f97316, #ea580c)',
                transition: 'width 0.05s linear', boxShadow: '0 0 8px rgba(249,115,22,0.4)',
              }} />
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} style={{
            background: 'none', border: 'none', color: '#A8A29E', fontSize: 13,
            cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(168,162,158,0.4)',
          }}>
            Accéder maintenant →
          </button>
        </div>
      )}
    </div>
  )
}
