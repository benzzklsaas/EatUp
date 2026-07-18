'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#050810', minHeight: '100vh', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Noise texture overlay */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '64px',
        background: scrolled ? 'rgba(5,8,16,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={32} height={32} style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>EatUp</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/auth/login" style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, padding: '8px 16px', textDecoration: 'none', borderRadius: 10 }}>
            Connexion
          </Link>
          <Link href="/auth/register" style={{
            background: 'white', color: '#050810', fontSize: 14, fontWeight: 700,
            padding: '9px 20px', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
          }}>
            Démarrer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '180px 24px 120px', overflow: 'hidden' }}>

        {/* Glows */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 200, left: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 200, right: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 100, marginBottom: 32,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          fontSize: 13, fontWeight: 600, color: '#818cf8',
          letterSpacing: '0.02em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block', boxShadow: '0 0 8px #818cf8' }} />
          Disponible maintenant · Sans engagement
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-3px', margin: '0 0 24px', maxWidth: 900 }}>
          Arrêtez de payer<br />
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #a78bfa 70%, #c084fc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            30% à Uber Eats.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.7, maxWidth: 520, margin: '0 0 48px' }}>
          EatUp c'est votre propre système de commande en ligne — vos clients commandent, vous gardez 100% de l'argent. 29,99€/mois fixe, aucune commission.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 14, textDecoration: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: 16,
            boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 20px 60px rgba(99,102,241,0.3)',
          }}>
            Créer mon restaurant
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
          <Link href="/restaurant/crousty-naan" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 14, textDecoration: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', fontWeight: 600, fontSize: 16,
          }}>
            Voir la démo live
          </Link>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: '#1f2937' }}>29,99€/mois · Sans engagement</p>

        {/* Dashboard mockup */}
        <div style={{
          marginTop: 80, width: '100%', maxWidth: 900,
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 40px 120px rgba(0,0,0,0.8)',
          background: '#0f172a',
        }}>
          {/* Fake browser bar */}
          <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #334155' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.6 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', opacity: 0.6 }} />
            <div style={{ flex: 1, margin: '0 12px', background: '#0f172a', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#475569', border: '1px solid #334155' }}>
              eatup-app.fr/dashboard
            </div>
          </div>
          {/* Fake dashboard */}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: "Commandes aujourd'hui", value: '347', trend: '↑ +18% vs hier', color: '#60a5fa', trendColor: '#4ade80' },
                { label: 'En cours', value: '89', trend: '12 prêtes', color: '#f59e0b', trendColor: '#fbbf24' },
                { label: 'Revenus du mois', value: '14 820€', trend: '↑ +31% vs mois dernier', color: '#10b981', trendColor: '#4ade80' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '16px 20px' }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{stat.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, color: stat.trendColor }}>{stat.trend}</p>
                </div>
              ))}
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Dernières commandes</span>
                <span style={{ fontSize: 12, color: '#3b82f6' }}>Voir tout →</span>
              </div>
              {[
                { name: 'Marie Lambert', items: '3 articles', amount: '54,50€', status: 'En attente', statusColor: '#f59e0b', statusBg: '#451a03' },
                { name: 'Thomas Girard', items: '5 articles', amount: '89,90€', status: 'En préparation', statusColor: '#60a5fa', statusBg: '#1e3a5f' },
                { name: 'Sophie Martin', items: '2 articles', amount: '38,00€', status: 'Prêt ✓', statusColor: '#4ade80', statusBg: '#052e16' },
              ].map((order, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #0f172a' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{order.name}</p>
                    <p style={{ fontSize: 11, color: '#475569' }}>{order.items}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{order.amount}</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: order.statusBg, color: order.statusColor, fontWeight: 600 }}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof chiffres */}
      <div style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { value: '0%', label: 'de commission sur chaque vente', icon: '💰' },
            { value: '29,99€', label: 'par mois, tout inclus', icon: '📋' },
            { value: '5 min', label: "pour être en ligne", icon: '⚡' },
            { value: '450€', label: 'économisés vs Uber Eats / mois', icon: '🏦' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-1px', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#374151' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Types de restaurants */}
      <div style={{ textAlign: 'center', padding: '0 24px 80px' }}>
        <p style={{ fontSize: 13, color: '#1f2937', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 20 }}>
          Conçu pour les restaurateurs indépendants
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {['Kebabs', 'Pizzerias', 'Sushis', 'Burgers', 'Sandwicheries', 'Traiteurs'].map(type => (
            <span key={type} style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{type}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Fonctionnalités</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px' }}>
            Tout ce qu'il faut,<br />rien de superflu.
          </h2>
          <p style={{ color: '#4b5563', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Une seule plateforme pour gérer vos commandes, votre menu et vos clients.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
          {[
            { icon: '🍽️', title: 'Menu digital', desc: 'Gérez votre carte en temps réel : photos, prix, catégories, disponibilités. Vos clients voient toujours les bonnes infos.' },
            { icon: '🛒', title: 'Click & Collect fluide', desc: 'Interface mobile-first pensée pour convertir. Panier, créneaux horaires, confirmation en un clic.' },
            { icon: '💳', title: 'Paiement flexible', desc: "Paiement sur place à la caisse, ou en ligne par carte. Vous choisissez. Zéro commission EatUp sur vos ventes." },
            { icon: '📊', title: 'Dashboard temps réel', desc: "Commandes entrantes, revenus du jour, analytics hebdomadaires. Tout ce qu'il faut pour piloter votre activité." },
            { icon: '📧', title: 'Emails automatisés', desc: 'Confirmations de commande, notifications de paiement. Vos clients sont toujours informés, sans effort de votre part.' },
            { icon: '🕐', title: 'Horaires intelligents', desc: "Configurez vos horaires par jour, 2 services (midi/soir), fermetures exceptionnelles. Les créneaux s'adaptent automatiquement." },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '32px 28px',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: i === 0 ? '20px 0 0 0' : i === 1 ? '0 20px 0 0' : i === 4 ? '0 0 0 20px' : i === 5 ? '0 0 20px 0' : 0,
            }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'white' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'rgba(99,102,241,0.03)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Comment ça marche</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 64 }}>
          En ligne en 5 minutes.
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: 900, margin: '0 auto', flexWrap: 'wrap' }}>
          {[
            { n: '1', title: 'Créez votre compte', desc: 'Renseignez votre restaurant en 2 minutes.' },
            { n: '2', title: 'Choisissez votre offre', desc: '29,99€/mois, sans engagement.' },
            { n: '3', title: 'Ajoutez votre menu', desc: 'Photos, prix, catégories. Simple et rapide.' },
            { n: '4', title: 'Partagez le lien', desc: 'Vos clients commandent directement depuis leur mobile.' },
          ].map((step, i) => (
            <div key={i} style={{ flex: '1 1 200px', padding: '0 24px 40px', position: 'relative' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontSize: 18, fontWeight: 800,
                boxShadow: '0 0 30px rgba(99,102,241,0.4)',
              }}>
                {step.n}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'white' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Tarifs</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Transparent. Sans surprise.
          </h2>
          <p style={{ color: '#4b5563', fontSize: 16 }}>Zéro commission sur vos ventes. Résiliable à tout moment.</p>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            borderRadius: 24, padding: '48px 40px',
            background: 'linear-gradient(145deg, #0f172a, #111827)',
            border: '2px solid rgba(99,102,241,0.5)',
            boxShadow: '0 0 80px rgba(99,102,241,0.12)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              padding: '4px 20px', borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: 'white',
            }}>
              SANS ENGAGEMENT
            </div>

            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1 }}>29,99</span>
                <span style={{ fontSize: 22, color: '#6b7280' }}>€/mois</span>
              </div>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>Sans engagement · Résiliable à tout moment</p>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Menu en ligne illimité',
                'Commandes click & collect',
                'Paiement sur place ou en ligne',
                'Dashboard & analytics',
                'Emails de confirmation automatiques',
                'Gestion des horaires & fermetures',
                'Support par email',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#9ca3af' }}>
                  <span style={{ color: '#818cf8', fontSize: 18, fontWeight: 800 }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <Link href="/auth/register" style={{
              display: 'block', textAlign: 'center', padding: '16px', borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 8px 40px rgba(99,102,241,0.4)',
            }}>
              Commencer pour 29,99€/mois →
            </Link>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#1f2937', marginTop: 14 }}>Résiliable à tout moment · Sans engagement</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 24px 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 20, lineHeight: 1.1 }}>
          Vos commandes.<br />
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Votre argent.
          </span>
        </h2>
        <p style={{ color: '#4b5563', fontSize: 18, marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
          Pas de commission. Pas d'intermédiaire. Vos commandes, vos clients, votre argent.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '16px 36px', borderRadius: 16, textDecoration: 'none',
          background: 'white', color: '#050810', fontWeight: 800, fontSize: 17,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 20px 80px rgba(255,255,255,0.1)',
          letterSpacing: '-0.3px',
        }}>
          Créer mon restaurant
          <span style={{ fontSize: 20 }}>→</span>
        </Link>
        <p style={{ marginTop: 16, fontSize: 13, color: '#1f2937' }}>Sans engagement · Résiliable à tout moment</p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={24} height={24} style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 700, color: '#374151' }}>EatUp</span>
        </div>
        <p style={{ fontSize: 13, color: '#1f2937' }}>© 2026 EatUp · Click & Collect pour restaurants</p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/auth/login" style={{ fontSize: 13, color: '#374151', textDecoration: 'none' }}>Connexion</Link>
          <Link href="/auth/register" style={{ fontSize: 13, color: '#374151', textDecoration: 'none' }}>Inscription</Link>
        </div>
      </footer>

    </div>
  )
}
