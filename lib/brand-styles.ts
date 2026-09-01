import { FONT, ARCH, GRAIN } from './brand'

/**
 * La feuille de style de marque, partagée par toutes les pages client
 * (carte, bon de commande, confirmation, suivi). Les couleurs n'y figurent
 * jamais en dur : chaque page pose la palette de son restaurant en variables
 * CSS, et ces règles s'y adaptent. Voir lib/brand.ts pour la direction.
 */
export function brandCss(): string {
  return `

    .cn * { box-sizing: border-box; }
    .cn {
      background: var(--cn-ink);
      color: var(--cn-dough);
      font-family: ${FONT.editorial};
      -webkit-font-smoothing: antialiased;
    }
    /* Grain de farine — retire le rendu « écran » sans coûter une requête */
    .cn::after {
      content: ''; position: fixed; inset: 0; z-index: 400; pointer-events: none;
      background-image: ${GRAIN}; opacity: .05;
    }
    .cn ::-webkit-scrollbar { display: none; }

    .cn-display { font-family: ${FONT.display}; font-weight: 400; text-transform: uppercase; line-height: .84; letter-spacing: -.01em; }
    .cn-ed { font-family: ${FONT.editorial}; }
    .cn-mono { font-family: ${FONT.mono}; text-transform: uppercase; letter-spacing: .14em; }

    /* ── L'ARCHE : la gueule du tandoor, seul rayon autorisé sur une image ── */
    .cn-arch { border-radius: ${ARCH}; overflow: hidden; display: block; }

    /* ── LE TAMPON : encre posée de travers ── */
    .cn-stamp {
      display: inline-flex; align-items: center; gap: 7px;
      font-family: ${FONT.mono}; font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase;
      padding: 6px 11px; border: 1.5px solid currentColor; border-radius: 2px;
      outline: 1px solid currentColor; outline-offset: 2.5px;
      transform: rotate(-4deg); white-space: nowrap;
    }

    /* ── LA BANDE : l'enseigne inclinée qui chevauche les sections ── */
    /* Le conteneur absorbe le débord de la rotation : sans lui, toute la page
       gagne une barre de défilement horizontale. Il n'englobe pas l'enseigne
       collante, dont le position:sticky serait cassé par un parent clippé. */
    .cn-band-wrap { overflow: hidden; padding: 15px 0; margin: 12px 0 16px; }
    .cn-band {
      position: relative; z-index: 3; overflow: hidden;
      background: var(--cn-accent); color: var(--cn-accent-ink);
      transform: rotate(-1.4deg) scale(1.06);
      padding: 9px 0;
      border-top: 2px solid var(--cn-ink); border-bottom: 2px solid var(--cn-ink);
    }
    .cn-band__track { display: flex; width: max-content; animation: cn-slide 34s linear infinite; }
    .cn-band__word {
      font-family: ${FONT.display}; text-transform: uppercase; font-size: 15px;
      letter-spacing: .06em; padding: 0 18px; display: inline-flex; align-items: center; gap: 18px;
    }
    .cn-band__word::after { content: ''; width: 5px; height: 5px; background: currentColor; transform: rotate(45deg); }
    @keyframes cn-slide { from { transform: translateX(0) } to { transform: translateX(-50%) } }

    /* ── LE BOUTON : encre imprimée, ombre dure, aucun dégradé ── */
    .cn-btn {
      font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .13em; text-transform: uppercase;
      background: var(--cn-accent); color: var(--cn-accent-ink);
      border: none; border-radius: 2px; padding: 11px 16px; cursor: pointer;
      box-shadow: 3px 3px 0 var(--cn-hot);
      transition: transform .1s ease, box-shadow .1s ease;
    }
    .cn-btn:hover { transform: translate(1px, 1px); box-shadow: 2px 2px 0 var(--cn-hot); }
    .cn-btn:active { transform: translate(3px, 3px); box-shadow: 0 0 0 var(--cn-hot); }
    .cn-btn:disabled { opacity: .45; cursor: default; box-shadow: 3px 3px 0 var(--cn-line); }
    .cn-btn--ghost {
      background: transparent; color: var(--cn-dough);
      box-shadow: none; border: 1px solid var(--cn-line);
    }
    .cn-btn--ghost:hover { border-color: var(--cn-accent); color: var(--cn-accent); transform: none; }
    @keyframes cn-rise { from { transform: translateY(18px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes cn-punch { 0%,100% { transform: scale(1) } 35% { transform: scale(1.035) } }

    /* ── LA FEUILLE : les modales sont du papier, pas du verre ── */
    .cn-sheet-wrap {
      position: fixed; inset: 0; z-index: 200; background: rgba(10,7,4,.82);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .cn-sheet {
      width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; overscroll-behavior: contain;
      background: var(--cn-paper); color: var(--cn-paper-ink);
      padding: 26px 20px 32px; position: relative; animation: cn-rise .28s ease;
    }
    .cn-sheet__notch { position: absolute; top: 0; left: 0; right: 0; height: 12px; }
    .cn-sheet__title { font-size: clamp(26px, 7vw, 38px); margin: 0; padding-right: 48px; }
    .cn-sheet__close {
      position: absolute; top: 22px; right: 18px; width: 34px; height: 34px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,.2); background: transparent; cursor: pointer;
      font-family: ${FONT.mono}; font-size: 13px; color: var(--cn-paper-ink);
    }
    .cn-group__head {
      display: flex; align-items: baseline; gap: 10px; margin: 26px 0 11px;
      font-family: ${FONT.mono}; font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
    }
    .cn-group__rule { flex: 1; height: 1px; background: rgba(0,0,0,.16); }
    .cn-group__req { color: var(--cn-hot); }
    .cn-opt {
      width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 13px 14px; margin-bottom: 7px; cursor: pointer; text-align: left;
      background: transparent; border: 1px solid rgba(0,0,0,.18); border-radius: 2px;
      font-family: ${FONT.editorial}; font-size: 15px; color: var(--cn-paper-ink);
      transition: background .12s ease, border-color .12s ease;
    }
    .cn-opt:hover { border-color: var(--cn-paper-ink); }
    .cn-opt--on { background: var(--cn-accent); border-color: var(--cn-accent-ink); }
    .cn-opt--off { opacity: .38; cursor: not-allowed; text-decoration: line-through; }
    .cn-opt__box {
      width: 18px; height: 18px; flex-shrink: 0; border: 1.5px solid currentColor;
      display: flex; align-items: center; justify-content: center; font-size: 10px;
    }
    .cn-opt__extra { font-family: ${FONT.mono}; font-size: 11px; letter-spacing: .06em; }

    /* Le choix formule — deux moitiés de ticket, l'active passe en négatif */
    .cn-formule { display: flex; border: 1.5px solid var(--cn-paper-ink); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
    .cn-formule button {
      flex: 1; padding: 14px 10px; border: none; cursor: pointer; background: transparent;
      color: var(--cn-paper-ink); text-align: center; font-family: ${FONT.mono};
      transition: background .12s ease;
    }
    .cn-formule button + button { border-left: 1.5px solid var(--cn-paper-ink); }
    .cn-formule button.on { background: var(--cn-paper-ink); color: var(--cn-paper); }
    .cn-formule__t { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; }
    .cn-formule__p { font-family: ${FONT.display}; font-size: 19px; margin-top: 5px; }

    .cn-confirm {
      width: 100%; margin-top: 22px; padding: 17px 20px; border: none; border-radius: 2px; cursor: pointer;
      background: var(--cn-hot); color: var(--cn-paper);
      font-family: ${FONT.mono}; font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
      display: flex; align-items: center; justify-content: space-between;
    }
    .cn-confirm:disabled { background: rgba(0,0,0,.12); color: rgba(0,0,0,.4); cursor: default; }
    .cn-confirm b { font-family: ${FONT.display}; font-size: 19px; letter-spacing: 0; font-weight: 400; }

    /* Avis : fermé, message du jour, panier restauré */
    .cn-note {
      display: flex; gap: 13px; align-items: flex-start;
      max-width: 760px; margin: 0 auto; padding: 15px 18px;
      border-left: 3px solid var(--cn-accent); background: var(--cn-char);
    }
    .cn-note__k { font-family: ${FONT.mono}; font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--cn-accent); }
    .cn-note__v { font-size: 14px; line-height: 1.5; margin: 5px 0 0; color: var(--cn-dough); }

    @media (prefers-reduced-motion: reduce) {
      .cn-band__track { animation: none; }
      .cn-ticket, .cn-sheet, .cn-ticket--punch { animation: none; }
      .cn-btn, .cn-board__mark { transition: none; }
    }
  `
}
