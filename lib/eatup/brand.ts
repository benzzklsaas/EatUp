// Personnalisation par restaurant : une seule couleur d'accent, dont on dérive des
// variantes toujours lisibles (WCAG AA). Sans couleur définie, l'orange EatUp s'applique.

const INK = '#171717'
const WHITE = '#FFFFFF'
const CREAM = '#F7F4EE'

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const v = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map(n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(parseHex(a) || [0, 0, 0])
  const lb = luminance(parseHex(b) || [0, 0, 0])
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Variables CSS d'accent pour un restaurant, ou undefined pour garder l'identité EatUp. */
export function brandStyle(accent: string | null | undefined): Record<string, string> | undefined {
  const rgb = accent ? parseHex(accent) : null
  if (!rgb) return undefined
  const brand = toHex(rgb)
  const ink = contrastRatio(brand, INK) >= contrastRatio(brand, WHITE) ? INK : WHITE
  // Version texte : on assombrit progressivement jusqu'à 4,5:1 sur le fond crème.
  let text = rgb
  for (let i = 0; i < 20 && contrastRatio(toHex(text), CREAM) < 4.5; i++) {
    text = text.map(c => c * 0.9) as [number, number, number]
  }
  return { '--brand': brand, '--brand-ink': ink, '--brand-text': toHex(text) }
}
