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

La liste des produits à illustrer n'est pas écrite à la main : elle vient de
`visuels/exports/pop/correspondance-eatup.json`, générée avec les visuels. Chaque entrée donne le nom
exact du produit EatUp, l'id de la photo et ses trois fichiers :

```json
{ "eatup": "Crousty M (sauce au choix)", "id": "crousty-m",
  "fichiers": { "borne": "borne/crousty-m.jpg", "borne-petit": "borne-petit/crousty-m.jpg", "web": "web/crousty-m.jpg" } }
```

Depuis le dossier EatUp, avec le fichier `.env.local` contenant `NEXT_PUBLIC_SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` :

```bash
# 1. Vérifier : liste des produits remplacés / inchangés, contrôle des fichiers et dimensions. Rien n'est écrit.
node --env-file=.env.local scripts/import-product-photos.mjs \
  --restaurant crousty-naan \
  --source ~/Projects/crousty-naan/visuels/exports/pop

# 2. Importer : la même commande avec --apply
#    (une sauvegarde des anciennes URL est écrite : photo-import-sauvegarde-….json)

# 3. Revenir en arrière si besoin
node --env-file=.env.local scripts/import-product-photos.mjs --rollback photo-import-sauvegarde-….json
```

- Noms comparés sans tenir compte de la casse, des accents ni de la ponctuation, mais en entier :
  « Smash » ne capte ni « Smash Burger » ni « Double Smash », « Frite » ne capte pas « Frites Cheddar ».
- Un produit absent de la correspondance garde sa photo actuelle (ou aucune) : chez Croustys Naan,
  Naan Nutella, Naan Miel et Cheese Naan (seul) en attendant leur photo maison.
- Une entrée dont le nom ne correspond à aucun produit est signalée, avec les produits proches, et
  n'écrit rien : corriger le nom dans la correspondance (côté visuels), puis relancer.
- L'import s'arrête avant toute écriture si la correspondance est invalide (id hors `a-z 0-9 -`, chemin
  hors de son dossier, doublon) ou si un fichier manque ou n'a pas les dimensions attendues.
- Après une nouvelle génération des visuels, relancer simplement l'import : l'URL porte un paramètre de
  version (`?v=…`) qui contourne les caches.
- Pour un autre restaurant : même commande avec son `--restaurant` et son dossier d'exports
  (`--correspondance <fichier>` si la correspondance est rangée ailleurs).
