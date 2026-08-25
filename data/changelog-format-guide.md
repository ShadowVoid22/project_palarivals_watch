# Changelog Formatting Guide

Edit `data/changelog.md` to update the in-game changelog. The website turns the text styles below into themed UI automatically.

## Release structure

Start each release with this format:

```
## Version 0.9.0 — Release Name
Date: August 20, 2026
Status: Current Build

### Section Name
- A normal change.
```

Put `---` between releases.

## Hero balance cards

Balance cards are the best format for buffs, nerfs, and ability changes. The available styles are `buff`, `nerf`, `adjust`, `fix`, and `new`.

```
::: buff Hulk
Ability: Worldbreaker
- Explain why the hero is changing.
Stat: Power after Knockout | +2 | +4
:::
```

Each stat row uses `Stat: Label | Old Value | New Value`. Add as many stat rows as needed.

```
::: nerf Tracer
Ability: Blink Recall
- Explain why the hero is changing.
Stat: Dodge Chance | 25% | 18%
Stat: Bonus Damage | +4 | +2
:::
```

Use `adjust` when a change is neither a clear buff nor a clear nerf:

```
::: adjust Spider-Man
Ability: Spider-Sense
- Moving power away from the opening strike and into an execute effect.
Stat: First-strike Damage | +2 | Removed
Stat: Execute Damage | None | +3
:::
```

## Callout boxes

Callouts make important information stand out:

```md
> [!NOTE] General information about the update.
> [!TIP] A useful gameplay tip.
> [!WARNING] An important warning or known issue.
> [!BUFF] A general buff that is not tied to one hero.
> [!NERF] A general nerf that is not tied to one hero.
> [!FIX] A notable bug fix.
```

A normal highlighted quote still works:

```md
> Ability Draft remains an experimental Arcade mode.
```

## Text styles

Use these anywhere in descriptions, lists, and callouts:

```md
**Bold text**
*Italic text*
==Highlighted text==
~~Removed text~~
`Game term or code`
```

## Headings and lists

```md
### Main Section
#### Smaller Subsection

- Bullet point
- Another bullet point

1. First numbered step
2. Second numbered step
```

## Complete copy-ready release

```md
## Version 0.9.0 — Balance Protocol
Date: August 20, 2026
Status: Current Build

### Balance Changes

::: buff Hero Name
Ability: Ability Name
- Explain the goal of the change here.
Stat: Power | 8 | 10
Stat: Health | 40 | 45
:::

::: fix Another Hero
Ability: Second Ability
- Fixed an issue where the effect activated twice.
:::

### Interface
- Added ==new balance cards== to make changes easier to scan.
- Improved **mobile readability**.

> [!NOTE] Add an important message here.

---
```
