
# HERO AUDIT — Santorini Online V2.6.1

Audit date: 2026-11-08. Scope: all 10 classic Golden Fleece Hero Powers and game UX/UI at commit 6c0b7e24ce802533a87323012eb75a316d96210b.

Source of truth: Roxley/Spin Master Golden Fleece classic Heroes #46–55 (2016–2018 rules). This is NOT an audit of 2025 Pantheon cards.

## Audit verdict

- All 10 Heroes exist with Vietnamese help, 2-player-only variant, once-per-game flags, and nominal direct engine tests.
- **2 high-severity engine defects** identified in turn viability, both independently reproducible via new audit tests (Jason, Odysseus).
- **Adonis requires follow-up**: rule describes the position at the end of the opponent's next turn, but engine constrains the opponent's first move. Combination with voluntary Atalanta multi-move may be over-restricted or insufficiently enforced.
- Multi-phase Hero UX does not adequately distinguish already consumed versus still resolving, and irreversible consumption happens without a confirmation. No countdown for several actions; weak target indication.
- This is a source/engine audit, **not an actual tested responsive mobile UI session**. Need on-device E2E for WebGL click targets and mobile/desktop tap hit areas.

## Complete matrix

| Hero | Rules audit | UX/UI audit | Priority |
|---|---|---|---|
| Achilles | Happy-path correct: build before then move and build | Worker/target preview and remaining sequence unclear | P2 |
| Adonis | Partial: adjacency constraint checked on initial move rather than final turn | Marked enemy pawn and deadline invisible | P1 |
| Atalanta | Happy-path correct: additional moves and optional finish | No counter, timing/one-use confirmation weak | P2 |
| Bellerophon | Happy-path correct: single +2 climb | Distinct leap cue needed before skill is spent | P2 |
| Heracles | Happy-path correct: unlimited adjacent domes from either Worker | No used/remaining stage indication; ambiguous builder | P2 |
| Jason | **Bug:** legal third-worker deployment ignored by turn-viability detector | Alternative-to-normal turn and third Worker not highlighted | **P0** |
| Medea | Happy-path correct: lower one block under eligible neighboring Workers | Multiple targets and floor changes insufficiently indicated | P2 |
| Odysseus | **Bug:** viable start-of-turn forced movement ignored by turn-viability detector | Picker uses enemy ID + text coordinates without map tie-in | **P0** |
| Polyphemus | Happy-path correct: max two arbitrary domes on free cells | Show 0/2, 1/2, 2/2 and finish option | P2 |
| Theseus | Happy-path correct: remove one adjacent enemy exactly 2 levels up | Show height comparison and confirmation before use | P2 |

## P0 details / repro

### AUDIT-H001: Jason falsely loses despite legal Hero turn

- Prepare a board where both Jason original Workers cannot move normally (surrounded by domes) but a ground-level perimeter cell and neighboring construction square are available.
- The authoritative action generator returns heroDeploy (place third Worker, then build).
- canTakeTurn returns false because it checks only legalMoves (plus a Hermes exception).
- At the start of the next turn, advance can incorrectly declare the Jason team defeated despite a legal one-time alternate turn.
- Reproduced in test/hero-audit-baseline.test.js. Source: src/game.js, canTakeTurn (around line 163), heroDeploy generator (around line 258), advance (around line 384).

### AUDIT-H002: Odysseus falsely loses despite legal start-of-turn force

- Surround both own Workers with blockers/domes; an opponent Worker blocks the only movable cell, and a free corner exists.
- The authoritative action generator returns heroCorner. Force the opponent to corner, then skip optional extra corners and move into freed square.
- canTakeTurn before the forced move returns false. advance can award opponent the game too early.
- Reproduced in test/hero-audit-baseline.test.js. Source: src/game.js, heroCornerActions, canTakeTurn and advance.

## P1 rules / state / UX

- **Adonis timing:** the official requirement applies to the enemy selected Worker's position at END of their next turn, if possible, not necessarily after the first move. The engine constrains initial move options when an immediately adjacent solution exists. The interaction with voluntary Atalanta Hero movement needs an explicit, correct end-of-turn feasibility and validity model; no Hero effect may force an opponent to consume their own Hero.
- **ACTIVE vs USED:** immediately on activateHero, heroUsed turns true; the current UI shows “Hero Power đã sử dụng trong ván này” even while heroDomes, heroMedea or heroSprint is still in progress.
- **Confirmation:** the generic “Kích hoạt Hero” button directly sends activateHero, spending an irreversible once-per-game power before user understands follow-up steps.
- **Target status:** the opponent has no prominent on-board indication of an Adonis mark and its next-turn requirement. Existing target popover is textual rather than spatial.

## UX/UI changes recommended

1. A fixed contextual Hero strip for each turn with hero icon/name, stage timing (“TRƯỚC DI CHUYỂN / ĐANG DI CHUYỂN / CUỐI LƯỢT”), and 4 states: READY, PREVIEW, ACTIVE (progress), USED. It must fit on 375px portrait and 1366x768 desktop, with 2D fallback.
2. Use explicit “Kích hoạt một lần” confirmation before committing irreversible Hero actions, and render their consequences/eligible squares while previewing.
3. Highlight own Worker(s), marked enemy pawn, candidate destination squares, valid empty corners and height deltas on both 3D and 2D boards.
4. Show progress for Atalanta (# extra steps), Heracles (# domes), Medea (# target Workers affected), Odysseus (# enemies moved), Polyphemus (0/2–2/2), and Jason (extra third Worker).
5. Distinguish “Bỏ qua năng lực chưa dùng” from “Hoàn tất hiệu ứng đang dùng”; make buttons always visible without horizontal scrolling.
6. Add E2E screenshot and touch testing across 320/375/430px mobile portrait, 667x375 landscape, 1366x768/1920x1080 desktop, reconnect, BOT, and 2D fallback.

## Test state and next actions

- Existing 10 Hero test cases cover nominal happy paths; they do NOT prove correctness for all interactions.
- New audit-baseline tests record the two reproducible defects. They intentionally describe current behavior and should be replaced by fixed expected behavior when production repairs ship.
- **Sprint 1:** repair engine turn-viability for Jason and Odysseus; add before/after regression plus BOT/WebSocket smoke.
- **Sprint 2:** Adonis end-of-turn constraints; comprehensive Hero-vs-Hero cross-power tests.
- **Sprint 3:** Hero-specific preview, confirm, status/progress and mobile/PC UI tests.
- **Sprint 4:** cinematic 3D Hero effects and accessibility/quality gates.

This audit branch does not change production gameplay. Do not merge audit-baseline “known broken behavior” assertions into main until replacing them with correct post-fix assertions.
