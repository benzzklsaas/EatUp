# Photos produits en plusieurs tailles

Certaines photos sont livrées déjà préparées en trois tailles (exemple : visuels « pop street » de
Croustys Naan, générés par `visuels/outils/composer.py` du dépôt du site). Elles sont importées telles
quelles — ni recadrées, ni recompressées — et le navigateur choisit la taille utile.

| Taille | Dossier source | Fichier stocké | Utilisé pour |
|---|---|---|---|
| 540 × 360 | `borne-petit/<id>.jpg` | `<restaurant>/pop/<id>@540.jpg` | vignettes (liste, panier, paiement) |
| 1350 × 1080 | `borne/<id>.jpg` | `<restaurant>/pop/<id>@1350.jpg` | fiche produit ; URL enregistrée dans `products.image_url` |
| 1600 × 1280 | `web/<id>.jpg` | `<restaurant>/pop/<id>@1600.jpg` | fiche produit sur écran très dense |

Les fichiers vont dans le bucket Supabase `products`. Toute URL `…@1350.jpg` est reconnue
(`lib/eatup/images.ts`) et affichée avec un `srcset` : vignettes → 540 (1350 en secours),
fiche produit → 1350 ou 1600, jamais le petit format. Les autres photos restent affichées comme avant.

Affichage : `object-fit: cover` centré, sans texte, dégradé ni filtre par-dessus. Les cadres restent
entre 1:1 et 16:10 : vignettes carrées, fiche produit 4:3 sur mobile et 16:10 sur ordinateur.

## Importer (sur le poste qui possède les fichiers)

Depuis le dossier EatUp, avec le fichier `.env.local` contenant `NEXT_PUBLIC_SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` :

```bash
# 1. Vérifier : liste des produits remplacés / inchangés, contrôle des fichiers et dimensions. Rien n'est écrit.
node --env-file=.env.local scripts/import-product-photos.mjs \
  --map scripts/photo-maps/crousty-naan.json \
  --source ~/Projects/crousty-naan/visuels/exports/pop

# 2. Importer : la même commande avec --apply
#    (une sauvegarde des anciennes URL est écrite : photo-import-sauvegarde-….json)

# 3. Revenir en arrière si besoin
node --env-file=.env.local scripts/import-product-photos.mjs --rollback photo-import-sauvegarde-….json
```

- La correspondance produit → fichier est dans `scripts/photo-maps/<restaurant>.json` (noms comparés
  sans tenir compte de la casse, des accents ni de la ponctuation, mais en entier : « Frites Cheddar »
  ne capte pas « Frites Cheddar Bacon Oignons frits »).
- L'import s'arrête avant toute écriture si un fichier manque ou n'a pas les dimensions attendues.
- Après une nouvelle génération des visuels, relancer simplement l'import : l'URL porte un paramètre de
  version (`?v=…`) qui contourne les caches.
- Pour un autre restaurant : copier la table de correspondance et adapter `restaurant`, `storagePrefix` et
  la liste des photos.
