# Visuels de la carte EatUp

Pipeline Python qui transforme les photos des plats et des boissons en visuels
homogènes pour la carte : produit détouré en grand au premier plan sur un
comptoir inox, fond de diner flou dans des tons chauds, et badge « NEW » en option.

Les photos originales ne sont jamais modifiées. Le script ne télécharge aucune
image et n'ajoute rien qui ne figure pas sur vos photos.

## Dossier

```
visuels-carte/
  reference.jpg     photo d'inspiration (style uniquement, jamais réutilisée)
  plats/            vos photos de plats
  boissons/         vos photos de canettes et bouteilles
  config.yaml       associations plat -> boissons -> badge NEW, dimensions réelles
  pipeline/         scripts
  inventaire/       résultat de l'étape 1 (généré)
  export/           visuels finaux 1200x1200 JPG + WebP (généré)
  cache/            masques de détourage (généré, non versionné)
```

## Installation

```
pip install -r requirements.txt
```

Le modèle de détourage (`birefnet-general`, environ 1 Go) est téléchargé
automatiquement au premier lancement. Il demande environ 8 Go de RAM. Sur une
machine plus modeste, ajoutez `--modele isnet-general-use` (plus léger, contours
un peu moins fins).

## Étapes

1. **Inventaire** : note chaque photo (netteté, lumière, facilité de détourage,
   cadrage) et signale celles qui donneront un mauvais résultat.

   ```
   python pipeline/inventaire.py
   ```

   Résultat dans `inventaire/inventaire.md` (aussi en `.csv`), avec un aperçu de
   chaque détourage sur fond sombre et sur fond rouge dans
   `inventaire/planche-detourages.jpg` pour repérer les halos.

2. **Associations** : remplir `config.yaml` (plat, accompagnement, boissons,
   badge NEW, dimensions réelles).

3. **Génération** des visuels et de la planche contact dans `export/`. Ce script
   sera ajouté après validation du premier visuel test.
