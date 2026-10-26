# Refonte photographique de la carte — Croustys Naan

Dossier de travail **hors production** : rien ici n'est lu par le site. Aucun fichier de production
n'est remplacé pendant la phase 1.

```
previews/
  original/      copies intactes des photos d'origine
  variants/      pistes de fond (A pierre, B anthracite, C crème, D éventuelle)
  comparisons/   avant/après, planches côte à côte, simulations borne et mobile
  final/         image maîtresse retenue + déclinaisons par support
```

## 1. Où sont les photos

| Élément | Constat |
|---|---|
| Stockage | Supabase Storage, bucket public `products` |
| Référence | colonne `products.image_url` (URL publique complète) |
| Envoi | tableau de bord → Menu → Produits (`app/dashboard/menu/page.tsx:136`), nom `${Date.now()}.${ext}`, **aucun redimensionnement ni recadrage** à l'envoi, tout format `image/*` accepté |
| Dans le dépôt | aucune photo produit (seulement le logo EatUp et des SVG) |
| Diffusion | `components/eatup/food-image.tsx` : les URL Supabase passent par `next/image` (AVIF/WebP, qualité 75, redimensionnement automatique) |

## 2. Supports et contraintes d'affichage

Toutes les vignettes sont en `object-cover` centré : l'image est **recadrée automatiquement** au ratio du cadre.

| Emplacement | Cadre affiché | Ratio | Particularités |
|---|---|---|---|
| Carte produit (liste du menu) | 112 × 112 px (mobile), 124 × 124 px (≥ 640 px) | 1:1 | coins arrondis 18 px, fond `sand #E5E0D7`, carte blanche sur page crème `#F7F4EE`. **Le bouton « + » orange (44 px + anneau blanc 4 px) recouvre environ 40 × 40 px du coin bas-droit de la vignette.** |
| Fiche produit (mobile) | pleine largeur, ~390 × 292 px | 4:3 | hauteur max 44 vh ; dégradé sombre sur les 96 px du haut (bouton fermer) |
| Fiche produit (≥ 640 px) | 540 × 338 px | 16:10 | même dégradé en haut |
| Suggestion de boisson (panier) | 132 px de large | — | boissons uniquement |
| Panier | 60 × 60 px | 1:1 | |
| Récapitulatif de commande | 48 × 48 px | 1:1 | coins arrondis 12 px |
| Tableau de bord (liste / formulaire) | 72 × 72 px / 64 × 64 px | 1:1 | non optimisé (`<img>` direct) |
| Mode « Victime de son succès » | vignette 1:1 | — | passée en niveaux de gris à 80 % et assombrie |

**Borne de commande** : aucune interface de borne n'existe dans ce dépôt. À confirmer : logiciel/fournisseur,
résolution et orientation de l'écran, et surtout si la borne lit les mêmes `image_url` Supabase ou un catalogue
séparé. En attendant, la simulation de contrôle utilisera une borne portrait 1080 × 1920 avec une grille de
tuiles de type « grandes enseignes ».

### Conséquences pour le cadrage

- Une même image maîtresse **4:3 paysage** couvre tous les cas : la fiche mobile l'affiche entière, la fiche
  desktop en retire ~8 % en haut et en bas, la vignette carrée n'en garde que le **carré central** (75 % de la largeur).
- Le plat doit donc tenir entièrement dans le carré central, avec une marge, et rester lisible à 112 px.
- Le coin bas-droit de la vignette est masqué par le bouton « + » : pas de détail important à cet endroit.
- Le haut de l'image est assombri dans la fiche : le plat doit être centré, légèrement bas plutôt que haut.
- Résolution utile : `next/image` génère au plus ~1 200 px de large pour un téléphone 3×. Image maîtresse cible
  1 600 × 1 200 px minimum, 2 048 × 1 536 px si l'original le permet — **jamais d'agrandissement artificiel**.
- Les photos actuelles sont servies telles qu'envoyées (parfois plusieurs Mo) : l'export final sera un JPEG
  qualité 85–88, sRGB, sans métadonnées, ~250–450 Ko pour la maîtresse ; `next/image` produit ensuite AVIF/WebP.

## 3. Intégration sans casser les références (phase 2 uniquement)

Méthode prévue, à valider :

1. Envoyer chaque nouvelle photo **sous un nouveau nom** dans le bucket `products` (les anciens fichiers restent en place).
2. Mettre à jour uniquement `products.image_url` du produit concerné ; identifiants, prix, catégories, options
   et formules ne sont pas touchés.
3. Tenir une table de correspondance `produit → ancienne URL → nouvelle URL` : le retour arrière consiste à
   restaurer l'ancienne URL, sans perte.
4. Un nouveau nom de fichier évite aussi de servir l'ancienne version depuis le cache de `next/image`.

## 4. Outils disponibles (aucune dépendance ajoutée au projet)

- Python 3 + Pillow 12 + NumPy, ImageMagick, ffmpeg : retouche, compositing, export.
- onnxruntime 1.29 + modèle de détourage ISNet (téléchargé hors dépôt) : détourage du plat pour reconstruire
  le fond et l'ombre de contact.
- Chromium + Playwright : rendu des simulations borne / fiche mobile à la taille réelle.

## 5. État de la phase 1

**Bloquée en attente des photos.** Le stockage Supabase (`*.supabase.co`) et le site public (`eatup-app.fr`)
sont refusés par la politique réseau de l'environnement de travail : les photos actuelles ne peuvent pas être
téléchargées. Aucune photo n'a été inventée ou simulée en remplacement.
