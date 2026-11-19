# Working on Wordle Tile Sandbox

A single-file static web app: `index.html` holds the markup, styles and script. There is no build step. Playwright browser tests are in `tests/sandbox.spec.js`; run them with `npm test` (in a cloud session, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium` first). The README's "What it does" section and the `?` help dialogs in `index.html` describe every user-facing behaviour; keep both in step with any change to it.

## Preview links

After every push that changes the UI, give a preview link that opens the pushed commit through raw.githack, so it shows exactly that commit and not whatever the branch later becomes:

```
https://raw.githack.com/Tartuffo/wordle-tile-sandbox/<full commit SHA>/index.html?dev=1&<clue parameters>
```

- Always include `dev=1`, which turns on the Dev panel at the bottom of the page (a phone-sized preview frame, Click/Tap wording, and resets for the tips and remembered choices).
- Add clue parameters that show the change: `green` is the five-letter pattern with `?` for unknown slots, `ban<i>` the letters that were yellow in slot `i` (0-based), `yellow` the movable tiles (a letter repeated for each tile), and `gray` the gray letters. For example `green=%3F%3FB%3F%3F&ban1=ED&ban2=ER&ban3=E&yellow=EDR&gray=STLN`.
- Give one link per state worth looking at, with a few words on what each shows. Use the full 40-character SHA from `git rev-parse HEAD` after the push.
