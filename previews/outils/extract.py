"""Isole le produit d'un visuel « pop » (produit détouré + liseré blanc + fond saturé).

Usage : python3 -I extract.py <entrée.jpg> <sortie.png> [--debug dossier]

1. Le fond (couleur, typo, trame, ombre portée) ne contient pas de blanc : un remplissage depuis les
   bords sur les pixels non blancs donne l'extérieur du sticker.
2. Le liseré = pixels blancs à moins de RING px de l'extérieur.
3. Produit = reste. Le bord produit/liseré est un mélange avec du blanc : alpha estimé par projection
   sur la droite blanc → couleur intérieure voisine, puis couleur décontaminée.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RING = 30          # largeur max du liseré blanc (px) — mesuré ~16 px
BAND = 3           # largeur de la zone de transition produit/liseré (px)


def box(a, r):
    """Flou boîte séparable (sommes cumulées), bords répliqués. a : tableau 2D float."""
    if r <= 0:
        return a
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        a = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return a


def gauss(a, sigma):
    """Approximation gaussienne : trois flous boîte."""
    r = max(1, int(round(sigma * 0.85)))
    for _ in range(3):
        a = box(a, r)
    return a


def dilate(mask, r):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    # MaxFilter carré répété : approximation suffisante d'un disque pour de petits rayons
    out = img
    while r > 0:
        k = min(r, 4)
        out = out.filter(ImageFilter.MaxFilter(2 * k + 1))
        r -= k
    return np.asarray(out) > 127


def erode(mask, r):
    return ~dilate(~mask, r)


def largest_component(mask):
    # Composante connexe la plus grande via remplissages successifs (PIL).
    a = (mask * 255).astype(np.uint8)
    best, best_n = None, 0
    ys, xs = np.nonzero(a == 255)
    seen = np.zeros_like(a, dtype=bool)
    for y, x in zip(ys[::997], xs[::997]):  # échantillonnage : quelques graines suffisent
        if seen[y, x]:
            continue
        im = Image.fromarray(a).copy()
        ImageDraw.floodfill(im, (int(x), int(y)), 100, thresh=0)
        comp = np.asarray(im) == 100
        seen |= comp
        n = comp.sum()
        if n > best_n:
            best, best_n = comp, n
    return best


def fill_holes(mask):
    inv = Image.fromarray(((~mask) * 255).astype(np.uint8)).copy()
    ImageDraw.floodfill(inv, (0, 0), 100, thresh=0)
    outside = np.asarray(inv) == 100
    return ~outside


def main():
    src, dst = sys.argv[1], sys.argv[2]
    dbg = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    h, w, _ = rgb.shape
    mn, mx = rgb.min(2), rgb.max(2)
    white = (mn > 200) & (mx - mn < 40)

    # 1. extérieur = remplissage depuis les 4 coins sur le non-blanc
    nonwhite = Image.fromarray(((~white) * 255).astype(np.uint8)).copy()
    for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if nonwhite.getpixel(c) == 255:
            ImageDraw.floodfill(nonwhite, c, 100, thresh=0)
    outside = np.asarray(nonwhite) == 100

    # 2. liseré = blanc proche de l'extérieur (le liseré est anticrénelé : on prend large)
    near = dilate(outside, RING)
    ring = near & ~outside & (mn > 226) & (mx - mn < 22)
    # 3. produit
    prod = ~outside & ~ring
    prod = largest_component(erode(prod, 1))
    prod = fill_holes(dilate(prod, 1))

    # 4. alpha de bord
    inner = erode(prod, BAND)
    band = dilate(prod, 2) & ~inner
    # couleur intérieure propagée dans la bande (moyenne masquée par flous successifs)
    acc = rgb * inner[..., None]
    wgt = inner.astype(np.float32)
    ref = np.zeros_like(rgb)
    have = inner.copy()
    for rad in (2, 4, 6, 8):
        a = np.stack([box(acc[..., i], rad) for i in range(3)], -1)
        b = box(wgt, rad)
        ok = (b > 1e-3) & ~have
        ref[ok] = a[ok] / b[ok, None]
        have |= ok
    ref[inner] = rgb[inner]

    W = np.float32(252.0)
    d_ref = W - ref                          # vecteur blanc → couleur de référence
    d_c = W - rgb
    denom = (d_ref ** 2).sum(-1)
    alpha = np.where(denom > 400, (d_c * d_ref).sum(-1) / np.maximum(denom, 1), 1.0)
    alpha = np.clip(alpha, 0, 1)
    alpha = np.where(inner, 1.0, np.where(band, alpha, 0.0)).astype(np.float32)
    # léger lissage du contour (0,6 px) pour un bord photographique, pas « découpé aux ciseaux »
    alpha = 0.5 * alpha + 0.5 * box(alpha, 1)  # adoucissement ~0,6 px
    alpha = np.where(inner, 1.0, alpha)

    # décontamination : on retire la part de blanc du mélange
    a3 = np.maximum(alpha, 1e-3)[..., None]
    clean = (rgb - (1 - a3) * W) / a3
    clean = np.where((alpha < 0.35)[..., None], ref, clean)
    out_rgb = np.where(band[..., None], np.clip(clean, 0, 255), rgb)

    rgba = np.dstack([out_rgb, alpha * 255]).astype(np.uint8)
    # recadrage sur le produit (marge 4 px)
    ys, xs = np.nonzero(alpha > 0.02)
    y0, y1, x0, x1 = max(ys.min() - 4, 0), min(ys.max() + 5, h), max(xs.min() - 4, 0), min(xs.max() + 5, w)
    Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').save(dst)
    print(f'{src}: produit {x1 - x0}x{y1 - y0} px à ({x0},{y0}), liseré {int(ring.sum())} px')
    if dbg:
        Image.fromarray((outside * 255).astype(np.uint8)).save(f'{dbg}/outside.png')
        Image.fromarray((ring * 255).astype(np.uint8)).save(f'{dbg}/ring.png')
        Image.fromarray((alpha * 255).astype(np.uint8)).save(f'{dbg}/alpha.png')


if __name__ == '__main__':
    main()
