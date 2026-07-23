# Design Direction

## Thesis

This site is a fictional 90s birthday arcade cabinet for Lenya. It refuses a greeting-card layout and instead turns private jokes into playable cartridges.

## Visual World

Retro console UI with crisp pixel edges, black-violet night background, saturated arcade colors, CRT scanlines, cartridge panels, chunky borders, and small pixel illustrations. The world borrows from NES/SNES menus, Pac-Man cabinets, racing HUDs, and school-notebook clutter without copying any one game.

## Palette

- `#090812` cabinet black
- `#17142a` deep panel
- `#2b2351` purple shadow
- `#ffe45c` birthday yellow
- `#ff4d6d` danger pink
- `#35e6a6` success mint
- `#46b3ff` electric blue
- `#f7f2d8` warm pixel text

Use all accents as arcade roles, not random decoration. Yellow is birthday/primary. Pink is warning/Eva penalty. Mint is success. Blue is system/highlight.

## Typography

Use browser-safe stacks with pixel rendering. Main display and buttons use `"Courier New"` fallback styled as pixel type. Avoid thin text. Keep Russian labels short and legible.

## Components

- Arcade cabinet shell
- Cartridge game tiles
- HUD strips with score, timer, combo, best
- Chunky 4px borders and hard pixel shadows
- Buttons with immediate press feedback
- Pixel avatars and props from transparent PNG sprite assets

## Motion

Motion is playful but purposeful: cartridge hover lift, CRT flicker, game-start transition, hit/penalty feedback, and celebration unlocks. Respect reduced motion.

## Responsive Rules

Desktop shows menu and game cabinet side by side when useful. Mobile stacks content, keeps game boards touch-friendly, and avoids tiny click targets.
