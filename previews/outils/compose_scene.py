"""Pose la vraie photo détourée du plat dans la scène rendue (scene.py).

Usage : python3 -I compose_scene.py <rendu.png> <rendu.json> <détourage.png> <sortie.png> [réglages JSON]

- Alignement : la silhouette du plat (alpha > 0,5) est centrée sur le bol fantôme et son pied posé
  exactement sur la base du bol fantôme (là où naissent les ombres de contact rendues).
- Aucun agrandissement du plat : échelle 1:1 (le bol fantôme a été calé à 868 px de large).
- Raccord lumière : léger dégradé gauche/droite (fenêtre à gauche), balance des blancs et densité
  ajustées à la scène, habillage lumineux de 2 px, grain commun à toute l'image.
"""
import json
import sys

import numpy as np
from PIL import Image

render_p, json_p, cut_p, out_p = sys.argv[1:5]
cfg = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
rng = np.random.default_rng(11)


def box(a, r):
    if r <= 0:
        return a
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        a = ((np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)).astype(np.float32)
    return a


def blur(a, sigma):
    r = max(1, int(round((np.sqrt(1 + 4 * sigma * sigma) - 1) / 2)))
    for _ in range(3):
        a = box(a, r)
    return a


bg = np.asarray(Image.open(render_p).convert('RGB')).astype(np.float32)
H, W, _ = bg.shape
meta = json.load(open(json_p))
s = W / 1350.0                                   # rendu d'aperçu possible à échelle réduite
x0, y0, x1, y1 = [v * s for v in meta['bbox']]


def table_depth(cam, W, H):
    """Distance caméra → table (plan z = 0) pour chaque pixel (les accessoires font quelques mm)."""
    R = np.array(cam['rot'], np.float32)
    loc = np.array(cam['loc'], np.float32)
    sw = cam['sensor']
    sh = sw * H / W
    u = ((np.arange(W, dtype=np.float32) + 0.5) / W - 0.5 + cam['shift_x']) * sw
    v = (0.5 - (np.arange(H, dtype=np.float32) + 0.5) / H) * sh + cam['shift_y'] * sw
    U, V = np.meshgrid(u, v)
    d = np.stack([U, V, np.full_like(U, -cam['lens'])], -1) @ R.T
    t = -loc[2] / d[..., 2]
    return t * np.linalg.norm(d, axis=-1)


def focus_stack_blur(img, depth, near, far, slope, max_sigma):
    """Net entre near et far (toute la profondeur du plat), puis flou croissant au-delà — comme un
    assemblage de mises au point : plat et table proche nets, arrière-plan adouci."""
    over = np.where(depth > far, depth - far, np.where(depth < near, (near - depth) * 0.6, 0.0))
    sig = np.clip(over * slope, 0, max_sigma)
    levels = [0.0, 1.0, 2.0, 3.5, 5.5, 8.0, 11.0]
    stack = [img] + [np.stack([blur(img[..., i], s_) for i in range(3)], -1) for s_ in levels[1:]]
    out = np.zeros_like(img)
    idx = np.interp(sig, levels, np.arange(len(levels)))
    lo = np.floor(idx).astype(int)
    hi = np.minimum(lo + 1, len(levels) - 1)
    f = (idx - lo)[..., None]
    for k in range(len(levels)):
        out += stack[k] * ((lo == k)[..., None] * (1 - f) + (hi == k)[..., None] * f)
    return out


if 'cam' in meta and cfg.get('dof', True):
    dep = table_depth(meta['cam'], W, H)
    d0 = meta['dist']
    bg = focus_stack_blur(bg, dep, d0 - 0.10, d0 + 0.09, cfg.get('dof_slope', 55.0) * s, cfg.get('dof_max', 9.0) * s)

cut = Image.open(cut_p).convert('RGBA')
if s != 1.0:
    cut = cut.resize((round(cut.width * s), round(cut.height * s)), Image.LANCZOS)
cut = np.asarray(cut).astype(np.float32)
rgb, a = cut[..., :3], cut[..., 3] / 255.0
ys, xs = np.nonzero(a > 0.5)
cx_cut, by_cut = (xs.min() + xs.max()) / 2, ys.max()
ox = int(round((x0 + x1) / 2 - cx_cut))
oy = int(round(y1 - by_cut + cfg.get('dy', 0)))

# --- raccord lumière du plat ---
ch, cw = a.shape
gx = np.linspace(-1, 1, cw, dtype=np.float32)[None, :]
gy = np.linspace(-1, 1, ch, dtype=np.float32)[:, None]
side = 1 + cfg.get('side', 0.06) * (-gx) + cfg.get('top', 0.0) * (-gy)       # plus clair côté fenêtre
gain = np.array(cfg.get('wb', [1.0, 1.0, 1.0]), np.float32) * cfg.get('exposure', 1.0)
rgb = np.clip(rgb * side[..., None] * gain, 0, 255)

# --- pose ---
lay = np.zeros_like(bg)
la = np.zeros((H, W), np.float32)
ya, yb = max(oy, 0), min(oy + ch, H)
xa, xb = max(ox, 0), min(ox + cw, W)
lay[ya:yb, xa:xb] = rgb[ya - oy:yb - oy, xa - ox:xb - ox]
la[ya:yb, xa:xb] = a[ya - oy:yb - oy, xa - ox:xb - ox]

# habillage lumineux : la lumière de la scène déborde à peine sur le bord du plat
ring = la * (1 - np.clip(blur(la, 2.0) * 1.7 - 0.7, 0, 1))
env = np.stack([blur(bg[..., i] * (1 - la), 5) for i in range(3)], -1)
wt = blur(1 - la, 5)[..., None] + 1e-4
env = env / wt
k = cfg.get('wrap', 0.22) * ring[..., None]
lay = lay * (1 - k) + env * k

out = lay * la[..., None] + bg * (1 - la[..., None])

# --- finition commune : légère courbe, vignettage doux, grain photo ---
if cfg.get('contrast', 1.0) != 1.0:
    out = 128 + (out - 128) * cfg['contrast']
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r2 = ((xx - W / 2) / (W / 2)) ** 2 * 0.8 + ((yy - H * 0.52) / (H / 2)) ** 2
out *= (1 - cfg.get('vignette', 0.06) * np.clip(r2 - 0.3, 0, None))[..., None]
out += rng.normal(0, cfg.get('grain', 1.6), out.shape).astype(np.float32)
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(out_p)
json.dump({'ox': ox, 'oy': oy}, open(out_p + '.json', 'w'))
print(f'{out_p}: plat posé en ({ox},{oy}), base alignée sur y={y1:.0f}')
