"""Étape 1 : inventaire et note de qualité des photos de plats/ et boissons/.

Usage :
    python pipeline/inventaire.py [--dossier CHEMIN]

Pour chaque photo, calcule des indicateurs objectifs (netteté du produit,
exposition, facilité de détourage, cadrage/résolution) et produit :
  inventaire/inventaire.md   tableau récapitulatif avec note /5 et verdict
  inventaire/inventaire.csv  même chose, ouvrable dans Excel
  inventaire/apercus/        original | détourage sur fond sombre | détourage sur fond chaud
  inventaire/planche-detourages.jpg

L'angle de prise de vue ne se mesure pas automatiquement : il est jugé à l'œil
sur les aperçus.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from commun import DOSSIER_DEFAUT, MODELE_DETOURAGE, charger_photo, lister_photos, masque, police

ECHELLE = 1200  # côté long de travail pour que les mesures soient comparables entre photos
# Taille minimale du produit (côté long, en px dans la photo source) pour remplir le cadre
# 1200x1200 sans agrandissement : le plat y occupe ~800 px, une boisson ~500 px.
TAILLE_MINI = {"plats": (1100, 850, 650, 450), "boissons": (800, 600, 450, 300)}


@dataclass
class Analyse:
    categorie: str
    fichier: str
    largeur: int
    hauteur: int
    notes: dict[str, int] = field(default_factory=dict)
    remarques: list[str] = field(default_factory=list)
    mesures: dict[str, float] = field(default_factory=dict)

    @property
    def note_globale(self) -> int:
        return min(self.notes.values()) if self.notes else 1

    @property
    def verdict(self) -> str:
        n = self.note_globale
        return "Bon" if n >= 4 else "Utilisable avec réserves" if n == 3 else "Déconseillé"


def _bande(mask: np.ndarray, d_min: int, d_max: int, interieur: bool) -> np.ndarray:
    zone = mask if interieur else ~mask
    dist = cv2.distanceTransform(zone.astype(np.uint8), cv2.DIST_L2, 5)
    return (dist >= d_min) & (dist <= d_max)


def noter_nettete(gris: np.ndarray, sujet: np.ndarray, a: Analyse) -> None:
    # Variance du laplacien par tuiles de 64 px entièrement dans le produit ; on garde le
    # 90e centile (la zone la plus détaillée) pour ne pas pénaliser un aliment lisse.
    interieur = cv2.erode(sujet.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
    lap = cv2.Laplacian(gris, cv2.CV_64F)
    valeurs = []
    for y in range(0, gris.shape[0] - 63, 32):
        for x in range(0, gris.shape[1] - 63, 32):
            if interieur[y : y + 64, x : x + 64].mean() > 0.9:
                valeurs.append(lap[y : y + 64, x : x + 64].var())
    v = float(np.percentile(valeurs, 90)) if valeurs else float(lap[interieur].var() if interieur.any() else 0)
    a.mesures["nettete"] = round(v, 1)
    note = 5 if v >= 400 else 4 if v >= 200 else 3 if v >= 100 else 2 if v >= 50 else 1
    a.notes["netteté"] = note
    if note <= 2:
        a.remarques.append("produit flou ou bougé")
    elif note == 3:
        a.remarques.append("netteté juste")


def noter_lumiere(rgb: np.ndarray, lab: np.ndarray, sujet: np.ndarray, a: Analyse) -> None:
    L = lab[..., 0][sujet] * 100 / 255
    moyenne, contraste = float(L.mean()), float(np.percentile(L, 95) - np.percentile(L, 5))
    brules = float((rgb[sujet].max(axis=1) >= 250).mean())
    bouches = float((L < 5).mean())
    # Dominante de couleur sur toute l'image (hypothèse « monde gris »)
    da = float(lab[..., 1].mean() - 128)
    db = float(lab[..., 2].mean() - 128)
    a.mesures.update(lum=round(moyenne, 1), contraste=round(contraste, 1), brules=round(brules * 100, 1), dominante_b=round(db, 1))

    note = 5
    if moyenne < 30:
        note -= 2; a.remarques.append("très sombre")
    elif moyenne < 40:
        note -= 1; a.remarques.append("un peu sombre")
    elif moyenne > 82:
        note -= 1; a.remarques.append("surexposé")
    if brules > 0.10:
        note -= 2; a.remarques.append(f"{brules:.0%} du produit brûlé (blanc pur)")
    elif brules > 0.03:
        note -= 1; a.remarques.append("reflets brûlés")
    if bouches > 0.10:
        note -= 1; a.remarques.append("ombres bouchées")
    if contraste < 35:
        note -= 1; a.remarques.append("lumière plate, peu de relief")
    if max(abs(da), abs(db)) > 20:
        note -= 1
        a.remarques.append("forte dominante " + ("jaune/orange" if db > 20 else "bleue" if db < -20 else "verte" if da < 0 else "magenta"))
    a.notes["lumière"] = max(note, 1)


def noter_detourage(lab: np.ndarray, alpha: np.ndarray, sujet: np.ndarray, a: Analyse) -> None:
    contours, _ = cv2.findContours(sujet.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    perimetre = sum(len(c) for c in contours) or 1
    flou = (alpha > 0.1) & (alpha < 0.9)
    largeur_transition = float(flou.sum() / perimetre)

    # Zones incertaines à l'intérieur du produit (verre transparent, vapeur, trous…)
    dist_bord = cv2.distanceTransform(sujet.astype(np.uint8), cv2.DIST_L2, 5)
    incertain = float(((alpha > 0.2) & (alpha < 0.8) & (dist_bord > 8)).sum() / max(sujet.sum(), 1))

    # Contraste produit / fond, secteur par secteur autour du produit
    dedans, dehors = _bande(sujet, 4, 12, True), _bande(sujet, 4, 12, False)
    ys, xs = np.nonzero(sujet)
    cy, cx = ys.mean(), xs.mean()
    yy, xx = np.indices(sujet.shape)
    secteur = ((np.arctan2(yy - cy, xx - cx) + np.pi) / (2 * np.pi) * 36).astype(int) % 36
    faibles = total = 0
    for s in range(36):
        i, o = dedans & (secteur == s), dehors & (secteur == s)
        if i.sum() < 20 or o.sum() < 20:
            continue
        total += 1
        if np.linalg.norm(lab[i].mean(axis=0) - lab[o].mean(axis=0)) < 18:
            faibles += 1
    faible_contraste = faibles / total if total else 0.0

    n, _, stats, _ = cv2.connectedComponentsWithStats(sujet.astype(np.uint8))
    aires = stats[1:, cv2.CC_STAT_AREA]
    fragments = int((aires > 0.01 * aires.max()).sum() - 1) if len(aires) else 0

    a.mesures.update(transition_px=round(largeur_transition, 1), incertain=round(incertain * 100, 1), faible_contraste=round(faible_contraste * 100))
    note = 5 if largeur_transition <= 2.5 else 4 if largeur_transition <= 4 else 3 if largeur_transition <= 7 else 2 if largeur_transition <= 12 else 1
    if largeur_transition > 4:
        a.remarques.append("contours flous/incertains")
    if faible_contraste > 0.4:
        note -= 2; a.remarques.append(f"produit peu distinct du fond sur {faible_contraste:.0%} du contour")
    elif faible_contraste > 0.2:
        note -= 1; a.remarques.append(f"peu de contraste avec le fond sur {faible_contraste:.0%} du contour")
    if incertain > 0.05:
        note -= 1; a.remarques.append("zones semi-transparentes (verre, vapeur…)")
    if fragments:
        note -= 1; a.remarques.append(f"{fragments} morceau(x) détaché(s) dans le masque (objet parasite ?)")
    a.notes["détourage"] = max(note, 1)


def noter_cadrage(alpha_plein: np.ndarray, a: Analyse) -> None:
    sujet = alpha_plein > 0.5
    h, w = sujet.shape
    cotes = {"haut": sujet[0], "bas": sujet[-1], "gauche": sujet[:, 0], "droite": sujet[:, -1]}
    coupes = [nom for nom, ligne in cotes.items() if ligne.mean() > 0.01]
    ys, xs = np.nonzero(sujet)
    taille = int(max(xs.max() - xs.min(), ys.max() - ys.min()))
    a.mesures["taille_produit_px"] = taille
    seuils = TAILLE_MINI[a.categorie]
    note = 5 if taille >= seuils[0] else 4 if taille >= seuils[1] else 3 if taille >= seuils[2] else 2 if taille >= seuils[3] else 1
    if note <= 3:
        a.remarques.append(f"produit petit dans la photo ({taille} px) : il faudra l'agrandir")
    if coupes:
        note = 1
        a.remarques.append("produit coupé par le bord (" + ", ".join(coupes) + ") : impossible de le montrer en entier")
    a.notes["cadrage"] = note


def apercu(photo: Image.Image, alpha: np.ndarray, hauteur: int = 360) -> Image.Image:
    l = round(photo.width * hauteur / photo.height)
    p = photo.resize((l, hauteur), Image.LANCZOS)
    m = Image.fromarray((alpha * 255).astype(np.uint8)).resize((l, hauteur), Image.LANCZOS)
    planche = Image.new("RGB", (l * 3 + 20, hauteur), (255, 255, 255))
    planche.paste(p, (0, 0))
    for i, fond in enumerate([(28, 28, 32), (196, 52, 46)], start=1):
        f = Image.new("RGB", (l, hauteur), fond)
        f.paste(p, (0, 0), m)
        planche.paste(f, (i * (l + 10), 0))
    return planche


def analyser(chemin: Path, categorie: str, cache: Path, modele: str) -> tuple[Analyse, Image.Image | None]:
    photo = charger_photo(chemin)
    a = Analyse(categorie, chemin.name, photo.width, photo.height)
    alpha_plein = masque(chemin, photo, cache, modele)
    if (alpha_plein > 0.5).mean() < 0.005:
        a.notes = {"détourage": 1}
        a.remarques.append("aucun produit détecté par le détourage")
        return a, None

    k = min(1.0, ECHELLE / max(photo.size))
    taille = (round(photo.width * k), round(photo.height * k))
    rgb = np.asarray(photo.resize(taille, Image.LANCZOS))
    alpha = cv2.resize(alpha_plein, taille, interpolation=cv2.INTER_AREA)
    sujet = alpha > 0.5
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    gris = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    noter_nettete(gris, sujet, a)
    noter_lumiere(rgb, lab, sujet, a)
    noter_detourage(lab, alpha, sujet, a)
    noter_cadrage(alpha_plein, a)
    return a, apercu(photo, alpha_plein)


def planche(images: list[tuple[str, Image.Image]], chemin: Path) -> None:
    largeur = 1400
    lignes = []
    for nom, im in images:
        k = min(1.0, largeur / im.width)
        im = im.resize((round(im.width * k), round(im.height * k)))
        ligne = Image.new("RGB", (largeur, im.height + 34), (255, 255, 255))
        ligne.paste(im, (0, 30))
        ImageDraw.Draw(ligne).text((4, 6), nom, fill=(0, 0, 0), font=police(20))
        lignes.append(ligne)
    out = Image.new("RGB", (largeur, sum(l.height for l in lignes)), (255, 255, 255))
    y = 0
    for l in lignes:
        out.paste(l, (0, y))
        y += l.height
    out.save(chemin, quality=85)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dossier", type=Path, default=DOSSIER_DEFAUT, help="dossier contenant plats/ et boissons/")
    p.add_argument(
        "--modele",
        default=MODELE_DETOURAGE,
        choices=["birefnet-general", "isnet-general-use"],
        help="birefnet-general : contours les plus propres (~8 Go de RAM) ; isnet-general-use : plus léger (~2 Go)",
    )
    args = p.parse_args()
    racine = args.dossier.resolve()
    sortie = racine / "inventaire"
    (sortie / "apercus").mkdir(parents=True, exist_ok=True)

    resultats: list[Analyse] = []
    apercus: list[tuple[str, Image.Image]] = []
    for categorie in ("plats", "boissons"):
        photos = lister_photos(racine / categorie)
        if not photos:
            print(f"(aucune photo dans {categorie}/)")
        for chemin in photos:
            print(f"Analyse {categorie}/{chemin.name}…", flush=True)
            a, ap = analyser(chemin, categorie, racine / "cache", args.modele)
            resultats.append(a)
            if ap is not None:
                ap.save(sortie / "apercus" / f"{categorie}-{chemin.stem}.jpg", quality=85)
                apercus.append((f"{categorie}/{chemin.name} - {a.verdict}", ap))

    criteres = ["netteté", "lumière", "détourage", "cadrage"]
    with open(sortie / "inventaire.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["catégorie", "fichier", "résolution", *criteres, "verdict", "remarques"])
        for a in resultats:
            w.writerow([a.categorie, a.fichier, f"{a.largeur}x{a.hauteur}", *[a.notes.get(c, "") for c in criteres], a.verdict, " ; ".join(a.remarques)])

    md = ["# Inventaire des photos", "", "Notes sur 5 (5 = parfait). Verdict = critère le plus faible.", ""]
    md += ["| Catégorie | Fichier | Résolution | Netteté | Lumière | Détourage | Cadrage | Verdict | Remarques |", "|---|---|---|---|---|---|---|---|---|"]
    for a in resultats:
        md.append(
            f"| {a.categorie} | {a.fichier} | {a.largeur}×{a.hauteur} | "
            + " | ".join(str(a.notes.get(c, "–")) for c in criteres)
            + f" | **{a.verdict}** | {' ; '.join(a.remarques) or '–'} |"
        )
    md += ["", "## Mesures brutes", "", "| Fichier | " + " | ".join(sorted({k for a in resultats for k in a.mesures})) + " |"]
    cles = sorted({k for a in resultats for k in a.mesures})
    md.append("|---" * (len(cles) + 1) + "|")
    for a in resultats:
        md.append(f"| {a.categorie}/{a.fichier} | " + " | ".join(str(a.mesures.get(k, "–")) for k in cles) + " |")
    (sortie / "inventaire.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    if apercus:
        planche(apercus, sortie / "planche-detourages.jpg")
    print(f"\n{len(resultats)} photo(s) analysée(s) -> {sortie / 'inventaire.md'}")


if __name__ == "__main__":
    main()
