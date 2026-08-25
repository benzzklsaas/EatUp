# EatUp — app mobile (Expo)

App native (iOS/Android) pour l'espace client du programme de fidélité EatUp.
Même stack que Vyno : Expo + expo-router + TypeScript + Supabase (même projet
Supabase que le site web — mêmes tables, mêmes programmes de fidélité).

**Scope actuel (v0.1)** : connexion par lien magique, carte fidélité (tampons/points),
QR code personnel, annuaire des restaurants équipés. Pas de commande/menu dans
l'app pour l'instant (ça reste sur le site web) — à ajouter plus tard si besoin.

## Setup

```bash
cd mobile
npm install
cp .env.example .env
# remplir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
# (mêmes valeurs que NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY côté web)
npx expo start
```

Scanne le QR code avec l'app **Expo Go** sur ton téléphone pour tester rapidement,
ou lance `npx expo run:ios` (nécessite Xcode) pour un build natif complet.

## Étape obligatoire côté Supabase avant de tester la connexion

Le lien magique redirige vers `eatup://auth/callback` (deep link natif, pas une
URL web). Il faut l'ajouter aux redirections autorisées :

**Dashboard Supabase → Authentication → URL Configuration → Redirect URLs**,
ajouter : `eatup://auth/callback`

Sans ça, Supabase refusera la connexion en la considérant comme une redirection
non autorisée.

## Pas encore fait

- Scanner QR côté commerçant en natif (reste sur le dashboard web pour l'instant,
  qui a déjà `Dashboard → Scanner`)
- Génération de la vraie carte Apple Wallet (.pkpass) — prévu une fois ce socle
  validé, nécessite le compte Apple Developer + Pass Type ID
- Icône, splash screen, screenshots App Store — à faire une fois le branding
  final choisi
