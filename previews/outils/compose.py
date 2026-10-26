"""Compose un produit détouré sur une surface photographique reconstruite.

Usage : python3 -I compose.py <produit.png> <piste A|B|C> <sortie.png> [--seed N]

Image maîtresse 1350 × 1080 (5:4, format actuel des photos de la carte). Le produit reste à sa
résolution d'origine (aucun agrandissement), centré dans le carré central 1080 × 1080 pour que les
vignettes carrées et les fiches 4:3 / 16:10 soient de simples recadrages de la même image.
"""
import sys
import numpy as np
from PIL import Image

W, H = 1350, 1080
rng = np.random.default_rng(int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 7)


# ---------- outils numériques ----------

def box(a, r):
    if r <= 0:
        return a
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        a = ((np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)).astype(np.float32)
    return a


def blur(a, sigma):
    if sigma <= 0.3:
        return a
    # trois boîtes ≈ gaussienne ; largeur choisie pour que la variance corresponde
    r = max(1, int(round((np.sqrt(1 + 4 * sigma * sigma) - 1) / 2)))
    for _ in range(3):
        a = box(a, r)
    return a


def value_noise(size, cells):
    """Bruit lisse : grille aléatoire agrandie en bicubique (valeurs ~[-1, 1])."""
    g = rng.standard_normal((cells, cells)).astype(np.float32)
    img = Image.fromarray(g, 'F').resize((size, size), Image.BICUBIC)
    a = np.asarray(img)
    return a / (a.std() + 1e-6)


def fbm(size, octaves):
    """octaves : liste (nombre de cellules, poids)."""
    out = np.zeros((size, size), np.float32)
    for cells, wgt in octaves:
        out += wgt * value_noise(size, cells)
    return out


def sample(tex, X, Z):
    """Échantillonnage bilinéaire répété (texture carrée), coordonnées en pixels de texture."""
    n = tex.shape[0]
    x0 = np.floor(X).astype(np.int64)
    z0 = np.floor(Z).astype(np.int64)
    fx, fz = (X - x0).astype(np.float32), (Z - z0).astype(np.float32)
    x0 %= n
    z0 %= n
    x1, z1 = (x0 + 1) % n, (z0 + 1) % n
    return (tex[z0, x0] * (1 - fx) * (1 - fz) + tex[z0, x1] * fx * (1 - fz)
            + tex[z1, x0] * (1 - fx) * fz + tex[z1, x1] * fx * fz)


def ground_coords(elev_deg=45.0, focal=2.2):
    """Projette chaque pixel sur le plan de la table (caméra inclinée de elev_deg)."""
    phi = np.radians(elev_deg)
    u = (np.arange(W, dtype=np.float32) - W / 2) / (H / 2)
    v = (np.arange(H, dtype=np.float32) - H / 2) / (H / 2)
    U, V = np.meshgrid(u, v)
    denom = V * np.cos(phi) + focal * np.sin(phi)          # > 0 tant que le pixel voit la table
    t = 1.0 / denom
    X = t * U
    Z = t * (focal * np.cos(phi) - V * np.sin(phi))
    return X, Z, t                                          # t ~ distance (pour la profondeur de champ)


def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return 255.0 * np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def hex_rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


# ---------- pistes ----------

PISTES = {
    # A — pierre calcaire claire chaude : grain minéral, petites inclusions, lumière douce haut-gauche
    'A': dict(base='#E6D9C4', mottle=0.012, mid=0.020, grain=0.030, pores=0.9, specks=0.6,
              low_oct=[(4, 1.0), (9, 0.5)], mid_oct=[(110, 1.0), (220, 0.7), (400, 0.4)],
              warm_var=0.020, light=(-0.55, -0.75), light_amt=0.11, vignette=0.10, dof=1.6,
              shadow_tint='#5A4632', contact=0.60, ambient=0.34, cast=0.22, cast_dir=(0.10, -0.03),
              grade=dict(warm=4.0, sat=1.06, contrast=1.05)),
    # B — anthracite mat : ardoise sombre, lumière latérale gauche douce, contraste marqué
    'B': dict(base='#302E2C', mottle=0.050, mid=0.045, grain=0.050, pores=0.35, specks=0.25,
              low_oct=[(5, 1.0), (11, 0.5)], mid_oct=[(90, 1.0), (180, 0.6), (360, 0.4)],
              warm_var=0.015, light=(-1.0, -0.25), light_amt=0.32, vignette=0.28, dof=1.8,
              shadow_tint='#0B0908', contact=0.80, ambient=0.50, cast=0.38, cast_dir=(0.14, -0.02),
              grade=dict(warm=2.5, sat=1.07, contrast=1.06)),
    # C — crème minimaliste : surface homogène chaude, ombres très diffuses
    'C': dict(base='#F1EADF', mottle=0.012, mid=0.006, grain=0.006, pores=0.0, specks=0.0,
              warm_var=0.006, light=(-0.35, -0.85), light_amt=0.06, vignette=0.05, dof=1.0,
              shadow_tint='#6B5640', contact=0.52, ambient=0.26, cast=0.14, cast_dir=(0.08, -0.03),
              grade=dict(warm=4.0, sat=1.05, contrast=1.04)),
}


def make_background(p):
    X, Z, t = ground_coords()
    S = 2048
    # texture de surface en coordonnées « table » (la perspective l'affine vers le fond)
    tex_low = fbm(S, p.get('low_oct', [(6, 1.0), (12, 0.6)]))
    tex_mid = fbm(S, p.get('mid_oct', [(48, 1.0), (96, 0.5)]))
    tex_grain = rng.standard_normal((S, S)).astype(np.float32)
    tex_grain = 0.6 * tex_grain + 0.4 * blur(tex_grain, 0.8) / 0.45
    # une seule échelle pour X et Z (pas de déformation), coordonnées gardées dans la texture
    span = max(X.max() - X.min(), Z.max() - Z.min())
    scale = (S / 1.7 - 8) / span
    tx, tz = (X - X.min()) * scale + 4, (Z - Z.min()) * scale + 4
    low = sample(tex_low, tx, tz)
    mid = sample(tex_mid, tx, tz)
    grain = sample(tex_grain, tx * 1.6, tz * 1.6)  # 1,6 × (S / 1,7) < S : pas de répétition

    lum = 1.0 + p['mottle'] * low + p['mid'] * mid + p['grain'] * grain

    # inclusions minérales : petites taches sombres (pores) et claires, rares
    if p['pores'] or p['specks']:
        dots = rng.random((S, S)).astype(np.float32)
        pores = (dots > 0.9965).astype(np.float32)
        specks = (dots < 0.0025).astype(np.float32)
        pores = blur(pores, 0.9) * 6
        specks = blur(specks, 0.7) * 5
        lum -= p['pores'] * 0.10 * np.clip(sample(pores, tx * 1.5, tz * 1.5), 0, 1)
        lum += p['specks'] * 0.07 * np.clip(sample(specks, tx * 1.5, tz * 1.5), 0, 1)

    base = srgb_to_lin(hex_rgb(p['base']))
    # légère variation de teinte (zones plus chaudes / plus froides)
    hue = sample(fbm(S, [(5, 1.0)]), tx, tz)[..., None] * p['warm_var']
    col = base[None, None, :] * lum[..., None] * (1 + hue * np.array([1.0, 0.2, -1.0]))

    # éclairage : dégradé directionnel doux + vignettage
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = (xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)
    lx, ly = p['light']
    d = (nx * lx + ny * ly) / np.hypot(lx, ly)            # +1 côté lumière
    light = 1 + p['light_amt'] * d
    r2 = (nx * 0.85) ** 2 + (ny * 1.0) ** 2
    light *= 1 - p['vignette'] * np.clip(r2 - 0.25, 0, None) / 1.5
    col = col * light[..., None]

    # profondeur de champ : le fond (haut de l'image) devient légèrement flou
    far = np.clip((t.max() - t) / (t.max() - t.min()), 0, 1)  # 1 = près (bas), 0 = loin (haut)
    k = np.clip((0.55 - far) / 0.55, 0, 1)[..., None]
    blurred = np.stack([blur(col[..., i], p['dof'] * 3) for i in range(3)], -1)
    col = col * (1 - k) + blurred * k
    return col                                               # linéaire


def shadow_layer(alpha, x0, y0, p):
    """Ombres : contact (serrée), ambiante (large) et portée (décalée selon la lumière)."""
    ah, aw = alpha.shape
    cols = np.nonzero(alpha.max(0) > 0.5)[0]
    pw = cols.max() - cols.min()
    # ligne de contact : bas du produit, colonne par colonne
    bottom = np.array([np.nonzero(alpha[:, c] > 0.5)[0].max() if alpha[:, c].max() > 0.5 else -1 for c in range(aw)])
    valid = bottom >= 0
    by = np.percentile(bottom[valid], 97) + y0
    cx = x0 + (cols.min() + cols.max()) / 2

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def ellipse(cx_, cy_, rx, ry, soft):
        d = ((xx - cx_) / rx) ** 2 + ((yy - cy_) / ry) ** 2
        return np.clip(1 - d, 0, 1) ** soft

    rb = pw * p.get('base_ratio', 0.36)                     # demi-largeur de la base
    ry = rb * 0.62                                           # ellipse de base vue à ~40-45°
    cy = by - ry * 0.92                                      # le bord avant de l'empreinte touche le bas du produit
    occ = np.zeros((H, W), np.float32)
    # contact : empreinte légèrement élargie, très peu floue (le bol « pèse » sur la table)
    occ = np.maximum(occ, p['contact'] * blur(ellipse(cx, cy + 3, rb * 1.06, ry * 1.06, 0.35), 3.5))
    # ambiante : halo doux autour de la base
    occ = 1 - (1 - occ) * (1 - p['ambient'] * blur(ellipse(cx, cy + ry * 0.12, rb * 1.55, ry * 1.55, 1.0), 22))
    # portée : décalée à l'opposé de la lumière, très diffuse
    dx, dy = p['cast_dir']
    occ = 1 - (1 - occ) * (1 - p['cast'] * blur(ellipse(cx + dx * pw, cy + dy * pw, rb * 1.7, ry * 1.5, 1.2), 34))
    return np.clip(occ, 0, 1)


def open_contour(alpha, r):
    from PIL import ImageFilter
    m = Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8))
    for f in (ImageFilter.MinFilter, ImageFilter.MaxFilter):
        for _ in range(r // 5):
            m = m.filter(f(11))
    opened = np.asarray(m).astype(np.float32) / 255.0
    return alpha * np.clip(blur(opened, 1.0) * 1.15, 0, 1)


def grade_product(rgb, g):
    """Étalonnage léger : chaleur, contraste, saturation (sans changer le contenu)."""
    # chaleur : léger décalage +R / -B (balance des blancs plus chaude, comme une lumière du jour douce)
    out = rgb + np.array([g['warm'], g['warm'] * 0.35, -g['warm']], np.float32)
    # contraste doux autour du gris moyen
    out = 128 + (out - 128) * g['contrast']
    # saturation
    lum = (out @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    out = lum + (out - lum) * g['sat']
    return np.clip(out, 0, 255)


def unsharp(rgb, sigma=1.1, amount=0.35):
    b = np.stack([blur(rgb[..., i], sigma) for i in range(3)], -1)
    return np.clip(rgb + amount * (rgb - b), 0, 255)


def main():
    src, piste, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    p = PISTES[piste]
    prod = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
    rgb, alpha = prod[..., :3], prod[..., 3] / 255.0
    alpha = open_contour(alpha, 10)
    ah, aw = alpha.shape
    # placement : centré, légèrement sous le centre (dégradé sombre en haut de la fiche produit)
    x0 = int(round((W - aw) / 2))
    y0 = int(round(H / 2 + 10 - ah / 2))

    bg = make_background(p)
    occ = shadow_layer(alpha, x0, y0, p)
    tint = srgb_to_lin(hex_rgb(p['shadow_tint']))
    # ombre = multiplication vers une teinte sombre du même univers (jamais du noir pur)
    bg = bg * (1 - occ[..., None]) + bg * tint[None, None, :] * occ[..., None] * 0.9

    prod_rgb = unsharp(grade_product(rgb, p['grade']))
    full_rgb = np.zeros((H, W, 3), np.float32)
    full_a = np.zeros((H, W), np.float32)
    full_rgb[y0:y0 + ah, x0:x0 + aw] = prod_rgb
    full_a[y0:y0 + ah, x0:x0 + aw] = alpha

    # habillage lumineux : le fond déborde à peine sur le bord (intégration photographique)
    bg_s = lin_to_srgb(bg)
    edge = full_a * (1 - np.clip(blur(full_a, 2.5) * 1.6 - 0.6, 0, 1))  # anneau intérieur de ~3 px
    wrap = np.stack([blur(bg_s[..., i], 4) for i in range(3)], -1)
    full_rgb = full_rgb * (1 - 0.25 * edge[..., None]) + wrap * 0.25 * edge[..., None]

    out = full_rgb * full_a[..., None] + bg_s * (1 - full_a[..., None])
    # grain photographique très léger, commun au fond et au produit
    out += rng.normal(0, 1.1, out.shape).astype(np.float32)
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), 'RGB').save(dst)
    print(f'{dst}: produit {aw}x{ah} placé en ({x0},{y0})')


if __name__ == '__main__':
    main()
