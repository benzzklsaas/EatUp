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
    <div style={{ background: '#FFFBF5', minHeight: '100vh', color: '#1A1208', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '64px',
        background: scrolled ? 'rgba(255,251,245,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={32} height={32} style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', color: '#1A1208' }}>EatUp</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/auth/login" style={{ color: '#78716C', fontSize: 14, fontWeight: 500, padding: '8px 16px', textDecoration: 'none', borderRadius: 10 }}>
            Connexion
          </Link>
          <Link href="/auth/register" style={{
            background: '#f97316', color: 'white', fontSize: 14, fontWeight: 700,
            padding: '9px 20px', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
          }}>
            Démarrer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '160px 24px 100px', overflow: 'hidden' }}>

        {/* Glow subtil */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 100, marginBottom: 32,
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.2)',
          fontSize: 13, fontWeight: 600, color: '#ea580c',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
          Disponible maintenant · Sans engagement
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-3px', margin: '0 0 24px', maxWidth: 900, color: '#1A1208' }}>
          Arrêtez de payer<br />
          <span style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            30% à Uber Eats.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: '#78716C', lineHeight: 1.7, maxWidth: 520, margin: '0 0 48px' }}>
          EatUp c'est votre propre système de commande en ligne — vos clients commandent, vous gardez 100% de l'argent. 29,99€/mois fixe, aucune commission.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '15px 32px', borderRadius: 14, textDecoration: 'none',
            background: '#f97316',
            color: 'white', fontWeight: 700, fontSize: 16,
            boxShadow: '0 8px 30px rgba(249,115,22,0.35)',
          }}>
            Créer mon restaurant gratuitement
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
          <Link href="/restaurant/crousty-naan" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '15px 28px', borderRadius: 14, textDecoration: 'none',
            background: 'white',
            border: '1.5px solid rgba(0,0,0,0.1)',
            color: '#44403C', fontWeight: 600, fontSize: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            Voir la démo live
          </Link>
        </div>

        <p style={{ marginTop: 16, fontSize: 13, color: '#A8A29E' }}>29,99€/mois · Sans engagement · Résiliable à tout moment</p>

        {/* Dashboard mockup */}
        <div style={{
          marginTop: 72, width: '100%', maxWidth: 900,
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 40px 80px rgba(0,0,0,0.12)',
          background: '#0f172a',
        }}>
          <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #334155' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.7 }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', opacity: 0.7 }} />
            <div style={{ flex: 1, margin: '0 12px', background: '#0f172a', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#475569', border: '1px solid #334155' }}>
              eatup-app.fr/dashboard
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: "Commandes aujourd'hui", value: '12', trend: 'Aujourd\'hui', color: '#fb923c', trendColor: '#4ade80' },
                { label: 'En cours', value: '4', trend: '2 prêtes', color: '#f59e0b', trendColor: '#fbbf24' },
                { label: 'Revenus du mois', value: '843€', trend: 'Ce mois', color: '#10b981', trendColor: '#4ade80' },
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
                <span style={{ fontSize: 12, color: '#f97316' }}>Voir tout →</span>
              </div>
              {[
                { name: 'Karim B.', items: '2 articles', amount: '18,50€', status: 'En attente', statusColor: '#f59e0b', statusBg: 'rgba(245,158,11,0.1)' },
                { name: 'Sofia M.', items: '3 articles', amount: '27,00€', status: 'En préparation', statusColor: '#fb923c', statusBg: 'rgba(251,146,60,0.1)' },
                { name: 'Lucas T.', items: '1 article', amount: '12,50€', status: 'Prêt ✓', statusColor: '#4ade80', statusBg: 'rgba(74,222,128,0.1)' },
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

      {/* Stats */}
      <div style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { value: '0%', label: 'de commission sur vos ventes', icon: '💰' },
            { value: '29,99€', label: 'par mois, tout inclus', icon: '📋' },
            { value: '5 min', label: "pour être en ligne", icon: '⚡' },
            { value: '450€', label: 'économisés vs Uber Eats / mois', icon: '🏦' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f97316', letterSpacing: '-1px', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#78716C' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Types de restaurants */}
      <div style={{ textAlign: 'center', padding: '0 24px 80px' }}>
        <p style={{ fontSize: 12, color: '#A8A29E', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>
          Conçu pour les restaurateurs indépendants
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          {['🥙 Kebabs', '🍕 Pizzerias', '🍣 Sushis', '🍔 Burgers', '🥪 Sandwicheries', '🍱 Traiteurs'].map(type => (
            <span key={type} style={{ fontSize: 14, color: '#78716C', fontWeight: 500, background: 'white', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 100, padding: '6px 14px' }}>{type}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, color: '#f97316', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Fonctionnalités</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', color: '#1A1208' }}>
            Tout ce qu'il faut,<br />rien de superflu.
          </h2>
          <p style={{ color: '#78716C', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            Une seule plateforme pour gérer vos commandes, votre menu et vos clients.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { icon: '🍽️', title: 'Menu digital', desc: 'Gérez votre carte en temps réel : photos, prix, catégories, disponibilités. Vos clients voient toujours les bonnes infos.' },
            { icon: '🛒', title: 'Click & Collect fluide', desc: 'Interface mobile-first pensée pour convertir. Panier, créneaux horaires, confirmation en un clic.' },
            { icon: '💳', title: 'Paiement flexible', desc: "Paiement sur place à la caisse, ou en ligne par carte. Vous choisissez. Zéro commission EatUp sur vos ventes." },
            { icon: '📊', title: 'Dashboard temps réel', desc: "Commandes entrantes, revenus du jour, analytics hebdomadaires. Tout ce qu'il faut pour piloter votre activité." },
            { icon: '📧', title: 'Emails automatisés', desc: 'Confirmations de commande, notifications au restaurant. Vos clients sont toujours informés, sans effort de votre part.' },
            { icon: '🕐', title: 'Horaires intelligents', desc: "Configurez vos horaires par jour, 2 services (midi/soir), fermetures exceptionnelles. Les créneaux s'adaptent automatiquement." },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '28px 24px', background: 'white',
              border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1A1208' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#78716C', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: '#FFF7ED', borderTop: '1px solid rgba(249,115,22,0.1)', borderBottom: '1px solid rgba(249,115,22,0.1)' }}>
        <p style={{ fontSize: 12, color: '#f97316', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Comment ça marche</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 64, color: '#1A1208' }}>
          En ligne en 5 minutes.
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', maxWidth: 900, margin: '0 auto', flexWrap: 'wrap', gap: 0 }}>
          {[
            { n: '1', title: 'Créez votre compte', desc: 'Renseignez votre restaurant en 2 minutes.' },
            { n: '2', title: 'Choisissez votre offre', desc: '29,99€/mois, sans engagement.' },
            { n: '3', title: 'Ajoutez votre menu', desc: 'Photos, prix, catégories. Simple et rapide.' },
            { n: '4', title: 'Partagez le lien', desc: 'Vos clients commandent depuis leur mobile.' },
          ].map((step, i) => (
            <div key={i} style={{ flex: '1 1 200px', padding: '0 24px 40px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f97316', color: 'white',
                fontSize: 18, fontWeight: 800,
                boxShadow: '0 8px 24px rgba(249,115,22,0.3)',
              }}>
                {step.n}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1A1208' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#78716C', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, color: '#f97316', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Tarifs</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 16, color: '#1A1208' }}>
            Transparent. Sans surprise.
          </h2>
          <p style={{ color: '#78716C', fontSize: 16 }}>Zéro commission sur vos ventes. Résiliable à tout moment.</p>
        </div>

        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          <div style={{
            borderRadius: 24, padding: '48px 40px',
            background: 'white',
            border: '2px solid #f97316',
            boxShadow: '0 0 0 8px rgba(249,115,22,0.06), 0 20px 60px rgba(249,115,22,0.1)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: '#f97316',
              padding: '4px 20px', borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: 'white',
            }}>
              SANS ENGAGEMENT
            </div>

            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, color: '#1A1208' }}>29,99</span>
                <span style={{ fontSize: 22, color: '#A8A29E' }}>€/mois</span>
              </div>
              <p style={{ fontSize: 14, color: '#A8A29E', margin: 0 }}>Sans engagement · Résiliable à tout moment</p>
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
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#44403C' }}>
                  <span style={{ color: '#f97316', fontSize: 18, fontWeight: 800 }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <Link href="/auth/register" style={{
              display: 'block', textAlign: 'center', padding: '16px', borderRadius: 14,
              background: '#f97316',
              color: 'white', fontWeight: 700, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 8px 30px rgba(249,115,22,0.35)',
            }}>
              Commencer pour 29,99€/mois →
            </Link>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#A8A29E', marginTop: 14 }}>Résiliable à tout moment · Sans engagement</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 24px 120px', textAlign: 'center', background: '#FFF7ED', borderTop: '1px solid rgba(249,115,22,0.1)' }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-2px', marginBottom: 20, lineHeight: 1.1, color: '#1A1208' }}>
          Vos commandes.<br />
          <span style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Votre argent.
          </span>
        </h2>
        <p style={{ color: '#78716C', fontSize: 18, marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
          Pas de commission. Pas d'intermédiaire. Vos commandes, vos clients, votre argent.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '16px 36px', borderRadius: 16, textDecoration: 'none',
          background: '#f97316', color: 'white', fontWeight: 800, fontSize: 17,
          boxShadow: '0 8px 30px rgba(249,115,22,0.35)',
          letterSpacing: '-0.3px',
        }}>
          Créer mon restaurant gratuitement
          <span style={{ fontSize: 20 }}>→</span>
        </Link>
        <p style={{ marginTop: 16, fontSize: 13, color: '#A8A29E' }}>Sans engagement · Résiliable à tout moment</p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/LogoEatUp.PNG" alt="EatUp" width={24} height={24} style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 700, color: '#44403C' }}>EatUp</span>
        </div>
        <p style={{ fontSize: 13, color: '#A8A29E' }}>© 2026 EatUp · Click & Collect pour restaurants</p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/auth/login" style={{ fontSize: 13, color: '#78716C', textDecoration: 'none' }}>Connexion</Link>
          <Link href="/auth/register" style={{ fontSize: 13, color: '#78716C', textDecoration: 'none' }}>Inscription</Link>
        </div>
      </footer>

    </div>
  )
}
