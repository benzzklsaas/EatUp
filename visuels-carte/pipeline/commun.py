"""Fonctions partagées par les scripts du pipeline « visuels carte ».

Les photos originales ne sont jamais modifiées : elles sont ouvertes en lecture
seule, et tout ce qui est calculé (masques de détourage, aperçus) est écrit dans
le dossier cache/ ou dans les dossiers de sortie.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

try:  # photos iPhone (.heic)
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
MODELE_DETOURAGE = "birefnet-general"
DOSSIER_DEFAUT = Path(__file__).resolve().parent.parent

_sessions: dict = {}


def lister_photos(dossier: Path) -> list[Path]:
    if not dossier.is_dir():
        return []
    return sorted(
        p
        for p in dossier.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS and not p.name.startswith(".")
    )


def charger_photo(chemin: Path) -> Image.Image:
    """Ouvre une photo (orientation EXIF appliquée) et renvoie une copie RGB en mémoire."""
    with Image.open(chemin) as im:
        return ImageOps.exif_transpose(im).convert("RGB")


def empreinte(chemin: Path) -> str:
    return hashlib.sha1(chemin.read_bytes()).hexdigest()[:12]


def masque(chemin: Path, photo: Image.Image, cache: Path, modele: str = MODELE_DETOURAGE) -> np.ndarray:
    """Masque de détourage (float 0..1, taille de la photo), mis en cache par contenu du fichier."""
    fichier = cache / "masques" / f"{chemin.stem}-{empreinte(chemin)}-{modele}.png"
    if fichier.exists():
        return np.asarray(Image.open(fichier), dtype=np.float32) / 255.0

    import onnxruntime as ort
    from rembg import new_session, remove

    if modele not in _sessions:
        # Sans ça, la réserve mémoire d'onnxruntime grossit à chaque photo (birefnet : >16 Go
        # au bout de 2-3 photos) ; désactivée, la consommation reste stable (~8 Go).
        opts = ort.SessionOptions()
        opts.enable_cpu_mem_arena = False
        opts.enable_mem_pattern = False
        _sessions[modele] = new_session(modele, sess_opts=opts)
    m = remove(photo, session=_sessions[modele], only_mask=True)
    fichier.parent.mkdir(parents=True, exist_ok=True)
    m.save(fichier)
    return np.asarray(m, dtype=np.float32) / 255.0


def slug(nom: str) -> str:
    """« Burger Spécial Maison » -> « burger-special-maison »."""
    import re
    import unicodedata

    s = unicodedata.normalize("NFKD", nom).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


POLICES = [
    "DejaVuSans{g}.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans{g}.ttf",
    "/System/Library/Fonts/Supplemental/Arial{g2}.ttf",
    "C:/Windows/Fonts/arial{g3}.ttf",
]


def police(taille: int, gras: bool = False):
    """Police TrueType avec accents (Linux, macOS ou Windows), sinon police intégrée à Pillow."""
    from PIL import ImageFont

    for modele in POLICES:
        chemin = modele.format(g="-Bold" if gras else "", g2=" Bold" if gras else "", g3="bd" if gras else "")
        try:
            return ImageFont.truetype(chemin, taille)
        except OSError:
            continue
    return ImageFont.load_default(size=taille)
