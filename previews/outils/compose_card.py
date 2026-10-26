"""Phase 2 — assemble une photo de la carte : plateau + ombre du produit + vraie photo du produit.

Usage : python3 -I compose_card.py <config.json>
config : {"plate": plateau.png (pleine résolution), "plate_lo": plateau sans fantôme (½ résolution),
          "shadow_lo": plateau avec fantôme (½), "shadow_json": .., "cut": détourage.png, "scale": s,
          "side": 0.08, "out": maîtresse.jpg, "square": carré.jpg, "dof_max": 9}
1. ombre : rapport (avec fantôme / sans fantôme) à ½ résolution, adouci puis agrandi, appliqué au plateau
   — ombres de contact et portées physiquement exactes, sans recalculer le décor ;
2. arrière-plan adouci selon la distance réelle (table, puis mur) : produit et table proche nets ;
3. pose du produit (centré sur le fantôme, pied sur sa base), raccord lumière, recadrage centré sur le produit.
"""
import json
import sys

import numpy as np
from PIL import Image

cfg = json.load(open(sys.argv[1]))
rng = np.random.default_rng(11)
OUT_W, OUT_H = 1350, 1080


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
    if sigma < 0.3:
        return a
    r = max(1, int(round((np.sqrt(1 + 4 * sigma * sigma) - 1) / 2)))
    for _ in range(3):
        a = box(a, r)
    return a


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


plate = load(cfg['plate'])
H, W, _ = plate.shape
lo, sh = load(cfg['plate_lo']), load(cfg['shadow_lo'])
meta = json.load(open(cfg['shadow_json']))
if meta.get('placement'):                                   # fantôme « empreinte » : position imposée
    ox_f, oy_f, cw_f, ch_f = meta['placement']
    x0, y0, x1, y1 = ox_f, oy_f, ox_f + cw_f, oy_f + ch_f
else:
    x0, y0, x1, y1 = meta['bbox']

# 1. ombre du produit
ratio = np.clip((sh + 2.0) / (lo + 2.0), cfg.get('shadow_floor', 0.18), 1.0)   # jamais de noir pur (lumière renvoyée)
ratio = np.stack([blur(ratio[..., i], 1.2) for i in range(3)], -1)
ratio = 1 - np.clip((1 - ratio) - 0.012, 0, 1)            # ignore le bruit résiduel (< 1,2 %)
up = np.stack([np.asarray(Image.fromarray(ratio[..., i], 'F').resize((W, H), Image.BICUBIC)) for i in range(3)], -1)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
near = np.clip(1 - (np.maximum(np.abs(xx - (x0 + x1) / 2) - (x1 - x0) / 2, 0) + np.maximum(yy - y1, 0) * 0.6
                    + np.maximum(y0 - yy, 0)) / 380.0, 0, 1)
up = 1 - (1 - np.clip(up, 0, 1)) * near[..., None]
bg = plate * up


# 2. arrière-plan adouci selon la distance (table puis mur)
def scene_depth(cam, wall_y):
    R = np.array(cam['rot'], np.float32)
    loc = np.array(cam['loc'], np.float32)
    sw = cam['sensor']
    shh = sw * H / W
    u = ((np.arange(W, dtype=np.float32) + 0.5) / W - 0.5 + cam['shift_x']) * sw
    v = (0.5 - (np.arange(H, dtype=np.float32) + 0.5) / H) * shh + cam['shift_y'] * sw
    U, V = np.meshgrid(u, v)
    d = np.stack([U, V, np.full_like(U, -cam['lens'])], -1) @ R.T
    with np.errstate(divide='ignore', invalid='ignore'):
        t_tab = np.where(d[..., 2] < 0, -loc[2] / d[..., 2], np.inf)
        hit_y = loc[1] + t_tab * d[..., 1]
        t_wall = (wall_y - loc[1]) / d[..., 1]
    t = np.where(hit_y < wall_y, t_tab, t_wall)
    return t * np.linalg.norm(d, axis=-1)


dep = scene_depth(meta['cam'], meta['wall_y'])
d0 = meta['dist']
over = np.where(dep > d0 + 0.08, dep - (d0 + 0.08), np.where(dep < d0 - 0.10, (d0 - 0.10 - dep) * 0.6, 0.0))
sig = np.clip(over * cfg.get('dof_slope', 55.0), 0, cfg.get('dof_max', 9.0))
levels = [0.0, 1.0, 2.0, 3.5, 5.5, 8.0, 11.0, 15.0]
stack = [bg] + [np.stack([blur(bg[..., i], s_) for i in range(3)], -1) for s_ in levels[1:]]
idx = np.interp(sig, levels, np.arange(len(levels)))
lo_i = np.floor(idx).astype(int)
hi_i = np.minimum(lo_i + 1, len(levels) - 1)
f = (idx - lo_i)[..., None]
bg = sum(stack[k] * ((lo_i == k)[..., None] * (1 - f) + (hi_i == k)[..., None] * f) for k in range(len(levels)))

# 3. produit
cut = Image.open(cfg['cut']).convert('RGBA')
s = cfg.get('scale', 1.0)
if abs(s - 1.0) > 1e-3:
    cut = cut.resize((round(cut.width * s), round(cut.height * s)), Image.LANCZOS)
cut = np.asarray(cut).astype(np.float32)
rgb, a = cut[..., :3], cut[..., 3] / 255.0
# bord resserré d'un pixel : élimine les derniers résidus clairs du liseré « sticker » d'origine
a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).MinFilter(3))).astype(np.float32) / 255.0
a = np.clip(0.5 * a + 0.5 * box(a, 1), 0, 1) * (a > 0)
if abs(s - 1.0) > 1e-3:                                     # léger renfort de netteté après agrandissement
    b_ = np.stack([blur(rgb[..., i], 1.0) for i in range(3)], -1)
    rgb = np.clip(rgb + 0.35 * (rgb - b_), 0, 255)
ys, xs = np.nonzero(a > 0.5)
if meta.get('placement'):
    ox, oy = int(meta['placement'][0]), int(meta['placement'][1])
else:
    ox = int(round((x0 + x1) / 2 - (xs.min() + xs.max()) / 2))
    oy = int(round(y1 - ys.max())) + 3                      # pied du produit 3 px sous celui du fantôme
ch, cw = a.shape
gx = np.linspace(-1, 1, cw, dtype=np.float32)[None, :]
rgb = np.clip(rgb * (1 + cfg.get('side', 0.08) * (-gx))[..., None], 0, 255)   # fenêtre à gauche

lay = np.zeros_like(bg)
la = np.zeros((H, W), np.float32)
ya, yb, xa, xb = max(oy, 0), min(oy + ch, H), max(ox, 0), min(ox + cw, W)
lay[ya:yb, xa:xb] = rgb[ya - oy:yb - oy, xa - ox:xb - ox]
la[ya:yb, xa:xb] = a[ya - oy:yb - oy, xa - ox:xb - ox]
ring = la * (1 - np.clip(blur(la, 2.0) * 1.7 - 0.7, 0, 1))
env = np.stack([blur(bg[..., i] * (1 - la), 5) for i in range(3)], -1) / (blur(1 - la, 5)[..., None] + 1e-4)
k = cfg.get('wrap', 0.22) * ring[..., None]
lay = lay * (1 - k) + env * k
out = lay * la[..., None] + bg * (1 - la[..., None])

# recadrage centré sur le produit (légèrement bas), dans le plateau
cy = (oy + ys.min() + oy + ys.max()) / 2
top = int(np.clip(round(cy - OUT_H / 2 + cfg.get('bias', 20)), 0, H - OUT_H))
out = out[top:top + OUT_H]
Y, X = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32)
r2 = ((X - OUT_W / 2) / (OUT_W / 2)) ** 2 * 0.8 + ((Y - OUT_H * 0.52) / (OUT_H / 2)) ** 2
out *= (1 - 0.07 * np.clip(r2 - 0.3, 0, None))[..., None]
out += rng.normal(0, 1.5, out.shape).astype(np.float32)
img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
img.save(cfg['out'], quality=90, optimize=True, progressive=True)
img.crop((135, 0, 1215, 1080)).save(cfg['square'], quality=90, optimize=True, progressive=True)
pb = [ox + xs.min(), oy + ys.min() - top, ox + xs.max(), oy + ys.max() - top]
json.dump({'product_bbox': [int(v) for v in pb], 'crop_top': top, 'scale': s}, open(cfg['out'] + '.json', 'w'))
print(f"{cfg['out']}: produit {pb[2] - pb[0]}×{pb[3] - pb[1]} px ({100 * (pb[2] - pb[0]) / OUT_W:.0f} % largeur, "
      f"{100 * (pb[3] - pb[1]) / OUT_H:.0f} % hauteur), recadrage y={top}")
