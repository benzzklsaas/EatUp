import type { CapacitorConfig } from '@capacitor/cli'

// EatUp — coque native (iOS/Android) autour du site web existant.
// Le WebView charge directement l'app déployée (server.url) : on ne
// duplique aucun code, l'app native affiche la même expérience que
// le site, avec en plus l'accès aux fonctions natives (caméra pour
// le scanner QR fidélité, notifications).
//
// ⚠️ Remplace `server.url` par ton vrai domaine de production avant
// tout build de release (ne jamais publier une app pointant vers une
// URL de preview Vercel, qui expire).
const config: CapacitorConfig = {
  appId: 'fr.eatup.app',
  appName: 'EatUp',
  webDir: 'public', // requis par Capacitor mais inutilisé en mode server.url
  server: {
    url: 'https://eatup-app.fr',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
}

export default config
