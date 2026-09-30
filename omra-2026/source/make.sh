#!/usr/bin/env bash
# Full build: HTML -> 2-pass PDFs (page numbers) -> form fields + bookmarks.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
[ -d fonts ] || python3 fetch_fonts.py
node src/build.mjs
for fmt in phone a4; do
  node src/pdf.mjs "$fmt" "out/p1-$fmt.pdf"
  python3 src/pages.py "out/p1-$fmt.pdf" "out/pages-$fmt.json"
  node src/pdf.mjs "$fmt" "out/p2-$fmt.pdf" "out/pages-$fmt.json"
  python3 src/pages.py "out/p2-$fmt.pdf" "out/pages2-$fmt.json"
  cmp -s "out/pages-$fmt.json" "out/pages2-$fmt.json" || { echo "page numbers moved in pass 2 ($fmt)"; exit 1; }
  python3 src/forms.py "out/p2-$fmt.pdf" "out/pages-$fmt.json" "out/final-$fmt.pdf" "$fmt"
done
