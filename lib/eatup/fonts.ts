import { Bricolage_Grotesque } from 'next/font/google'

// Police de titres du parcours client (SIL Open Font License : usage commercial libre).
// Auto-hébergée par next/font : aucune requête vers Google côté visiteur.
// Le corps de texte reste en Geist (déjà chargée par le layout racine).
export const displayFont = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-eatup-display',
  axes: ['opsz'],
  display: 'swap',
})
