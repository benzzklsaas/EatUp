# Reads named destinations from a PDF and writes {section_id: page_number (1-based)}.
import json, sys, pymupdf
doc = pymupdf.open(sys.argv[1])
pages = {name: d['page'] + 1 for name, d in doc.resolve_names().items() if d.get('page', -1) >= 0}
json.dump(pages, open(sys.argv[2], 'w'), indent=1, sort_keys=True)
print(len(doc), 'pages;', len(pages), 'destinations')
