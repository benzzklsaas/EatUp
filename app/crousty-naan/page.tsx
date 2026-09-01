'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CROUSTY, paletteVars, FONT, ARCH, GRAIN } from '@/lib/brand'

/**
 * LA VITRINE DE CROUSTY NAAN
 * ──────────────────────────────────────────────────────────────────────────
 * Ce site présente la maison ; il ne prend pas les commandes. Chaque appel à
 * l'action renvoie vers la page de commande EatUp.
 *
 * La carte, les horaires et les coordonnées sont lus dans Supabase : ce que le
 * restaurant modifie dans son tableau de bord EatUp apparaît ici sans double
 * saisie.
 *
 * TEXTES À REMPLACER — ce sont les seules phrases écrites à la main, tout le
 * reste vient de la base. Elles sont regroupées dans COPY juste en dessous.
 */
const COPY = {
  promesse: 'Des naans garnis, préparés à la commande.',
  manifesteTitre: 'Le pain d’abord.',
  manifeste:
    'Un naan se juge à la première bouchée : moelleux dessous, croustillant sur les bords. Tout le reste — les viandes marinées, les sauces, les herbes fraîches — vient s’y poser.',
  signaturesTitre: 'Ce qu’on prépare',
  carteTitre: 'La carte',
  finalTitre: 'On vous le prépare',
  finalTexte: 'Commandez en ligne, passez le récupérer quand ça vous arrange.',
}

const SLUG = 'crousty-naan'
const ORDER_URL = `/restaurant/${SLUG}`
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  is_available: boolean
}

type Category = { id: string; name: string; emoji: string; position: number }

const price = (n: number) => Number(n).toFixed(2).replace('.', ',')
const hhmm = (t: string) => t.slice(0, 5).replace(':', 'h')

export default function CroustyNaanPage() {
  const supabase = createClient()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [isOpenNow, setIsOpenNow] = useState(false)
  const [nextOpening, setNextOpening] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const heroRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    async function load() {
      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', SLUG)
        .single()

      if (!resto) { setLoading(false); return }
      setRestaurant(resto)

      const { data: sched } = await supabase
        .from('restaurant_schedule')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('day_of_week')
      setSchedules(sched || [])

      // Ouvert ou fermé, à la minute près — même calcul que la page de commande.
      const now = new Date()
      const todayIdx = (now.getDay() + 6) % 7
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const today = sched?.find((s: any) => s.day_of_week === todayIdx)
      const openNow = today && !today.is_closed && (
        (today.opening_time_1 && today.closing_time_1 &&
          currentMinutes >= toMinutes(today.opening_time_1) &&
          currentMinutes < toMinutes(today.closing_time_1)) ||
        (today.opening_time_2 && today.closing_time_2 &&
          currentMinutes >= toMinutes(today.opening_time_2) &&
          currentMinutes < toMinutes(today.closing_time_2))
      )
      setIsOpenNow(!!openNow)

      if (!openNow) {
        let found = false
        if (today && !today.is_closed) {
          for (const t of [today.opening_time_1, today.opening_time_2].filter(Boolean)) {
            if (toMinutes(t) > currentMinutes) { setNextOpening(`aujourd’hui à ${hhmm(t)}`); found = true; break }
          }
        }
        if (!found) {
          const open = (sched || []).filter((s: any) => !s.is_closed)
          for (let i = 1; i <= 7; i++) {
            const dayIdx = (todayIdx + i) % 7
            const s = open.find((x: any) => x.day_of_week === dayIdx)
            if (s?.opening_time_1) {
              setNextOpening(`${i === 1 ? 'demain' : DAY_NAMES[dayIdx].toLowerCase()} à ${hhmm(s.opening_time_1)}`)
              break
            }
          }
        }
      }

      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', resto.id)
        .neq('is_online', false)
        .order('category')
      setProducts(prods || [])

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('position')
      setDbCategories(cats || [])

      setLoading(false)
    }
    load()
  }, [])

  // ── La mise en scène : une variable pour la profondeur, un observateur
  //    pour les apparitions, une seule boucle d'animation pour les deux. ──
  useEffect(() => {
    if (loading) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const hero = heroRef.current
    if (hero) requestAnimationFrame(() => hero.classList.add('is-ready'))

    const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    let obs: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      obs = new IntersectionObserver((entries, o) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); o.unobserve(e.target) }
        }
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0.04 })
      reveals.forEach(el => obs!.observe(el))
    } else {
      reveals.forEach(el => el.classList.add('is-in'))
    }

    const media = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'))
    let raf = 0
    const frame = () => {
      raf = 0
      const vh = window.innerHeight
      if (hero) {
        hero.style.setProperty('--p', String(Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight || 1)))))
      }
      for (const el of media) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -120 || r.top > vh + 120) continue
        el.style.setProperty('--y', (((r.top + r.height / 2 - vh / 2) / vh) * 16).toFixed(2))
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const onMove = (e: PointerEvent) => {
      if (!hero) return
      const r = hero.getBoundingClientRect()
      hero.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2))
      hero.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2))
    }

    frame()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    hero?.addEventListener('pointermove', onMove)
    return () => {
      obs?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      hero?.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [loading, products.length])

  const p = CROUSTY
  const cssVars = paletteVars(p) as React.CSSProperties

  const HIDDEN = ['Accompagnements']
  const productCategories = [...new Set(products.map(x => x.category || 'Autres').filter(c => !HIDDEN.includes(c)))]
  const orderedCategories = dbCategories.length > 0
    ? [...dbCategories.map(c => c.name).filter(n => productCategories.includes(n)), ...productCategories.filter(n => !dbCategories.find(c => c.name === n))]
    : productCategories

  const signatures = products.filter(x => x.image_url && x.is_available !== false).slice(0, 8)
  const todayIdx = (new Date().getDay() + 6) % 7
  const mapsUrl = restaurant?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
    : null

  const CSS = `
    .cn *, .cn *::before, .cn *::after { box-sizing: border-box; }
    .cn {
      --e: cubic-bezier(.22, 1, .36, 1);
      background: var(--cn-bg); color: var(--cn-text);
      font-family: ${FONT.ui}; font-size: 16px; line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .cn::after {
      content: ''; position: fixed; inset: 0; z-index: 400; pointer-events: none;
      background-image: ${GRAIN}; opacity: .022;
    }
    .cn img { max-width: 100%; display: block; }
    .cn a { color: inherit; }
    .cn :focus-visible { outline: 2px solid var(--cn-hot-ink); outline-offset: 3px; }

    .vt-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
    .vt-display { font-family: ${FONT.display}; font-weight: 700; letter-spacing: -.03em; line-height: 1.05; }
    .vt-mono { font-family: ${FONT.mono}; font-variant-numeric: tabular-nums; }
    .vt-eyebrow {
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .16em;
      text-transform: uppercase; color: var(--cn-dim); margin: 0 0 14px;
    }
    .vt-section { padding: 84px 0; }

    .vt-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 9px;
      font-family: ${FONT.ui}; font-size: 15px; font-weight: 600;
      min-height: 48px; padding: 12px 24px; border-radius: 999px; border: none;
      background: var(--cn-hot-ink); color: #fff; cursor: pointer; text-decoration: none;
      transition: background .15s ease, transform .15s var(--e);
    }
    .vt-btn:hover { background: var(--cn-hot); transform: translateY(-1px); }
    .vt-btn--ghost { background: transparent; color: var(--cn-text); border: 1px solid var(--cn-line); }
    .vt-btn--ghost:hover { background: var(--cn-shade); }
    .vt-btn--light { background: #fff; color: var(--cn-hot-ink); }
    .vt-btn--light:hover { background: var(--cn-hot-soft); }

    .vt-pill {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: ${FONT.mono}; font-size: 12.5px; padding: 7px 14px; border-radius: 999px;
      background: var(--cn-shade); color: var(--cn-dim);
    }
    .vt-pill--open { background: var(--cn-fresh-soft); color: var(--cn-fresh-ink); }
    .vt-pill__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

    /* ══ LA VITRINE : quatre plans dans une même perspective ══════════════ */
    .vt-hero {
      --p: 0; --mx: 0; --my: 0;
      position: relative; overflow: hidden; isolation: isolate;
      min-height: 92svh; display: flex; align-items: flex-end;
      padding: 0 20px 52px; perspective: 1150px; perspective-origin: 62% 38%;
      background:
        radial-gradient(120% 78% at 82% 2%, var(--cn-hot-soft) 0%, transparent 56%),
        radial-gradient(96% 70% at 4% 98%, var(--cn-fresh-soft) 0%, transparent 58%),
        var(--cn-bg);
    }
    .vt-scene { position: absolute; inset: 0; transform-style: preserve-3d; pointer-events: none; }
    .vt-oven {
      position: absolute; left: 50%; top: 3%; width: min(86vw, 540px); aspect-ratio: 3 / 4.1;
      border-radius: 999px 999px 14px 14px; filter: blur(3px); opacity: .18;
      background: linear-gradient(178deg, var(--cn-hot) 0%, #EFA23C 52%, var(--cn-fresh) 126%);
      transform: translate3d(-50%, calc(var(--p) * -28px), -340px) scale(calc(1 + var(--p) * .18));
    }
    .vt-dish {
      position: absolute; left: 50%; top: 6%; width: min(60vw, 310px); aspect-ratio: 4 / 5;
      border-radius: 999px 999px 8px 8px; overflow: hidden; background: var(--cn-shade);
      box-shadow: 0 34px 80px rgba(27, 33, 20, .2);
      transform: translate3d(-50%, calc(var(--p) * -110px), -40px)
                 rotateY(calc(var(--mx) * 6deg)) rotateX(calc(var(--my) * -5deg));
    }
    .vt-dish img { width: 100%; height: 100%; object-fit: cover; }
    .vt-leaf { position: absolute; width: 26px; height: 26px; border-radius: 0 62% 0 62%; background: var(--cn-fresh); opacity: .5; }
    .vt-leaf--a { left: 7%;  top: 32%; transform: translate3d(0, calc(var(--p) * -240px), 110px) rotate(18deg); }
    .vt-leaf--b { right: 10%; top: 48%; width: 18px; height: 18px; opacity: .38;
      transform: translate3d(0, calc(var(--p) * -310px), 60px) rotate(-32deg); }
    .vt-leaf--c { left: 21%; top: 13%; width: 14px; height: 14px; opacity: .3;
      transform: translate3d(0, calc(var(--p) * -180px), 20px) rotate(48deg); }
    /* Le voile : le texte reste lisible quelle que soit la photo posée derrière */
    .vt-veil {
      position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: linear-gradient(to top, var(--cn-bg) 20%,
        color-mix(in srgb, var(--cn-bg) 62%, transparent) 52%, transparent 86%);
    }
    .vt-hero__in { position: relative; z-index: 5; width: 100%; max-width: 1040px; margin: 0 auto; }
    .vt-hero__name { font-size: clamp(48px, 13vw, 104px); font-weight: 800; margin: 0; }
    .vt-hero__voice { font-size: clamp(18px, 4.6vw, 24px); color: var(--cn-dim); margin: 16px 0 0; max-width: 26ch; }
    .vt-hero__cta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 30px; }
    .vt-hero__meta { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 26px 0 0; font-size: 14px; color: var(--cn-dim); }
    @media (min-width: 820px) {
      .vt-hero { align-items: center; padding-bottom: 0; }
      .vt-dish { left: auto; right: 5%; top: 13%; width: min(36vw, 390px);
        transform: translate3d(0, calc(var(--p) * -110px), -40px)
                   rotateY(calc(var(--mx) * 6deg)) rotateX(calc(var(--my) * -5deg)); }
      .vt-oven { left: 70%; top: 1%; width: min(44vw, 560px); }
      .vt-hero__in { max-width: 600px; margin: 0 auto 0 max(20px, calc(50vw - 520px)); }
      /* Sur large écran le texte est à gauche : le voile ne couvre que ce côté,
         la photo garde toute sa densité à droite. */
      .vt-veil { background: linear-gradient(to right, var(--cn-bg) 17%,
        color-mix(in srgb, var(--cn-bg) 42%, transparent) 42%, transparent 66%); }
    }

    /* ══ LA BARRE : la commande reste à portée en permanence ══════════════ */
    .vt-bar {
      position: sticky; top: 0; z-index: 60;
      background: color-mix(in srgb, var(--cn-bg) 90%, transparent);
      backdrop-filter: blur(14px); border-bottom: 1px solid var(--cn-line);
    }
    .vt-bar__in { max-width: 1080px; margin: 0 auto; padding: 10px 20px;
      display: flex; align-items: center; gap: 16px; }
    .vt-bar__name { font-family: ${FONT.display}; font-weight: 700; font-size: 17px; }
    .vt-bar__links { display: none; gap: 22px; margin-left: 24px; font-size: 14.5px; color: var(--cn-dim); }
    .vt-bar__links a { text-decoration: none; }
    .vt-bar__links a:hover { color: var(--cn-text); }
    .vt-bar .vt-btn { margin-left: auto; min-height: 42px; padding: 10px 20px; font-size: 14.5px; }
    @media (min-width: 720px) { .vt-bar__links { display: flex; } }

    /* ══ LE MANIFESTE ═════════════════════════════════════════════════════ */
    .vt-manifest { display: grid; gap: 30px; align-items: start; }
    @media (min-width: 820px) { .vt-manifest { grid-template-columns: 1fr 1.15fr; gap: 60px; } }
    .vt-manifest__t { font-size: clamp(32px, 6.5vw, 54px); margin: 0; }
    .vt-manifest__b { font-size: clamp(17px, 2.4vw, 20px); color: var(--cn-dim); margin: 0; max-width: 46ch; }
    .vt-marks { display: flex; flex-wrap: wrap; gap: 8px; margin: 26px 0 0; padding: 0; list-style: none; }
    .vt-mark { font-family: ${FONT.mono}; font-size: 12.5px; color: var(--cn-fresh-ink);
      background: var(--cn-fresh-soft); padding: 7px 14px; border-radius: 999px; }

    /* ══ LES SIGNATURES : une rangée qui défile, aimantée ═════════════════ */
    .vt-gal { display: flex; gap: 18px; overflow-x: auto; scroll-snap-type: x mandatory;
      scrollbar-width: none; padding: 6px 20px 12px; margin: 0 -20px; }
    .vt-gal::-webkit-scrollbar { display: none; }
    .vt-card { flex: 0 0 auto; width: min(74vw, 282px); scroll-snap-align: center; }
    .vt-card__f { aspect-ratio: 4 / 5; border-radius: ${ARCH}; overflow: hidden; background: var(--cn-shade); }
    .vt-card__f img { width: 100%; height: 100%; object-fit: cover; }
    .vt-card__n { font-family: ${FONT.display}; font-weight: 700; font-size: 18px; margin: 14px 0 0; }
    .vt-card__d { font-size: 14px; color: var(--cn-dim); margin: 5px 0 0; line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .vt-card__p { font-family: ${FONT.mono}; font-size: 15px; color: var(--cn-hot-ink); margin: 9px 0 0; }

    /* ══ LA CARTE : une carte imprimée, pas une grille de vignettes ═══════ */
    .vt-carte { display: grid; gap: 44px 60px; }
    @media (min-width: 860px) { .vt-carte { grid-template-columns: 1fr 1fr; } }
    .vt-cat__h { display: flex; align-items: baseline; gap: 12px; margin: 0 0 6px; }
    .vt-cat__n { font-family: ${FONT.display}; font-weight: 700; font-size: 24px; margin: 0; }
    .vt-cat__r { flex: 1; height: 1px; background: var(--cn-line); }
    .vt-dish-row { padding: 13px 0; border-bottom: 1px solid var(--cn-line); }
    .vt-dish-row--out { opacity: .5; }
    .vt-dish-row__h { display: flex; align-items: baseline; gap: 9px; }
    .vt-dish-row__n { font-weight: 600; font-size: 16px; }
    .vt-dish-row__dots { flex: 1; border-bottom: 1px dotted var(--cn-line); transform: translateY(-4px); min-width: 14px; }
    .vt-dish-row__p { font-family: ${FONT.mono}; font-size: 15px; color: var(--cn-hot-ink); flex-shrink: 0; }
    .vt-dish-row__d { font-size: 14px; color: var(--cn-dim); margin: 4px 0 0; line-height: 1.5; max-width: 52ch; }
    .vt-dish-row__tag { font-family: ${FONT.mono}; font-size: 11px; color: var(--cn-dim);
      background: var(--cn-shade); padding: 2px 8px; border-radius: 999px; }

    /* ══ LE LIEU ET LES HORAIRES ══════════════════════════════════════════ */
    .vt-info { display: grid; gap: 44px; }
    @media (min-width: 820px) { .vt-info { grid-template-columns: 1fr 1fr; gap: 64px; } }
    .vt-h { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0;
      border-bottom: 1px solid var(--cn-line); font-size: 15px; }
    .vt-h__d { color: var(--cn-dim); }
    .vt-h__t { font-family: ${FONT.mono}; font-size: 14px; }
    .vt-h--today { color: var(--cn-hot-ink); }
    .vt-h--today .vt-h__d { color: var(--cn-hot-ink); font-weight: 600; }
    .vt-addr { font-size: 18px; line-height: 1.55; margin: 0 0 18px; }

    /* ══ L'APPEL FINAL ════════════════════════════════════════════════════ */
    .vt-final { background: var(--cn-hot-ink); color: #fff; padding: 78px 20px; text-align: center; }
    .vt-final__t { font-family: ${FONT.display}; font-weight: 800; font-size: clamp(34px, 7vw, 62px);
      margin: 0 0 14px; letter-spacing: -.03em; }
    .vt-final__d { font-size: 18px; margin: 0 auto 30px; max-width: 40ch; opacity: .92; }

    .vt-foot { padding: 34px 20px; border-top: 1px solid var(--cn-line); }
    .vt-foot__in { max-width: 1080px; margin: 0 auto; display: flex; flex-wrap: wrap;
      gap: 12px 24px; align-items: center; font-size: 13.5px; color: var(--cn-dim); }
    .vt-foot__in a { text-decoration: none; }
    .vt-foot__in a:hover { color: var(--cn-text); }

    /* ══ LE MOUVEMENT ═════════════════════════════════════════════════════
       Une courbe, trois durées. Les états de départ vivent tous dans le
       no-preference : refuser les animations montre la page, jamais du vide. */
    @media (prefers-reduced-motion: no-preference) {
      .cn [data-reveal] { opacity: 0; transform: translateY(22px); }
      .cn [data-reveal].is-in { opacity: 1; transform: none;
        transition: opacity .6s var(--e) var(--d, 0s), transform .75s var(--e) var(--d, 0s); }

      .cn [data-parallax] img { transform: translate3d(0, calc(var(--y, 0) * 1px), 0) scale(1.14); will-change: transform; }

      .vt-dish { opacity: 0; }
      .vt-hero.is-ready .vt-dish { animation: vt-arch 1.1s var(--e) .08s forwards; }
      @keyframes vt-arch { from { opacity: 0; clip-path: inset(100% 0 0 0); } to { opacity: 1; clip-path: inset(0 0 0 0); } }
      .vt-oven { opacity: 0; }
      .vt-hero.is-ready .vt-oven { animation: vt-oven 1.5s var(--e) forwards; }
      @keyframes vt-oven { to { opacity: .18; } }
      .vt-leaf { opacity: 0; }
      .vt-hero.is-ready .vt-leaf--a { animation: vt-leaf .9s var(--e) .5s forwards; }
      .vt-hero.is-ready .vt-leaf--b { animation: vt-leaf .9s var(--e) .62s forwards; }
      .vt-hero.is-ready .vt-leaf--c { animation: vt-leaf .9s var(--e) .72s forwards; }
      @keyframes vt-leaf { to { opacity: .45; } }

      .vt-hero__name, .vt-hero__voice, .vt-hero__cta, .vt-hero__meta { opacity: 0; transform: translateY(18px); }
      .vt-hero.is-ready .vt-hero__name  { animation: vt-in .8s var(--e) .16s forwards; }
      .vt-hero.is-ready .vt-hero__voice { animation: vt-in .8s var(--e) .26s forwards; }
      .vt-hero.is-ready .vt-hero__cta   { animation: vt-in .8s var(--e) .36s forwards; }
      .vt-hero.is-ready .vt-hero__meta  { animation: vt-in .8s var(--e) .46s forwards; }
      @keyframes vt-in { to { opacity: 1; transform: none; } }

      .vt-card__f { transition: transform .5s var(--e), box-shadow .5s var(--e); }
      .vt-card:hover .vt-card__f { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(27, 33, 20, .17); }
      .vt-dish-row { transition: padding-left .3s var(--e); }
      .vt-dish-row:hover { padding-left: 8px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .cn *, .cn *::before, .cn *::after {
        animation-duration: .01ms !important; animation-iteration-count: 1 !important;
        transition-duration: .01ms !important; scroll-behavior: auto !important;
      }
    }
  `

  if (loading) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <style>{CSS}</style>
      <div style={{ width: 34, height: 44, borderRadius: ARCH, background: `linear-gradient(180deg, ${p.hot}, ${p.fresh})`, animation: 'vt-breathe 1.5s ease-in-out infinite' }} />
      <style>{`@keyframes vt-breathe{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.45;transform:translateY(5px)}}`}</style>
    </div>
  )

  if (!restaurant) return (
    <div className="cn" style={{ ...cssVars, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <p className="vt-display" style={{ fontSize: 32, margin: '0 0 10px' }}>Page indisponible</p>
        <p style={{ color: p.dim, margin: 0 }}>La fiche du restaurant n’a pas pu être chargée.</p>
      </div>
    </div>
  )

  return (
    <div className="cn" style={cssVars}>
      <style>{CSS}</style>

      {/* ══ LA VITRINE ══ */}
      <section className="vt-hero" ref={heroRef}>
        <div className="vt-scene" aria-hidden="true">
          <div className="vt-oven" />
          <div className="vt-dish">
            {restaurant.cover_image_url && <img src={restaurant.cover_image_url} alt="" />}
          </div>
          <span className="vt-leaf vt-leaf--a" />
          <span className="vt-leaf vt-leaf--b" />
          <span className="vt-leaf vt-leaf--c" />
        </div>
        <div className="vt-veil" aria-hidden="true" />

        <div className="vt-hero__in">
          <h1 className="vt-hero__name vt-display">{restaurant.name}</h1>
          <p className="vt-hero__voice">{restaurant.description || COPY.promesse}</p>

          <div className="vt-hero__cta">
            <Link href={ORDER_URL} className="vt-btn">Commander en ligne</Link>
            <a href="#carte" className="vt-btn vt-btn--ghost">Voir la carte</a>
          </div>

          <div className="vt-hero__meta">
            <span className={`vt-pill${isOpenNow ? ' vt-pill--open' : ''}`}>
              <span className="vt-pill__dot" />
              {isOpenNow ? 'Ouvert maintenant' : nextOpening ? `Ouvre ${nextOpening}` : 'Fermé'}
            </span>
            {restaurant.address && <span>{restaurant.address}</span>}
            {restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}
          </div>
        </div>
      </section>

      {/* ══ LA BARRE ══ */}
      <nav className="vt-bar">
        <div className="vt-bar__in">
          <span className="vt-bar__name">{restaurant.name}</span>
          <div className="vt-bar__links">
            <a href="#carte">La carte</a>
            <a href="#lieu">Horaires & accès</a>
          </div>
          <Link href={ORDER_URL} className="vt-btn">Commander</Link>
        </div>
      </nav>

      {/* ══ LE MANIFESTE ══ */}
      <section className="vt-section">
        <div className="vt-wrap vt-manifest">
          <div data-reveal>
            <p className="vt-eyebrow">La maison</p>
            <h2 className="vt-manifest__t vt-display">{COPY.manifesteTitre}</h2>
          </div>
          <div data-reveal style={{ ['--d' as any]: '90ms' }}>
            <p className="vt-manifest__b">{COPY.manifeste}</p>
            {orderedCategories.length > 0 && (
              <ul className="vt-marks">
                {orderedCategories.slice(0, 5).map(c => <li key={c} className="vt-mark">{c}</li>)}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ══ LES SIGNATURES ══ */}
      {signatures.length > 0 && (
        <section className="vt-section" style={{ paddingTop: 0 }}>
          <div className="vt-wrap">
            <div data-reveal style={{ marginBottom: 26 }}>
              <p className="vt-eyebrow">En vitrine</p>
              <h2 className="vt-manifest__t vt-display" style={{ fontSize: 'clamp(28px, 5.5vw, 44px)' }}>
                {COPY.signaturesTitre}
              </h2>
            </div>
            <div className="vt-gal">
              {signatures.map((s, i) => (
                <article key={s.id} className="vt-card" data-reveal style={{ ['--d' as any]: `${Math.min(i, 5) * 70}ms` }}>
                  <div className="vt-card__f" data-parallax><img src={s.image_url} alt={s.name} /></div>
                  <h3 className="vt-card__n">{s.name}</h3>
                  {s.description && <p className="vt-card__d">{s.description}</p>}
                  <p className="vt-card__p">{price(s.price)}€</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ LA CARTE ══ */}
      <section className="vt-section" id="carte" style={{ background: p.surface, borderTop: `1px solid ${p.line}`, borderBottom: `1px solid ${p.line}`, scrollMarginTop: 62 }}>
        <div className="vt-wrap">
          <div data-reveal style={{ marginBottom: 34 }}>
            <p className="vt-eyebrow">À la carte</p>
            <h2 className="vt-manifest__t vt-display">{COPY.carteTitre}</h2>
          </div>

          {products.length === 0 ? (
            <p style={{ color: p.dim, margin: 0 }}>La carte est en cours de préparation.</p>
          ) : (
            <div className="vt-carte">
              {orderedCategories.map((cat, ci) => {
                const items = products.filter(x => (x.category || 'Autres') === cat)
                return (
                  <div key={cat} data-reveal style={{ ['--d' as any]: `${Math.min(ci, 4) * 70}ms` }}>
                    <div className="vt-cat__h">
                      <h3 className="vt-cat__n">{cat}</h3>
                      <span className="vt-cat__r" />
                    </div>
                    {items.map(item => (
                      <div key={item.id} className={`vt-dish-row${item.is_available === false ? ' vt-dish-row--out' : ''}`}>
                        <div className="vt-dish-row__h">
                          <span className="vt-dish-row__n">{item.name}</span>
                          {item.is_available === false && <span className="vt-dish-row__tag">Épuisé</span>}
                          <span className="vt-dish-row__dots" />
                          <span className="vt-dish-row__p">{price(item.price)}€</span>
                        </div>
                        {item.description && <p className="vt-dish-row__d">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          <div data-reveal style={{ marginTop: 40 }}>
            <Link href={ORDER_URL} className="vt-btn">Commander en ligne</Link>
          </div>
        </div>
      </section>

      {/* ══ LE LIEU ET LES HORAIRES ══ */}
      <section className="vt-section" id="lieu" style={{ scrollMarginTop: 62 }}>
        <div className="vt-wrap vt-info">
          <div data-reveal>
            <p className="vt-eyebrow">Où nous trouver</p>
            {restaurant.address && <p className="vt-addr">{restaurant.address}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="vt-btn vt-btn--ghost">
                  Itinéraire
                </a>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="vt-btn vt-btn--ghost">{restaurant.phone}</a>
              )}
            </div>
          </div>

          <div data-reveal style={{ ['--d' as any]: '90ms' }}>
            <p className="vt-eyebrow">Horaires</p>
            {schedules.length === 0 ? (
              <p style={{ color: p.dim, margin: 0 }}>Horaires à venir.</p>
            ) : (
              DAY_NAMES.map((day, idx) => {
                const s = schedules.find((x: any) => x.day_of_week === idx)
                const closed = !s || s.is_closed
                const services = closed ? [] : [
                  s.opening_time_1 && s.closing_time_1 ? `${hhmm(s.opening_time_1)} – ${hhmm(s.closing_time_1)}` : null,
                  s.opening_time_2 && s.closing_time_2 ? `${hhmm(s.opening_time_2)} – ${hhmm(s.closing_time_2)}` : null,
                ].filter(Boolean)
                return (
                  <div key={day} className={`vt-h${idx === todayIdx ? ' vt-h--today' : ''}`}>
                    <span className="vt-h__d">{day}</span>
                    <span className="vt-h__t">{closed || services.length === 0 ? 'Fermé' : services.join('  ·  ')}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ══ L'APPEL FINAL ══ */}
      <section className="vt-final">
        <div data-reveal>
          <h2 className="vt-final__t">{COPY.finalTitre}</h2>
          <p className="vt-final__d">{COPY.finalTexte}</p>
          <Link href={ORDER_URL} className="vt-btn vt-btn--light">Commander en ligne</Link>
        </div>
      </section>

      <footer className="vt-foot">
        <div className="vt-foot__in">
          <span>© {new Date().getFullYear()} {restaurant.name}</span>
          {restaurant.address && <span>{restaurant.address}</span>}
          {restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}
          <Link href={ORDER_URL} style={{ marginLeft: 'auto' }}>Commande en ligne</Link>
        </div>
      </footer>
    </div>
  )
}
