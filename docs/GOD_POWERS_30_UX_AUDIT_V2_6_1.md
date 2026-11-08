
# AUDIT — Santorini Online V2.6.1 | 10 Basic Gods + 20 Advanced Gods and UX/UI

**Date:** 2026-11-08  
**Production main SHA:** `6c0b7e24ce802533a87323012eb75a316d96210b`  
**Primary reference:** Roxley Santorini Classic rules 2017.02.05 (also matching the archived classic rules at https://files.roxley.com/Santorini-Rulebook-Web-2016.08.14.pdf). **Not the new 2025 Pantheon rule system.**  
**Scope:** `src/game.js`, `src/index.js`, `src/bot.js`, `public/app.js`, `public/board3d.js`, `public/style.css`, `public/index.html`, existing unit tests & the new `test/30-god-audit-baseline.test.js`.

## Audit methodology and limitations

- The engine contains 10 Simple and 20 Advanced Gods, correctly split for 2-player draft; legacy mixed 30-God rooms remain supported.
- Reviewed all 30 triggers, rules, interactions and UI action exposure. Each God has a Vietnamese help entry and a positive-case test, but those tests do **not** exhaust cross-God interactions, four-player passive effects, asynchronous reconnect or every forbidden move.
- The new baseline tests confirm **current buggy behavior**, NOT fixes. The audit branch has no production JavaScript changes. Convert these to expected-correct results when implementation fixes ship.
- No actual remote browser or mobile-device pixel/gesture test has been performed. UX/UI findings are based on DOM/CSS, server action contracts and 3D picking source, not a user study or screenshots from live devices.
- Rulebook terms: Forced is not Moved; a Complete Tower has 3 blocks plus a dome; timing markers such as Start of Opponent's Turn / Any Move / End of Your Turn matter.

## Executive severity

| ID | Severity | Confirmed finding | Evidence / acceptance |
|---|---|---|---|
| G-001 | P0 | Chronus counts Atlas *early* domes as Complete Towers because `completedTowers()` counts all board cells with value 4. | Baseline game-state test reproduces early win; store dome's actual underlying construction height separately, with data migration. Five physically complete towers, not five arbitrary domes, must be necessary. |
| G-002 | P0 | In 4P teams, the effective God per team is overwritten as active seat changes; opponent-turn passives (Hera, Aphrodite, Hypnus, Limus, Persephone) can vanish when their owner's teammate has the team turn. | `advanceAfterAction` swaps `r.game.gods[team]` while helper `hasEnemyGod`, `god(g,other)` inspect only those two IDs. Preserve four seat powers for passive evaluation independently of active-turn power. |
| G-003 | P1 | Dionysus currently stops after the first forced-opponent bonus build even when that bonus Worker completes another tower. Official "each time" may grant an additional controlled turn. | Baseline game-state test reproduces no follow-up `dionysusChoice`; implement chain with proper no-win constraints and cycle limits. |
| G-004 | P1 | Chaos redraws from the same unshuffled deck order when exhausted. Official rule requires reshuffling discarded Gods into a new deck. | Baseline deterministic deck-wrap test; track draw vs discard pile and reshuffle on depletion. |
| G-005 | P1 | Hermes-vs-Aphrodite: a Hermes same-level detour which later returns adjacent to Aphrodite is rejected on the first move; rule constrains the **last move**, not all moves. | Baseline 2,2 -> 1,2 -> 2,1 scenario; implement end-of-turn feasibility rather than over-restricting intermediate moves. |
| G-006 | P1 | Triton-vs-Persephone: a legal edge detour before later upward movement is rejected because a direct upward move exists; Persephone requires **at least one climb during the turn**, not necessarily the first move. | Baseline 1,2 -> 0,2 -> 1,3 scenario. |
| G-007 | P1 UX | Bia removes a Worker correctly but `lastAction` is subsequently overwritten by generic move narration, hiding the knockout. | Baseline test checks victim removed but event text lacks Bia; preserve structured power-event queue. |
| G-008 | P1 UX | Chaos currently active Simple God and Circe stolen power are not presented clearly in the live power HUD. Athena restriction also has no turn-state badge. | `renderPowers` uses `seatGod()` for the base God; no Chaos deck / Athena-block rendering. |
| G-009 | P1 UX | Critical build/move actions share the same rings; players are not shown forbidden squares or causal reasons for passive restrictions, forced movements, win zones. | 3D `highlights` uses generic move/build rings; tooltip is line-clamped to one/two lines. |
| G-010 | P2 UX | Selene uses Worker index 1 as female; 3D has staff/helmet on index 1 but never explicitly says "female Worker" on the board. | Add visible F badge/icon in 2D/3D and highlight the correct builder. |

## Matrix: 10 Simple Gods

Status P = existing positive-path automated coverage, not complete edge verification.

| God | Core mechanics in engine | Issue / UX gap | Grade |
|---|---|---|---|
| Apollo | P: swaps own Worker into enemy space, forcing enemy to vacated space, normal climb restriction | Show before/after arrows & affected enemy; no input for opponent power | Functional P / UX P2 |
| Artemis | P: one extra move, never back to initial square, skip allowed | Show original square, “1/2 moves” and explicit Finish | Functional P / UX P2 |
| Athena | P: one-turn climb prohibition tested in 2P; 4P uses separate aura | No conspicuous “opponents cannot climb” marker or duration | Functional P / UX P1 |
| Atlas | P: dome at any level | G-001 interaction with Chronus; preview should label “early dome, not Complete Tower” | **P0 cross-power** |
| Demeter | P: optional second build, never same square | Mark first build tile; show bonus phase and skip | Functional P / UX P2 |
| Hephaestus | P: extra block atop first block, not dome | Show “1/2, 2/2”; mark same construction target | Functional P / UX P2 |
| Hermes | P: zero or many level moves then any one Worker builds | G-005: incorrectly constrained by Aphrodite on first move; no movement path history | **P1** |
| Minotaur | P: push Worker straight back to unoccupied square; self movement normal | Show landing square/force arrow. No win for force onto level 3 | Functional P / UX P2 |
| Pan | P: special win when dropping >=2 levels | Preview 2-level drop victory and post-win explanation | Functional P / UX P2 |
| Prometheus | P: prebuild then no climb; same Worker moves and builds again | Show compulsory Worker ID, completed prebuild and no-climb status | Functional P / UX P2 |

## Matrix: 20 Advanced Gods

| God | Core mechanics in engine | Issue / UX gap | Grade |
|---|---|---|---|
| Aphrodite | P: restrict ending adjacent if started adjacent | G-005 Hermes multistep timing; no affected Worker/pending requirement indicator | **P1** |
| Ares | P: optional remove block by unmoved Worker | Remove preview + show which Worker is unmoved; skip stays visible | Functional P / UX P2 |
| Bia | P: removes opponent Worker behind arrival square | G-007 generic narration overwrites knockout; show clear elimination direction | **P1 UX** |
| Chaos | P: draws from unused Simple God deck & changes after a dome | G-004 deck not reshuffled; G-008 currently active God invisible in HUD; deck remaining count absent | **P1** |
| Charon | P: enemy Worker forced across own Worker before own move | Highlight target and landing together; disclose forced climb does not win | Functional P / UX P2 |
| Chronus | P: checks five domes, including during opponent build | G-001 false victory with Atlas early domes; missing 0–5 **completed** tower counter | **P0** |
| Circe | P: borrows opponent ability when enemy Workers are apart; Morpheus stock borrowing recently corrected | G-008 stolen God name and suppressed enemy power not displayed; needs seat-aware status | Functional P / UX P1 |
| Dionysus | P: controlled opponent Worker after constructing tower; skip command available | G-003 chained completed towers; bonus Worker/turn ownership confusing and no clear “cannot win” overlay | **P1** |
| Eros | P: setup opposite edges, level-1 paired Worker special win in 2P | Preview pair-distance and condition to make same-level pair | Functional P / UX P2 |
| Hera | P: prevents opponent winning by movement to perimeter | G-002 passive disappears during teammate turns in 4P; perimeter win-block marker absent | **P0 in 4P** |
| Hestia | P: optional additional non-perimeter build | Mark perimeter exclusion and second-build phase | Functional P / UX P2 |
| Hypnus | P: disables unique-highest opponent Worker | G-002 4P passive; immobilized Worker lacks icon/tooltip/reason | **P0 in 4P** |
| Limus | P: prohibits neighbor build except dome completing a tower | G-002 4P passive; illegal build squares lack reason text | **P0 in 4P** |
| Medusa | P: end-turn petrification of lower adjacent opponent | No pre/end-turn risk area and block-replacement transition legend | Functional P / UX P1 |
| Morpheus | P: V2.6.1 stock accrual, spending, skip and regular dome shape | Make reserve persistently visible in roster; no state cue for Circe stealing supply | Functional P / UX P2 |
| Persephone | P: demands an up move if immediately possible | G-006 multistep timing (Triton); G-002 4P passive; no “must climb this turn” badge | **P1 / P0 4P** |
| Poseidon | P: 0–3 extra builds by non-moving ground Worker, optional stop | Show 0/3–3/3 and which Worker is builder; V2.5.1 skip remains visible | Functional P / UX P2 |
| Selene | P: index-1 female Worker may build early dome after other Worker moves | G-010 identify Worker index and the selected build origin in both modes | Functional P / UX P1 |
| Triton | P: continue moving after entering perimeter; skip available | G-006 Persephone interaction; show path/count and exit options | **P1** |
| Zeus | P: build a block directly under own Worker, no victory from forced upward movement | Own tile build target is easy to confuse with Worker-selection tap; add mode marker | Functional P / UX P1 |

## UX/UI architecture assessment

**What already works**
- 2 separate 2P modes (10 basic / 20 advanced); engine rejects out-of-pool God selections.
- Server-authorized legal action list, shared by 2D and 3D, limits illegal movement.
- Dedicated persistent Skip and end-move buttons after V2.5.1. Poseidon skip, Hermes Worker choice, Morpheus stock status are supported.
- V2.6 expanded selection cards and full details dialog; all 30 have Vietnamese How-to entries.

**Structural deficiencies**
1. God HUD currently prioritizes whichever seat is taking the turn. Opponent-turn passive powers require a separate **persistent effects layer**, with icons, source/target, trigger time and turns remaining.
2. All highlighted tiles are effectively generic move/build targets. Require separate semantic highlight styles for **MOVE, FORCE, SWAP, PUSH, BUILD, DOME, REMOVE, WIN, INVALID** and a non-blocking preview.
3. Move/build phase bar is sometimes capped at 37–39px height, small 9–11px text and line-clamped help; on mobile, crucial context disappears. Upgrade to tap targets >=44px, short primary actions, collapsible contextual help instead of clipping.
4. Chaos must show “Current power: ...” card and last/next draw; Circe must show borrowed power name and opponent disable state. Hypnus, Limus, Hera, Athena, Aphrodite, Persephone should show warnings on affected side.
5. Special multi-step phases need a persistent progress marker (Poseidon 0–3, Demeter 1–2, Triton step count, Hermes path length, Dionysus controlled turn, Morpheus stock).
6. Ability-specific post-action event feed. Bia elimination and Charon/Minotaur force on level 3 should describe *why this is legal* and why no win occurs.
7. Retain one-screen board and 2D fallback; test at PC 1366×768, 1920×1080; mobile 320, 375, 430px portrait and 667×375 landscape. No visual device QA has yet been run.

## Priority roadmap and acceptance

### Fix group A (P0: engine)
- Store per-cell full tower metadata separate from simple dome occupancy. Migrate persisted games; Chronus win only at five complete towers; early dome by Atlas/Selene cannot count.
- Replace 4P team-only passive checks with a seat-aware registry of all four God Cards for off-turn effects, separate from active seat’s own action power; test all five passive Gods against both enemy seats and their teammates.

### Fix group B (P1: engine)
- Make Aphrodite/Persephone constraints evaluate **turn-end or any-action-in-turn** requirements for multi-move God Powers, with bounded turn-plan viability rather than immediate-only movement filtering.
- Allow legal Dionysus bonus chains after completed towers as official; prevent victory in every bonus; add loop safety and BOT/timeout tests.
- Track Chaos draw/discard order and reshuffle when the deck is depleted. Preserve seeds for deterministic testing.

### Fix group C (P1/P2: UX)
- Show all passive statuses, current Chaos/Circe secondary power, warnings, selected Worker identity and phase-specific build target.
- Non-clipping actions and 44px touch targets; per-power short “what to do now” prompt and an inspectable details sheet.
- Add semantic 2D/3D target colors, force arrows, win/dome previews and clear event history. Validate across viewport sizes, WebGL and 2D fallback.

### Release gates
- Replace the intentionally bug-confirming assertions in `test/30-god-audit-baseline.test.js` with positive **expected-correct** assertions.
- Run all existing unit tests, God×God adversarial scenarios, 3P/4P full WebSocket smoke, BOT-vs-BOT benchmarks, reconnect/resume and actual PC/mobile browser E2E.
- Only merge gameplay fixes following green CI, Cloudflare deployment success and live Health version verification.

## Status
**Audit only. No production game code changed, and no claim of pixel-level browser QA.** Test results in this branch demonstrate present limitations rather than functional fixes.
