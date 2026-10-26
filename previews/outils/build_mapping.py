"""Phase 2 — correspondance anciens/nouveaux fichiers et scripts SQL (mise à jour + retour arrière).

Usage : python3 -I build_mapping.py <produits.json> <dossier phase2 du dépôt>
Rien n'est exécuté ici : les scripts SQL sont à lancer à la main dans Supabase (SQL Editor) après l'envoi
des fichiers. Chaque mise à jour est gardée par l'ancienne URL (aucun écrasement si la ligne a changé entre-temps).
"""
import csv
import hashlib
import json
import os
import sys

prods = json.load(open(sys.argv[1]))
P2 = sys.argv[2]
BASE = 'https://qappvsiwlgiuoqoxheyu.supabase.co/storage/v1/object/public/products/'
FOLDER = 'crousty-naan/scene/'
BACKUP = 'products_image_backup_20261026'

# Statut par photo (nom de fichier sans @1350.jpg). Par défaut : prête.
STATUS = {
    'tenders': ('non conforme', "la photo montre 6-7 tenders pour un produit « X4 » : nouvelle photo de 4 tenders nécessaire"),
    'sandwich-cheese-naan': ('à vérifier', "photo très basse définition qui ressemble à une image de banque : confirmer qu'elle représente le produit servi"),
    'tacos-m': ('à vérifier', 'même photo pour les tailles M, L et XL (préexistant) : la taille ne se voit pas'),
    'tacos-l': ('à vérifier', 'même photo pour les tailles M, L et XL (préexistant)'),
    'tacos-xl': ('à vérifier', 'même photo pour les tailles M, L et XL (préexistant)'),
    'smash-burger': ('à vérifier', 'photo identique à « Smash » (préexistant) : deux produits, une seule photo'),
    '1783261327105': ('sans nouvelle photo', 'source de 540 × 360 px (produit ~240 px) : trop petite pour une scène de qualité, nouvelle photo nécessaire'),
}

rows, sql, back = [], [], []
for p in prods:
    url = p['image_url']
    slug = url.split('/')[-1].split('@')[0].split('.')[0] if url else None
    new_file = f'{P2}/site/{slug}@1350.jpg' if slug else None
    if not url:
        status, note, new_url = 'sans photo', 'aucune photo actuelle : nouvelle photo à fournir', ''
    elif not os.path.exists(new_file):
        status, note = STATUS.get(slug, ('sans nouvelle photo', ''))
        new_url = ''
    else:
        status, note = STATUS.get(slug, ('prête', ''))
        v = hashlib.sha256(open(new_file, 'rb').read()).hexdigest()[:8]
        new_url = f'{BASE}{FOLDER}{slug}@1350.jpg?v={v}'
    rows.append({'id': p['id'], 'produit': p['name'], 'categorie': p['category'], 'statut': status, 'remarque': note,
                 'photo_actuelle': url or '', 'nouvelle_photo': new_url,
                 'fichier_site': f'site/{slug}@1350.jpg' if new_url else '',
                 'fichier_borne': f'borne/{slug}_carre@1080.jpg' if new_url else ''})
    if new_url:
        q = (f"update public.products set image_url = '{new_url}'\n"
             f"  where id = '{p['id']}' and image_url = '{url}';  -- {p['name']}")
        sql.append(q if status == 'prête' else '\n'.join('-- ' + ln for ln in q.splitlines()) + f'   ({status})')

with open(f'{P2}/correspondance.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

os.makedirs(f'{P2}/deploiement', exist_ok=True)
ready = sum(1 for r in rows if r['statut'] == 'prête')
open(f'{P2}/deploiement/1-mise-a-jour.sql', 'w').write(f"""-- Croustys Naan — nouvelles photos de la carte (scène « table en noyer »)
-- À exécuter dans Supabase > SQL Editor APRÈS avoir envoyé les fichiers de phase2/site/ dans le bucket
-- « products », dossier « {FOLDER} » (les anciens fichiers restent en place).
-- Seule la colonne image_url change ; identifiants, prix, catégories, options et formules ne sont pas touchés.
-- {ready} lignes prêtes ; les lignes « à vérifier » / « non conforme » sont commentées : décommentez-les après validation.

begin;

-- 1. sauvegarde des URL actuelles (sert au retour arrière)
create table if not exists public.{BACKUP} as
  select id, name, image_url, now() as saved_at from public.products where false;
-- RLS activée sans politique : la sauvegarde n'est pas accessible par l'API publique du site
alter table public.{BACKUP} enable row level security;
insert into public.{BACKUP} (id, name, image_url, saved_at)
  select id, name, image_url, now() from public.products
  where id in ({', '.join("'" + r['id'] + "'" for r in rows if r['nouvelle_photo'])})
    and id not in (select id from public.{BACKUP});

-- 2. nouvelles photos (chaque ligne ne change que si l'URL actuelle est encore l'ancienne)
{chr(10).join(sql)}

commit;
""")
open(f'{P2}/deploiement/2-retour-arriere.sql', 'w').write(f"""-- Croustys Naan — retour aux photos précédentes (annule 1-mise-a-jour.sql)
-- Les anciens fichiers n'ont jamais été supprimés du bucket : restaurer l'URL suffit.
begin;
update public.products p set image_url = b.image_url
  from public.{BACKUP} b
  where p.id = b.id;
commit;
-- Une fois les nouvelles photos validées en ligne, la sauvegarde peut être supprimée :
-- drop table public.{BACKUP};
""")
counts = {}
for r in rows:
    counts[r['statut']] = counts.get(r['statut'], 0) + 1
print(json.dumps(counts, ensure_ascii=False))
