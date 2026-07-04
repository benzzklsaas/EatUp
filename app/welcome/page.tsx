'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 4,
  delay: Math.random() * 4,
  opacity: Math.random() * 0.5 + 0.1,
  color: ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#ffffff'][Math.floor(Math.random() * 5)],
}))

const WORDS = ['Bienvenue', 'dans', 'la', 'Team', 'EatUp']

export default function WelcomePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'words' | 'main' | 'out'>('words')
  const [wordIdx, setWordIdx] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [checkmarks, setCheckmarks] = useState<boolean[]>([false, false, false])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Animate words one by one
    let i = 0
    const wordTimer = setInterval(() => {
      setWordIdx(i)
      i++
      if (i >= WORDS.length) {
        clearInterval(wordTimer)
        setTimeout(() => setPhase('main'), 600)
      }
    }, 250)
    return () => clearInterval(wordTimer)
  }, [])

  useEffect(() => {
    if (phase !== 'main') return

    // Checkmarks appear one by one
    const delays = [400, 900, 1400]
    delays.forEach((d, i) => {
      setTimeout(() => setCheckmarks(prev => { const next = [...prev]; next[i] = true; return next }), d)
    })

    // Progress bar
    let p = 0
    intervalRef.current = setInterval(() => {
      p += 1
      setProgress(p)
      if (p >= 100) {
        clearInterval(intervalRef.current!)
        setTimeout(() => {
          setPhase('out')
          setTimeout(() => router.push('/dashboard'), 600)
        }, 200)
      }
    }, 50)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  return (
    <div style={{
      minHeight: '100vh', background: '#050810', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: phase === 'out' ? 0 : 1, transition: 'opacity 0.6s ease',
    }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-20px) } }
        @keyframes pulse-glow { 0%,100% { opacity:0.4; transform:scale(1) } 50% { opacity:0.8; transform:scale(1.05) } }
        @keyframes slide-up { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pop { 0% { transform:scale(0) } 70% { transform:scale(1.15) } 100% { transform:scale(1) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes spin-slow { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes check-draw { from { stroke-dashoffset: 30 } to { stroke-dashoffset: 0 } }
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:'absolute', top:'10%', left:'15%', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        animation:'pulse-glow 6s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'15%', right:'10%', width:350, height:350, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        animation:'pulse-glow 8s ease-in-out infinite 2s', pointerEvents:'none' }} />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
          width:p.size, height:p.size, borderRadius:'50%',
          background:p.color, opacity:p.opacity, pointerEvents:'none',
          animation:`float ${p.duration}s ease-in-out infinite ${p.delay}s`,
        }} />
      ))}

      {/* Grid overlay */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize:'60px 60px',
      }} />

      {/* Words intro phase */}
      {phase === 'words' && (
        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap', justifyContent:'center', padding:'0 24px' }}>
          {WORDS.map((w, i) => (
            <span key={w} style={{
              fontSize: w === 'EatUp' ? 52 : 40,
              fontWeight: 900,
              letterSpacing: '-2px',
              color: w === 'EatUp' ? 'transparent' : 'white',
              background: w === 'EatUp' ? 'linear-gradient(135deg, #6366f1, #a78bfa)' : undefined,
              WebkitBackgroundClip: w === 'EatUp' ? 'text' : undefined,
              WebkitTextFillColor: w === 'EatUp' ? 'transparent' : undefined,
              opacity: wordIdx >= i ? 1 : 0,
              transform: wordIdx >= i ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              display: 'inline-block',
            }}>{w}</span>
          ))}
        </div>
      )}

      {/* Main phase */}
      {phase === 'main' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, textAlign:'center', padding:'0 24px', animation:'slide-up 0.5s ease' }}>

          {/* Logo with ring */}
          <div style={{ position:'relative', width:96, height:96 }}>
            <div style={{
              position:'absolute', inset:-8, borderRadius:'50%',
              border:'2px solid transparent',
              background:'linear-gradient(135deg, #6366f1, #a78bfa) border-box',
              WebkitMask:'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite:'destination-out',
              animation:'spin-slow 4s linear infinite',
            }} />
            <Image src="/LogoEatUp.PNG" alt="EatUp" width={96} height={96} style={{ borderRadius:'50%', position:'relative', zIndex:1 }} />
          </div>

          {/* Headline */}
          <div>
            <h1 style={{
              fontSize: 'clamp(28px, 6vw, 52px)', fontWeight:900, letterSpacing:'-2px', margin:'0 0 12px',
              background:'linear-gradient(135deg, #ffffff 0%, #a78bfa 60%, #6366f1 100%)',
              backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              animation:'shimmer 3s linear infinite',
            }}>Bienvenue dans la Team EatUp</h1>
            <p style={{ color:'#6b7280', fontSize:16, margin:0, fontWeight:500 }}>
              Votre restaurant est maintenant en ligne. Prêt à recevoir des commandes.
            </p>
          </div>

          {/* Checklist */}
          <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:380 }}>
            {[
              { label:'Abonnement activé', sub:'Accès complet à la plateforme' },
              { label:'Menu en ligne', sub:'Visible par vos clients dès maintenant' },
              { label:'Paiements configurés', sub:'Click & collect prêt à l\'emploi' },
            ].map((item, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                background:'rgba(99,102,241,0.06)', borderRadius:14,
                border:`1px solid ${checkmarks[i] ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)'}`,
                transition:'border-color 0.4s ease',
              }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background: checkmarks[i] ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'background 0.3s ease',
                  animation: checkmarks[i] ? 'pop 0.4s ease' : undefined,
                }}>
                  {checkmarks[i] && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2,7 5.5,10.5 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ strokeDasharray:30, strokeDashoffset:0, animation:'check-draw 0.3s ease' }} />
                    </svg>
                  )}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ color:checkmarks[i] ? 'white' : '#4b5563', fontSize:14, fontWeight:600, transition:'color 0.3s ease' }}>{item.label}</div>
                  <div style={{ color:'#374151', fontSize:12, marginTop:2 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ width:'100%', maxWidth:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:'#4b5563', fontSize:12 }}>Accès au dashboard dans…</span>
              <span style={{ color:'#6366f1', fontSize:12, fontWeight:600 }}>{Math.ceil((100 - progress) / 20)}s</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:99, width:`${progress}%`,
                background:'linear-gradient(90deg, #6366f1, #a78bfa)',
                transition:'width 0.05s linear',
                boxShadow:'0 0 12px rgba(99,102,241,0.6)',
              }} />
            </div>
          </div>

          {/* Skip */}
          <button onClick={() => router.push('/dashboard')} style={{
            background:'none', border:'none', color:'#374151', fontSize:13,
            cursor:'pointer', textDecoration:'underline', textDecorationColor:'rgba(55,65,81,0.4)',
          }}>
            Accéder maintenant →
          </button>
        </div>
      )}
    </div>
  )
}
