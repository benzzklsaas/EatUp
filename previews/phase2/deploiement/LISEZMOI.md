# Déploiement des nouvelles photos — Croustys Naan

Rien n'a été modifié en production : ce dossier prépare le remplacement, à faire **après votre contrôle final**.
Le remplacement ne touche que la colonne `products.image_url`. Identifiants, noms, prix, catégories, options,
formules et disponibilités ne changent pas. Les anciennes photos restent dans le stockage.

## 1. Contrôle final

- Parcourir `../controle/carte-complete.jpg` (toute la carte) et `../controle/avant-apres-carte.jpg`.
- Lire la colonne `statut` de `../correspondance.csv` :
  - `prête` : incluse dans la mise à jour ;
  - `à vérifier` / `non conforme` : **ligne commentée** dans le SQL, à décommenter seulement après validation ;
  - `sans photo` / `sans nouvelle photo` : rien ne change pour ce produit.

## 2. Envoi des fichiers (site / click & collect)

Supabase → **Storage** → bucket **products** → dossier **crousty-naan** → créer le dossier **scene** →
y déposer tous les fichiers de `../site/` (noms inchangés, par exemple `crousty-m@1350.jpg`).

Vérification : l'adresse
`https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/crousty-naan/scene/crousty-m@1350.jpg`
doit afficher la nouvelle photo.

## 3. Bascule

Supabase → **SQL Editor** → coller `1-mise-a-jour.sql` → **Run**.

Le script :
1. sauvegarde les URL actuelles dans `products_image_backup_20261026` (RLS activée : invisible depuis le site) ;
2. met à jour chaque produit **uniquement si son URL actuelle est encore l'ancienne** (aucun écrasement d'une
   photo changée entre-temps depuis le tableau de bord).

Le site affiche les nouvelles photos immédiatement (nouvelles adresses : pas de cache à vider).

## 4. Retour arrière

Supabase → **SQL Editor** → coller `2-retour-arriere.sql` → **Run** : toutes les anciennes URL sont restaurées.

## 5. Borne de commande

La borne n'utilise probablement pas Supabase (Tabesto ?). Importer dans son back-office, fiche par fiche, les
images carrées de `../borne/` (même nom de produit, suffixe `_carre@1080.jpg`), ou les images 5:4 de `../site/`
si la borne demande ce format.
