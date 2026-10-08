# cursor-butterflies

Blue butterflies that follow the pointer, copied from Write-With-Nature (`src/cursor-butterflies/follow.ts` and
`src/butterflies/butterfly.ts`), so they behave exactly as they do there: each one settles into an orbit around the cursor on an
under-damped spring (they overshoot and swing back), beats its wings faster the faster it travels, is thrown away from a press and
then drawn back, throws a soft shadow on any butterfly under it, and roams the page on its own when there is no pointer. The canvas
never takes a click, and nothing is drawn for a visitor who has asked for reduced motion.

```
cursor-butterflies/
  butterfly.ts            the artwork (bezier wings, gradients, sprite baking), unchanged from WWN
  follow.ts               the motion and drawing, as WWN ships it, with one local change below
  CursorButterflies.jsx   a thin React wrapper (WWN has the same as react.tsx)
```

## Local changes

- `follow.ts`: WWN reads which creature to draw (butterfly or firefly) from its theme tokens. This app has only the paper look, so
  it is the constant `CREATURE = 'butterfly'` (marked `LOCAL CHANGE`). The firefly drawing is still in the file, unused.
- `follow.ts` imports the artwork from `./butterfly` instead of `../butterflies/butterfly`.
- The spaced dashes in the comments of both files are plain hyphens (this repo bans the long dash); no code changed.
- The app mounts three (WWN's default is five; `count` is the dial).
