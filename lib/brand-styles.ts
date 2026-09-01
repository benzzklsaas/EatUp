import { FONT, ARCH, GRAIN } from './brand'

/**
 * La feuille de style de marque, partagée par toutes les pages client
 * (vitrine, carte, bon de commande, confirmation, suivi).
 *
 * Aucune couleur en dur : tout passe par les variables posées par paletteVars().
 * Règle de lisibilité tenue partout — le texte coloré utilise toujours les
 * teintes « ink » (assombries), les teintes vives restent aux aplats.
 */
export function brandCss(): string {
  return `
    .cn *, .cn *::before, .cn *::after { box-sizing: border-box; }
    .cn {
      background: var(--cn-bg);
      color: var(--cn-text);
      font-family: ${FONT.ui};
      font-size: 16px; line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    /* Un grain à peine perceptible : le blanc respire au lieu d'être un aplat */
    .cn::after {
      content: ''; position: fixed; inset: 0; z-index: 400; pointer-events: none;
      background-image: ${GRAIN}; opacity: .022;
    }
    .cn img { max-width: 100%; }

    /* ── Typographie ─────────────────────────────────────────────────────── */
    .cn-display { font-family: ${FONT.display}; font-weight: 700; line-height: 1.04; letter-spacing: -.022em; }
    .cn-ui { font-family: ${FONT.ui}; }
    .cn-mono { font-family: ${FONT.mono}; font-variant-numeric: tabular-nums; }
    .cn-eyebrow {
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .14em;
      text-transform: uppercase; color: var(--cn-dim);
    }

    /* ── L'arche : le seul rayon autorisé sur une image ──────────────────── */
    .cn-arch { border-radius: ${ARCH}; overflow: hidden; display: block; background: var(--cn-shade); }

    /* ── La pastille d'état : lisible d'un coup d'œil, jamais décorative ─── */
    .cn-pill {
      display: inline-flex; align-items: center; gap: 7px;
      font-family: ${FONT.mono}; font-size: 12px; letter-spacing: .02em;
      padding: 6px 12px; border-radius: 999px; white-space: nowrap;
      background: var(--cn-shade); color: var(--cn-dim);
    }
    .cn-pill--open { background: var(--cn-fresh-soft); color: var(--cn-fresh-ink); }
    .cn-pill--shut { background: var(--cn-hot-soft); color: var(--cn-hot-ink); }
    .cn-pill__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* ── Les commandes ───────────────────────────────────────────────────── */
    .cn-btn {
      font-family: ${FONT.ui}; font-size: 15px; font-weight: 600; letter-spacing: -.01em;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-height: 44px; padding: 11px 20px; border: none; border-radius: 6px;
      background: var(--cn-hot-ink); color: #fff; cursor: pointer;
      transition: background .14s ease, transform .1s ease;
    }
    .cn-btn:hover { background: var(--cn-hot); }
    .cn-btn:active { transform: translateY(1px); }
    .cn-btn:disabled { background: var(--cn-shade); color: var(--cn-dim); cursor: default; transform: none; }
    .cn-btn--soft { background: var(--cn-hot-soft); color: var(--cn-hot-ink); }
    .cn-btn--soft:hover { background: var(--cn-hot); color: #fff; }
    .cn-btn--ghost { background: transparent; color: var(--cn-text); border: 1px solid var(--cn-line); }
    .cn-btn--ghost:hover { background: var(--cn-shade); }
    .cn-btn--block { display: flex; width: 100%; }
    .cn :focus-visible { outline: 2px solid var(--cn-hot-ink); outline-offset: 2px; }

    /* Le pas-à-pas de quantité : deux cibles franches, jamais deux pastilles */
    .cn-step { display: inline-flex; align-items: center; border: 1px solid var(--cn-line); border-radius: 6px; background: var(--cn-surface); }
    .cn-step button {
      width: 42px; height: 42px; border: none; background: transparent; cursor: pointer;
      color: var(--cn-hot-ink); font-size: 19px; line-height: 1; border-radius: 6px;
    }
    .cn-step button:hover { background: var(--cn-hot-soft); }
    .cn-step__n { font-family: ${FONT.mono}; font-size: 15px; min-width: 26px; text-align: center; }

    /* ── La ligne de carte : on lit un menu, pas une grille de vignettes ─── */
    .cn-leader { flex: 1; border-bottom: 1px dotted var(--cn-line); transform: translateY(-4px); min-width: 12px; }
    .cn-price { font-family: ${FONT.mono}; font-size: 16px; color: var(--cn-hot-ink); flex-shrink: 0; }

    /* ── Les feuilles (modales) ──────────────────────────────────────────── */
    .cn-sheet-wrap {
      position: fixed; inset: 0; z-index: 200; background: rgba(27,33,20,.45);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .cn-sheet {
      width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column;
      background: var(--cn-surface); color: var(--cn-text);
      border-radius: 14px 14px 0 0; position: relative; animation: cn-rise .26s ease;
    }
    .cn-sheet__head {
      padding: 20px 20px 14px; border-bottom: 1px solid var(--cn-line);
      display: flex; align-items: flex-start; gap: 14px; flex-shrink: 0;
    }
    .cn-sheet__title { font-family: ${FONT.display}; font-weight: 700; font-size: 22px; margin: 0; line-height: 1.15; }
    .cn-sheet__body { overflow-y: auto; overscroll-behavior: contain; padding: 4px 20px 16px; flex: 1; }
    .cn-sheet__foot { padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--cn-line); flex-shrink: 0; }
    .cn-sheet__close {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; margin-left: auto;
      border: none; background: var(--cn-shade); color: var(--cn-text); cursor: pointer; font-size: 15px;
    }
    .cn-sheet__close:hover { background: var(--cn-line); }
    @keyframes cn-rise { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

    /* ── Les groupes de choix ────────────────────────────────────────────── */
    .cn-group { margin-top: 22px; }
    .cn-group__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
    .cn-group__name { font-family: ${FONT.display}; font-weight: 700; font-size: 16px; }
    .cn-group__req {
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .06em; margin-left: auto;
      color: var(--cn-hot-ink); background: var(--cn-hot-soft); padding: 3px 9px; border-radius: 999px;
    }
    .cn-group__opt { font-family: ${FONT.mono}; font-size: 11px; color: var(--cn-dim); margin-left: auto; }

    .cn-opt {
      width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      min-height: 52px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; text-align: left;
      background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 8px;
      font-family: ${FONT.ui}; font-size: 15px; color: var(--cn-text);
      transition: border-color .12s ease, background .12s ease;
    }
    .cn-opt:hover { border-color: var(--cn-dim); }
    .cn-opt--on { border-color: var(--cn-hot-ink); background: var(--cn-hot-soft); }
    .cn-opt--off { opacity: .5; cursor: not-allowed; }
    .cn-opt--off .cn-opt__name { text-decoration: line-through; }
    .cn-opt__box {
      width: 22px; height: 22px; flex-shrink: 0; border: 1.5px solid var(--cn-line);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #fff; background: var(--cn-surface);
    }
    .cn-opt--on .cn-opt__box { background: var(--cn-hot-ink); border-color: var(--cn-hot-ink); }
    .cn-opt__extra { font-family: ${FONT.mono}; font-size: 13px; color: var(--cn-dim); flex-shrink: 0; }
    .cn-opt--on .cn-opt__extra { color: var(--cn-hot-ink); }

    /* Le choix formule : deux moitiés franches, l'active se remplit */
    .cn-formule { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cn-formule button {
      padding: 14px 12px; cursor: pointer; text-align: left; border-radius: 8px;
      border: 1px solid var(--cn-line); background: var(--cn-surface); color: var(--cn-text);
      font-family: ${FONT.ui}; transition: border-color .12s ease, background .12s ease;
    }
    .cn-formule button.on { border-color: var(--cn-hot-ink); background: var(--cn-hot-soft); }
    .cn-formule__t { font-size: 14px; font-weight: 600; }
    .cn-formule__p { font-family: ${FONT.mono}; font-size: 15px; margin-top: 4px; color: var(--cn-hot-ink); }
    .cn-formule__n { font-size: 12px; color: var(--cn-dim); margin-top: 3px; line-height: 1.35; }

    /* ── Les champs ──────────────────────────────────────────────────────── */
    .cn-field { display: block; margin-bottom: 15px; }
    .cn-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; }
    .cn-label span { font-weight: 400; color: var(--cn-dim); }
    .cn-input {
      width: 100%; min-height: 46px; padding: 11px 13px;
      background: var(--cn-surface); border: 1px solid var(--cn-line); border-radius: 8px;
      font-family: ${FONT.ui}; font-size: 16px; color: var(--cn-text);
      outline: none; transition: border-color .12s ease, box-shadow .12s ease;
    }
    .cn-input::placeholder { color: var(--cn-dim); opacity: .75; }
    .cn-input:focus { border-color: var(--cn-hot-ink); box-shadow: 0 0 0 3px var(--cn-hot-soft); }
    .cn-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .cn-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
    .cn-slot {
      min-height: 46px; padding: 12px 6px; cursor: pointer; border-radius: 8px;
      border: 1px solid var(--cn-line); background: var(--cn-surface); color: var(--cn-text);
      font-family: ${FONT.mono}; font-size: 15px;
      transition: border-color .12s ease, background .12s ease;
    }
    .cn-slot:hover { border-color: var(--cn-dim); }
    .cn-slot--on { border-color: var(--cn-hot-ink); background: var(--cn-hot-ink); color: #fff; }

    /* ── Les avis ────────────────────────────────────────────────────────── */
    .cn-note {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 14px 16px; border-radius: 10px;
      background: var(--cn-surface); border: 1px solid var(--cn-line);
    }
    .cn-note--warn { background: var(--cn-hot-soft); border-color: transparent; }
    .cn-note__t { font-weight: 600; font-size: 14px; margin: 0; }
    .cn-note__d { font-size: 14px; color: var(--cn-dim); margin: 3px 0 0; line-height: 1.5; }

    /* ── Le récapitulatif en lignes de ticket ────────────────────────────── */
    .cn-recap__row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 11px; }
    .cn-recap__k { font-size: 14px; color: var(--cn-dim); flex-shrink: 0; }
    .cn-recap__dots { flex: 1; border-bottom: 1px dotted var(--cn-line); transform: translateY(-4px); min-width: 12px; }
    .cn-recap__v { font-family: ${FONT.mono}; font-size: 14px; flex-shrink: 0; }
    .cn-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .cn-total__k { font-size: 15px; font-weight: 600; }
    .cn-total__v { font-family: ${FONT.mono}; font-size: 26px; }

    @media (prefers-reduced-motion: reduce) {
      .cn *, .cn *::before, .cn *::after {
        animation-duration: .01ms !important; animation-iteration-count: 1 !important;
        transition-duration: .01ms !important; scroll-behavior: auto !important;
      }
    }
  `
}
