"""Turns the marker links of the Chromium PDF into real AcroForm fields, adds bookmarks and metadata.

usage: python3 src/forms.py in.pdf pages.json out.pdf <phone|a4>

Markers (see build.mjs): https://omra.local/t/<name> single-line text,
                         https://omra.local/m/<name> multi-line text,
                         https://omra.local/c/<name> checkbox.
"""
import json
import sys

import pymupdf

src, pages_json, out, fmt = sys.argv[1:5]
doc = pymupdf.open(src)
pages = json.load(open(pages_json))

INK = (0.12, 0.118, 0.106)
CHECK = (0.24, 0.42, 0.31)
PREFIX = 'https://omra.local/'

counts = {'t': 0, 'm': 0, 'c': 0}
for page in doc:
    markers = [l for l in page.get_links() if l.get('uri', '').startswith(PREFIX)]
    for link in markers:
        page.delete_link(link)
    for link in markers:
        kind, name = link['uri'][len(PREFIX):].split('/', 1)
        r = pymupdf.Rect(link['from'])
        w = pymupdf.Widget()
        w.field_name = name
        w.border_width = 0
        w.border_color = None
        w.fill_color = None
        if kind == 'c':
            w.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
            w.field_value = False
            w.text_color = CHECK
            w.rect = r
        else:
            w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
            w.text_font = 'Helv'
            w.text_color = INK
            pad_x = 4 if fmt == 'phone' else 3
            if kind == 'm':
                w.field_flags |= pymupdf.PDF_TX_FIELD_IS_MULTILINE
                w.text_fontsize = 10 if fmt == 'phone' else 9
                w.rect = pymupdf.Rect(r.x0 + pad_x, r.y0 + 2, r.x1 - pad_x, r.y1 - 2)
            else:
                w.text_fontsize = round(max(7.5, min(11 if fmt == 'phone' else 9.5, r.height * 0.52)), 1)
                w.rect = pymupdf.Rect(r.x0 + pad_x, r.y0 + 1, r.x1 - pad_x, r.y1 - 1)
        page.add_widget(w)
        counts[kind] += 1

# Bookmarks (outline) — same structure as the table of contents.
P = lambda k: pages[k]
toc = [
    [1, 'Couverture', 1],
    [1, 'Sommaire', 2],
    [1, 'I · Préparer', P('ensemble')],
    [2, 'Vue d’ensemble', P('ensemble')],
    [2, 'À avoir sous la main', P('essentiel')],
    [2, 'Transports', P('transports')],
    [2, 'Avant le départ', P('avant')],
    [1, 'II · Jour par jour', P('j1')],
    [2, 'Mardi 10 — Médine, arrivée', P('j1')],
    [2, 'Mercredi 11 — Médine, ziyârât', P('j2')],
    [3, 'Rawdah', P('rawdah')],
    [2, 'Jeudi 12 — vers La Mecque', P('j3')],
    [3, 'Ihram & miqat', P('ihram')],
    [2, 'Vendredi 13 — La Mecque, Omra', P('j4')],
    [3, 'Étapes de la Omra', P('etapes')],
    [3, 'Guide Omra — checklist', P('guide')],
    [2, 'Samedi 14 — La Mecque, journée lente', P('j5')],
    [2, 'Dimanche 15 — retour à Médine', P('j6')],
    [2, 'Lundi 16 — départ', P('j7')],
    [1, 'III · Emporter & noter', P('valise')],
    [2, 'Checklist valise', P('valise')],
    [2, 'Nos du’as', P('duas')],
    [2, 'Sources & vérifications', P('sources')],
]
doc.set_toc(toc)
doc.set_metadata({
    'title': 'Omra 2026 — Carnet de route',
    'subject': 'Médine • La Mecque — 10 → 16 novembre 2026 · ' + ('version iPhone' if fmt == 'phone' else 'version A4'),
    'keywords': 'Omra, Médine, La Mecque, Rawdah, Haramain, carnet de route',
    'creator': 'Carnet de route Omra 2026',
    'producer': 'Chromium + PyMuPDF',
    'author': '',
})
doc.set_page_labels([{'startpage': 0, 'prefix': '', 'style': 'D', 'firstpagenum': 1}])
doc.save(out, garbage=4, deflate=True, clean=True)
print(out, len(doc), 'pages', counts)
