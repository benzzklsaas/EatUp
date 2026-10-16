'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

// Les images présentes dans le HTML serveur s'affichent immédiatement (aucune dépendance au JS,
// meilleur LCP). Seules celles montées après l'hydratation (fiche, panier, recherche) apparaissent en fondu.
let hydrated = false

// Les photos envoyées depuis le tableau de bord ne sont pas redimensionnées : une miniature
// de 108 px peut peser plusieurs Mo. Celles de Supabase Storage passent donc par next/image ;
// toute autre URL (saisie manuelle) est affichée telle quelle pour ne jamais casser la page.
export function isOptimizable(src: string): boolean {
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
      && url.pathname.startsWith('/storage/v1/object/public/')
      && !/\.svg$/i.test(url.pathname) // next/image n'optimise pas les SVG (dangerouslyAllowSVG)
  } catch {
    return false
  }
}

type FoodImageProps = {
  src: string
  alt: string
  sizes: string
  preload?: boolean
  className?: string
  grayscale?: boolean
}

/** Image qui remplit son conteneur (position relative) avec un fondu à l'apparition. */
export function FoodImage({ src, alt, sizes, preload, className = '', grayscale }: FoodImageProps) {
  const [fade] = useState(() => hydrated)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { hydrated = true }, [])
  // Une image déjà en cache peut être chargée avant que React n'écoute onLoad : on vérifie au montage.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])
  const cls = `absolute inset-0 size-full object-cover ${fade ? 'eu-img' : ''} ${grayscale ? 'grayscale-[0.8] brightness-[0.85]' : ''} ${className}`

  if (isOptimizable(src)) {
    return (
      <Image
        ref={ref} src={src} alt={alt} fill sizes={sizes} preload={preload}
        className={cls} data-loaded={fade ? loaded : undefined} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL externe non autorisée pour l'optimisation
    <img
      ref={ref} src={src} alt={alt} className={cls} data-loaded={fade ? loaded : undefined}
      loading={preload ? 'eager' : 'lazy'} decoding="async" fetchPriority={preload ? 'high' : 'auto'}
      onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}
    />
  )
}
