<!-- EDITING FORMAT: See data/changelog-format-guide.md for every supported style and copy-ready examples. -->

# PalaRivals Watch Development Archive

## Version 0.3.0 — Arcade Expansion
Date: August 21, 2026
Status: Current Build

### Leader Protocol
- Added **Leader Protocol**, a complete new Arcade mode with its own HTML, CSS, JavaScript, and balance data.
- Choose one of three random hyper-powered leaders at the start of every run.
- Build a six-unit formation against seven uniquely named AI commanders.
- Leader auras buff Inspired heroes and penalize Conflict heroes based on their universe, playstyle, and class tags.
- Added Command Link breakpoints at 2, 4, and 6 matching units.
- Leaders Ascend every third round, increasing their power, health, and signature ability output.
- AI commanders choose heroes that complement their own leader instead of building randomly.
- Added formation reordering, selling, rerolls, combat inspection, animated leader abilities, and elimination rounds.

> The crown is powerful, but a formation that ignores its doctrine can be weaker than the sum of its parts.

### Crownfall Draft
- Added **Crownfall Draft**, a tactical Arcade mode that transforms the PalaRivals roster into a playable hero-chess army.
- Face one AI rival in a contested draft where both commanders claim heroes from the same shared pool.
- Assign a different hero to your pawns, rooks, knights, bishops, queen, and king before the match begins.
- Added **90 unique hero-piece abilities**: every one of the 15 available heroes has a different ability for all six chess roles.
- Hero abilities can alter movement, grant capture shields, vault allied pieces, rally surviving units, protect the king, or generate extra turns.
- Added legal-move highlighting, check, checkmate, stalemate, automatic promotion, move history, piece inspection, and AI tactical responses.
- Added a dedicated responsive command interface for drafting and playing on desktop and mobile screens.
- Crownfall Draft is now available as Arcade Protocol 03

> Six identities become an army. Draft the pieces, bend the board, and bring down the rival crown.

### Arcade Interface
- Rebuilt the Arcade selector as a full alternate-reality command terminal.
- Added richer mode summaries, feature tags, format details, animated protocol cards, live channel telemetry, and an encrypted upcoming-mode signal.
- Added unique Arcade color treatments for the default, Marvel Rivals, Paladins, and Overwatch menu themes.
- Improved keyboard focus, short-screen scrolling, and mobile stacking for the mode selector.

### Community Feedback
- Added a main-menu suggestion terminal for feature requests, balance ideas, hero concepts, interface changes, game modes, and bug reports.
- Added an automatic local queue so feedback is not lost while the shared channel is offline.

### Ai Improvment
- Fixed a bug where the AI does not ready up
- The Ai now builds teams based on the traits and how good a character is.

### Hero Compendium
- Added hero compendium

## Version 0.2.0 — Ability Draft & Balance Changes
Date: August 20, 2026
Status: Previous Build

### Ability Draft
- Added six-slot hero repositioning and occupied-slot swapping.
- Matching heroes can now merge from level 1 through level 4.
- Merged heroes gain additional power and health.
- Heroes with different equipped abilities now create a **fused loadout** that keeps every effect active.
- AI opponents can create leveled heroes and fused ability combinations.
- Added complete hover, focus, and mobile-tap information panels for every unit.

> Ability Draft remains an experimental Arcade mode and will continue receiving balance changes.

### Interface
- Added clearer merge targets, level indicators, progression displays, and fusion styling.
- Improved the Ability Draft layout on desktop and mobile screens.

### Match Intelligence
- Added live opponent scouting from the combatant leaderboard, including formations, hero levels, squad totals, and detected traits.
- Added after-action combat recaps with damage, damage taken, healing, eliminations, critical hits, dodges, ability activations, and survival data for every hero.
- Expanded spectator mode into a live command center: watch every surviving AI build its squad, then follow every remaining battle at the same time.
- AI commanders now recruit, merge, and lock in their teams much faster during the build phase.

### Balance Changes

::: buff Hulk
Ability: Worldbreaker
- After traits and merging were added, Hulk's power gain felt underwhelming. This makes his scaling more threatening.
Stat: Power after Knockout | +2 | +4
:::

::: adjust Spider-Man
Ability: Spider-Sense
- Spider-Man felt inferior to his tier-one counterpart Tracer despite costing more, so his opening damage is becoming an execute effect.
Stat: First-strike Damage | +2 | Removed
Stat: Execute Threshold | None | 35% Health
Stat: Execute Damage | None | +3
:::

::: buff Thor
Ability: God of Thunder
- Thor did not have a clear place in the game, so we are testing a higher critical rate.
Stat: Critical Chance | 8% | 18%
:::

::: nerf Tracer
Ability: Blink Recall
- Tracer has become the strongest tier-one character with her ability and Overwatch trait, so we are reducing her maneuverability.
Stat: Dodge Chance | 25% | 18%
:::

::: buff Moji
Ability: Familiar Feast
- Moji was weak compared with other tier-one units. These changes increase her execution capabilities.
Stat: Execute Threshold | 40% Health | 50% Health
Stat: Execute Damage | +4 | +8
:::

::: buff Raum
Ability: Soul Armor
- Traits and merging caused Raum to fall behind, so his tier-four presence is becoming more threatening.
Stat: Lifesteal | 20% | 25%
:::

::: buff Seris
Ability: Soul Collector
- Seris had low survivability, so her knockout recovery has been increased slightly.
Stat: Health after Knockout | +2 | +3
:::
