'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={36} height={36} className="rounded-full" />
          <span className="font-bold text-white text-lg">EatUp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium px-4 py-2 rounded-xl transition" style={{ color: '#94a3b8' }}>
            Connexion
          </Link>
          <Link href="/auth/register" className="text-sm font-bold px-4 py-2 rounded-xl transition" style={{ background: '#3b82f6', color: 'white' }}>
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 overflow-hidden">
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
          ✨ La solution click & collect pour les restaurants
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight" style={{ letterSpacing: '-2px' }}>
          Vos clients commandent.<br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Vous encaissez.
          </span>
        </h1>

        <p className="text-lg md:text-xl max-w-xl mb-10" style={{ color: '#64748b', lineHeight: '1.7' }}>
          EatUp donne à votre restaurant un menu en ligne, un système de commande click & collect et un dashboard tout-en-un — en moins de 5 minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link href="/auth/register"
            className="px-8 py-4 rounded-2xl font-bold text-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 40px rgba(59,130,246,0.4)' }}>
            Créer mon restaurant gratuitement →
          </Link>
          <Link href="/restaurant/crousty-naan"
            className="px-8 py-4 rounded-2xl font-medium text-lg transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
            Voir une démo
          </Link>
        </div>

        <p className="mt-4 text-sm" style={{ color: '#334155' }}>Sans carte bancaire · 19,99€/mois après l'essai</p>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-4" style={{ letterSpacing: '-1px' }}>Tout ce dont vous avez besoin</h2>
        <p className="text-center mb-14" style={{ color: '#475569' }}>Une plateforme complète, zéro configuration technique</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '🍽️', title: 'Menu en ligne', desc: 'Créez et gérez votre menu avec photos, catégories et disponibilités en temps réel.', color: '#3b82f6' },
            { icon: '📱', title: 'Click & Collect', desc: 'Vos clients commandent depuis leur téléphone et choisissent leur créneau de retrait.', color: '#8b5cf6' },
            { icon: '💳', title: 'Paiement en ligne', desc: "Acceptez les paiements par carte via Stripe. L'argent arrive directement sur votre compte.", color: '#10b981' },
            { icon: '📊', title: 'Analytics', desc: 'Suivez vos revenus, commandes et clients depuis un dashboard clair et intuitif.', color: '#f59e0b' },
            { icon: '📧', title: 'Emails automatiques', desc: 'Confirmations de commande envoyées automatiquement à vos clients après chaque achat.', color: '#ec4899' },
            { icon: '⚙️', title: 'Horaires flexibles', desc: 'Configurez vos horaires jour par jour, avec deux plages horaires et fermetures exceptionnelles.', color: '#06b6d4' },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: '#111827', border: '1px solid #1f2937' }}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20" style={{ background: '#0d1424' }}>
        <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-4" style={{ letterSpacing: '-1px' }}>Un prix simple et transparent</h2>
        <p className="text-center mb-14" style={{ color: '#475569' }}>Pas de frais cachés, pas de commission sur vos ventes</p>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl p-8 relative" style={{ background: '#111827', border: '2px solid #3b82f6' }}>
            <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#3b82f6', color: 'white' }}>
              OFFRE DE LANCEMENT
            </div>
            <h3 className="font-bold text-white text-xl mb-1">EatUp Starter</h3>
            <p className="text-4xl font-black text-white mt-4 mb-1">19,99€<span className="text-lg font-normal" style={{ color: '#64748b' }}>/mois</span></p>
            <p className="text-sm mb-6" style={{ color: '#475569' }}>Idéal pour démarrer</p>
            <ul className="space-y-3 mb-8">
              {['Menu en ligne illimité', 'Commandes click & collect', 'Dashboard analytics', 'Gestion clients', 'Emails automatiques', 'Support par email'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                  <span style={{ color: '#3b82f6' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="block text-center py-3 rounded-xl font-bold" style={{ background: '#3b82f6', color: 'white' }}>
              Commencer maintenant
            </Link>
          </div>

          <div className="rounded-2xl p-8" style={{ background: '#111827', border: '1px solid #1f2937' }}>
            <h3 className="font-bold text-white text-xl mb-1">EatUp Pro</h3>
            <p className="text-4xl font-black text-white mt-4 mb-1">29,99€<span className="text-lg font-normal" style={{ color: '#64748b' }}>/mois</span></p>
            <p className="text-sm mb-6" style={{ color: '#475569' }}>Pour les restaurants ambitieux</p>
            <ul className="space-y-3 mb-8">
              {['Tout EatUp Starter', 'Paiement en ligne Stripe', 'Notifications temps réel', 'Analytics avancés', 'QR code personnalisé', 'Support prioritaire'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                  <span style={{ color: '#8b5cf6' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="block text-center py-3 rounded-xl font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
              Choisir Pro
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-6" style={{ letterSpacing: '-1px' }}>
          Prêt à digitaliser<br />votre restaurant ?
        </h2>
        <p className="mb-8 text-lg" style={{ color: '#475569' }}>Rejoignez les restaurants qui utilisent EatUp</p>
        <Link href="/auth/register"
          className="inline-block px-10 py-4 rounded-2xl font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', boxShadow: '0 0 50px rgba(59,130,246,0.3)' }}>
          Créer mon restaurant →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: '1px solid #0f172a' }}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={24} height={24} className="rounded-full" />
          <span className="font-bold text-white">EatUp</span>
        </div>
        <p className="text-sm" style={{ color: '#334155' }}>© 2026 EatUp · Click & Collect pour restaurants</p>
      </footer>

    </div>
  )
}
