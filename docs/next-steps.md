# Next steps

Where the work stands and what is still open. Update this file as items are done.

## State

- `main` has the clue flow redesign and what followed it, merged as pull request #22 (`2953831`). `0bade8c` is the commit before that work, to be tagged `v0.2`.
- `docs/clue-flow.md` is the design for the first six stages of the redesign.
- Changes made after those six stages, which `docs/clue-flow.md` does not describe (the README and the help dialogs do):
  - No Edit clues after a clean screenshot import; guesses that went through the editor count as typed.
  - The board's and the arrangements' headings don't fold, and the arrangements are the lower part of the board's panel.
  - The board has no label and takes the panel's width. Above it: the arrangement stepper, then in yellow over each open slot the letters that were yellow there. Put grid first is at the bottom of the panel.
  - Putting another arrangement on the board clears the letters tried on it.
  - Drag rules: a tile dropped on a tried letter replaces it; onto a yellow tile the two trade places; a yellow tile is refused in a slot where it was yellow.
  - Rank leaves gray letters out, as V/C does. Holding a letter, or right-clicking it, shows its share of the answers that still fit, in every view.

## To do

1. **Create the two tags.** Tag pushes are refused from a cloud session, so this is done from a laptop:

   ```
   git fetch origin
   git tag -a v0.1 2db6359 -m "v0.1: main before the dev panel and phone preview work"
   git tag -a v0.2 0bade8c -m "v0.2: dev panel, phone preview and ruler, clue-aware Rank"
   git push origin v0.1 v0.2
   ```

2. **Consider a `v0.3` tag** for the redesign as merged (`2953831` or later), once it has been tried enough on a phone.

3. **Choose one phone preview.** `?view=mobile` (with its ruler) and the Dev panel's Phone width do nearly the same job, and with both on the frame covers the ruler.

4. **Bring `docs/clue-flow.md` up to date** with the later changes listed above, or fold it into the README and delete it.

## Not verified on a real device

Checked only in a headless browser with simulated touch; worth a look on an iPhone when next changed:

- The shake of a board tile whose drop was refused.
- The screenshot reader's unsure-letter path, which was tested by faking the reader's output: no test screenshot produces an unsure letter.

## Working notes

- While the owner is testing on a phone, preview links use `dev=0` instead of the `dev=1` that `CLAUDE.md` asks for, since the Dev panel is remembered per site.
