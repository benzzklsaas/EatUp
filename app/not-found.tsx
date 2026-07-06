'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#050810', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-12px) } }
        @keyframes pulse-glow { 0%,100% { opacity:0.4; transform:scale(1) } 50% { opacity:0.7; transform:scale(1.05) } }
        @keyframes fade-up { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', animation: 'pulse-glow 6s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, animation: 'fade-up 0.5s ease' }}>

        {/* Logo */}
        <div style={{ animation: 'float 4s ease-in-out infinite', marginBottom: 32 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={72} height={72} style={{ borderRadius: '50%', boxShadow: '0 0 40px rgba(99,102,241,0.3)' }} />
        </div>

        {/* 404 */}
        <p style={{
          fontSize: 'clamp(80px, 20vw, 140px)', fontWeight: 900, letterSpacing: '-6px', margin: '0 0 16px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(99,102,241,0.4) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1,
        }}>404</p>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 10px', letterSpacing: '-0.5px', textAlign: 'center' }}>
          Cette page n'existe pas
        </h1>
        <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 40px', textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
          Le lien est peut-être incorrect, ou la page a été déplacée.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
          <Link href="/" style={{
            display: 'block', textAlign: 'center', padding: '14px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14,
            color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 8px 30px rgba(99,102,241,0.3)',
          }}>
            Retour à l'accueil
          </Link>
          <Link href="/dashboard" style={{
            display: 'block', textAlign: 'center', padding: '14px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
            color: '#6b7280', fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>
            Mon dashboard
          </Link>
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: '#1f2937' }}>EatUp · Click &amp; Collect pour restaurants</p>
      </div>
    </div>
  )
}
