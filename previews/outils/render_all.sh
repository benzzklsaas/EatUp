#!/usr/bin/env bash
# Rendus définitifs des trois scènes (pleine résolution) puis pose de la vraie photo du plat.
set -euo pipefail
S=$1; SAMPLES=${2:-160}
mkdir -p "$S/scene/final"
for v in A B C; do
  start=$(date +%s)
  "$S/bvenv/bin/python" "$S/tools/scene.py" $v "$S/scene/final/${v}_render.png" "$SAMPLES" 1.0 --json "$S/scene/final/${v}_render.json" 2>&1 | grep -E "^bbox|rror" || true
  echo "$v rendu en $(( $(date +%s) - start )) s"
done
