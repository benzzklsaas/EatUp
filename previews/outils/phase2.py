"""Phase 2 — application de la scène A validée à toute la carte.

Usage : python3 -I phase2.py <scratchpad> <prep|render|compose> [--samples N] [--only slug,slug]

Chaque produit : détourage (liseré « sticker » retiré) → classe de prise de vue (plongée 43°, vue 25° ou vue
rasante 10°) → objet fantôme à ses dimensions pour les ombres → pose de la vraie photo dans le décor commun.
Les plateaux (décor) sont rendus une fois par classe : toute la carte partage la même table, la même serviette,
la même lumière.
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

S, STEP = sys.argv[1], sys.argv[2]
SAMPLES = int(sys.argv[sys.argv.index('--samples') + 1]) if '--samples' in sys.argv else 128
ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
T, D = f'{S}/tools', f'{S}/p2'
BPY = f'{S}/bvenv/bin/python'

# slug, nom carte, classe, fourchette, fantôme, profondeur relative, rotation (°), fichier détourage
DRINK = ('LOW', False, 'cyl', 1.0, 0)
P = [
    ('crousty-m', 'Crousty M (sauce au choix)', 'HIGH', True, 'bowl', 1, 0, f'{S}/work/crousty-m_cutout_clean.png'),
    ('crousty-l', 'Crousty L (sauce au choix)', 'HIGH', True, 'bowl', 1, 0, None),
    ('salade-east-side', 'Salade East Side', 'HIGH', True, 'bowl', 1, 0, None),
    ('salade-veggie', 'Salade Veggie', 'HIGH', True, 'bowl', 1, 0, None),
    ('salade-ranch', 'Salade Ranch', 'HIGH', True, 'bowl', 1, 0, f'{D}/cut/salade-ranch_isnet.png'),
    ('frites', 'Frite', 'HIGH', False, 'foot', 0.05, 0, None),
    ('frites-cheddar', 'Frites Cheddar', 'HIGH', False, 'foot', 0.07, 0, f'{D}/cut/frites-cheddar_clean.png'),
    ('frites-cheddar-bacon', 'Frites Cheddar Bacon Oignons frits', 'HIGH', False, 'foot', 0.07, 0, f'{D}/cut/frites-cheddar-bacon_clean.png'),
    ('tacos-m', 'Tacos M', 'HIGH', False, 'foot', 0.03, 0, None),
    ('tacos-l', 'Tacos L', 'HIGH', False, 'foot', 0.03, 0, None),
    ('tacos-xl', 'Tacos XL', 'HIGH', False, 'foot', 0.03, 0, None),
    ('tarte-daim', 'Tarte au Daim', 'HIGH', False, 'foot', 0.035, 0, None),
    ('sandwich-classic', 'Sandwich Classic', 'MID', False, 'foot', 0.06, 0, None),
    ('sandwich-galette', 'Sandwich Galette', 'MID', False, 'foot', 0.06, 0, None),
    ('sandwich-cheese-naan', 'Sandwich Cheese Naan', 'MID', False, 'foot', 0.06, 0, None),
    ('tenders', 'Tenders maison X4', 'MID', False, 'foot', 0.04, 0, f'{D}/cut/tenders_clean.png'),
    ('smash', 'Smash', 'LOW', False, 'cyl', 1.0, 0, None),
    ('smash-burger', 'Smash Burger', 'LOW', False, 'cyl', 1.0, 0, None),
    ('double-smash', 'Double Smash', 'LOW', False, 'cyl', 1.0, 0, None),
    ('smash-mountain', 'Smash Mountain', 'LOW', False, 'cyl', 1.0, 0, None),
    ('big-bk', 'Big BK', 'LOW', False, 'cyl', 1.0, 0, None),
    ('capri-sun', 'CapriSun', 'LOW', False, 'box', 0.30, 0, None),
] + [(s_, n_, *DRINK, None) for s_, n_ in [
    ('coca-cola', 'Coca-Cola'), ('coca-zero', 'Coca-Cola Zéro'), ('coca-cherry', 'Coca-Cola Cherry'),
    ('dr-pepper', 'Dr Pepper Original'), ('fanta-orange', 'Fanta Orange'), ('fanta-tropical', 'Fanta Tropical'),
    ('fanta-mangue-dragon', 'Fanta Mangue Dragon'), ('fuze-tea', 'Fuze Tea'), ('lipton-peche', 'Lipton Ice Tea Pêche'),
    ('lipton-framboise', 'Lipton Ice Tea Framboise'), ('lipton-pasteque-menthe', 'Lipton Ice Tea Pastèque Menthe'),
    ('oasis-tropical', 'Oasis Tropical'), ('oasis-pomme-poire', 'Oasis Pomme Poire'),
    ('oasis-pomme-cassis-framboise', 'Oasis Pomme Cassis Framboise'), ('oasis-fraise-framboise', 'Oasis Fraise Framboise'),
    ('orangina', 'Orangina'), ('perrier', 'Perrier'), ('cristaline', 'Cristaline 50cl')]]
P = [p if p[0] != 'cristaline' else (*p[:7], f'{D}/cut/cristaline_clean.png') for p in P]   # culot restauré
PROD = {p[0]: p for p in P}


def plate_key(cls, fork):
    return f"{cls}{'_fourchette' if fork else ''}"


def cut_path(p):
    return p[7] or f'{D}/cut/{p[0]}.png'


def scale_for(p, h, w):
    """Aucun agrandissement pour les plats ; boissons et tenders (sources petites) : au plus × 1,6."""
    if p[0] == 'tenders':
        return 1.6
    if p[0] == 'salade-ranch':                               # bol photographié plus petit que les autres
        return 1.2
    if p[2] == 'LOW' and p[4] in ('cyl', 'box') and not p[0].startswith(('smash', 'double', 'big')):
        k = float(np.clip(734 / h, 1.0, 1.6))
        return 1.0 if k < 1.05 else k
    return 1.0


def footprint(p, s, plate):
    """Contour du produit (360 rayons depuis son centre) dans les coordonnées du plateau, produit posé avec
    le bas de sa silhouette 150 px sous la ligne de pose et centré horizontalement."""
    im = Image.open(cut_path(p)).convert('RGBA')
    if abs(s - 1) > 1e-3:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    a = np.asarray(im)[..., 3] > 127
    ys, xs = np.nonzero(a)
    ox = int(round(675 - (xs.min() + xs.max()) / 2))
    oy = int(round(930 + 150 - ys.max()))
    cy, cx = ys.mean(), xs.mean()
    pts = []
    for k in range(360):
        t = np.radians(k)
        r = np.arange(0, max(a.shape) * 1.5, 0.5)
        yy = np.clip((cy + r * np.sin(t)).astype(int), 0, a.shape[0] - 1)
        xx = np.clip((cx + r * np.cos(t)).astype(int), 0, a.shape[1] - 1)
        inside = a[yy, xx] & (cy + r * np.sin(t) < a.shape[0]) & (cx + r * np.cos(t) < a.shape[1]) \
            & (cy + r * np.sin(t) >= 0) & (cx + r * np.cos(t) >= 0)
        rr = r[np.nonzero(inside)[0].max()] - 3.0 if inside.any() else 0.0   # 3 px en retrait du bord
        pts.append([float(ox + cx + rr * np.cos(t)), float(oy + cy + rr * np.sin(t))])
    return {'contour': pts, 'placement': [ox, oy, im.width, im.height]}


def inset_for(p):
    """Largeur du fantôme / largeur du produit : le pied doit rester caché par la photo."""
    if p[2] != 'LOW':
        return 0.96
    if p[0] == 'capri-sun':
        return 0.80
    if p[0].startswith(('smash', 'double', 'big')):
        return 0.86                                          # pain du bas plus étroit que les steaks
    return 0.82                                              # canettes et bouteilles : fond rétréci


def bpy_run(cfg, name):
    path = f'{D}/cfg/{name}.json'
    json.dump(cfg, open(path, 'w'))
    if os.path.exists(cfg['out']) and os.path.exists(cfg['json']):
        return
    r = subprocess.run([BPY, f'{T}/scene_card.py', path], capture_output=True, text=True)
    line = [ln for ln in r.stdout.splitlines() if ln.startswith('ok')]
    print(name, line[0] if line else ('ÉCHEC\n' + r.stdout[-800:] + r.stderr[-800:]), flush=True)


os.makedirs(f'{D}/cfg', exist_ok=True)
os.makedirs(f'{D}/render', exist_ok=True)
os.makedirs(f'{D}/out', exist_ok=True)
os.makedirs(f'{D}/cache', exist_ok=True)
items = [p for p in P if not ONLY or p[0] in ONLY]

if STEP == 'prep':
    for p in items:
        a = np.asarray(Image.open(cut_path(p)).convert('RGBA'))[..., 3]
        ys, xs = np.nonzero(a > 127)
        h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
        s = scale_for(p, h, w)
        print(f'{p[0]:<30} {p[2]:<4} {p[4]:<4} {w:>4}×{h:<4} px  échelle {s:.2f}')

elif STEP == 'render':
    plates = sorted({(p[2], p[3]) for p in items})
    for cls, fork in plates:
        k = plate_key(cls, fork)
        base = {'cls': cls, 'fork': fork, 'proxy': None, 'cache': f'{D}/cache'}
        bpy_run({**base, 'scale': 1.0, 'samples': SAMPLES, 'out': f'{D}/render/{k}.png', 'json': f'{D}/render/{k}.json'}, k)
        bpy_run({**base, 'scale': 0.5, 'samples': 48, 'out': f'{D}/render/{k}_lo.png', 'json': f'{D}/render/{k}_lo.json'}, k + '_lo')
    for p in items:
        a = np.asarray(Image.open(cut_path(p)).convert('RGBA'))[..., 3]
        ys, xs = np.nonzero(a > 127)
        h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
        s = scale_for(p, h, w)
        k = plate_key(p[2], p[3])
        if p[4] == 'foot':
            proxy = {'type': 'foot', 'height': p[5], **footprint(p, s, k)}
        else:
            proxy = {'type': p[4], 'w_px': float(w * s), 'h_px': float(h * s), 'depth': p[5], 'rotz': p[6],
                     'inset': inset_for(p)}
        bpy_run({'cls': p[2], 'fork': p[3], 'cache': f'{D}/cache', 'scale': 0.5, 'samples': 48, 'proxy': proxy,
                 'out': f'{D}/render/ombre_{p[0]}.png', 'json': f'{D}/render/ombre_{p[0]}.json'}, f'ombre_{p[0]}')

elif STEP == 'compose':
    for p in items:
        a = np.asarray(Image.open(cut_path(p)).convert('RGBA'))[..., 3]
        ys, xs = np.nonzero(a > 127)
        s = scale_for(p, ys.max() - ys.min() + 1, xs.max() - xs.min() + 1)
        k = plate_key(p[2], p[3])
        cfg = {'plate': f'{D}/render/{k}.png', 'plate_lo': f'{D}/render/{k}_lo.png',
               'shadow_lo': f'{D}/render/ombre_{p[0]}.png', 'shadow_json': f'{D}/render/ombre_{p[0]}.json',
               'cut': cut_path(p), 'scale': s, 'side': 0.10 if p[2] == 'HIGH' else 0.07,
               'dof_max': {'HIGH': 9, 'MID': 11, 'LOW': 15}[p[2]],
               'shadow_floor': {'HIGH': 0.18, 'MID': 0.25, 'LOW': 0.38}[p[2]],
               'out': f'{D}/out/{p[0]}@1350.jpg', 'square': f'{D}/out/{p[0]}_carre@1080.jpg'}
        json.dump(cfg, open(f'{D}/cfg/compose_{p[0]}.json', 'w'))
        r = subprocess.run([sys.executable, '-I', f'{T}/compose_card.py', f'{D}/cfg/compose_{p[0]}.json'], capture_output=True, text=True)
        print((r.stdout.strip() or r.stderr[-600:]).replace(f'{D}/out/', ''), flush=True)
