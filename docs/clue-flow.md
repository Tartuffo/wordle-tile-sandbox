# Clue flow redesign

Status: design agreed, not built. Baseline is `v0.2` (`0bade8c`).

## Goal

One thing on screen at a time until the clues are in. The user picks how to give the clues, gives them, and lands on a summary; only then do the board and the arrangements appear. No numbered steps.

## The clue card

One card, always in the same place, whose body is in one of three states. The states replace each other; nothing stacks.

| State | Body | Leaves to |
|---|---|---|
| Chooser | Paste screenshot (primary), Choose image, Type clues, Practice puzzle | Editor or Summary |
| Guess editor | Guess rows, Use these clues, Cancel | Summary, or back where it came from |
| Summary | Guess words, In, Out, Edit or New puzzle, Start over, copy link | Editor, or Chooser |

Before the summary, the card is the only panel on the page. The board, the arrangements and the reference tables are absent, with no greyed headers. On a phone the chooser's buttons stack as rows.

### Chooser

- **Paste screenshot** and **Choose image** read the screenshot and go straight to the summary, with no review.
  - Exception: if the reader flagged any letter as unsure, the guess editor opens instead, filled with what was read, the unsure tiles marked, and a line saying how many letters to check. It is the ordinary editor, not a separate mode.
  - A failure (no image on the clipboard, unreadable image) shows a message in the chooser and stays there.
- **Type clues** opens the guess editor, empty.
- **Practice puzzle** makes up a puzzle and goes straight to the summary, with no review.

### Guess editor

Replaces today's green / yellow / gray form, which is retired from the UI.

- Rows of five tiles. Typing fills the current row left to right; Backspace removes the last letter.
- A filled tile starts gray. Tapping it cycles gray, yellow, green.
- Holding a filled tile (or right-clicking it) clears that one letter. The gap is where the next typed letter goes, and the slot keeps its color.
- A new empty row appears when the last one is full, up to six. A row can be removed.
- **Use these clues** is enabled once every started row is complete and there is at least one row. Contradictory rows (a slot green for two different letters, and so on) are reported in the card and block it.
- **Cancel** returns to the summary if the editor was opened by Edit, otherwise to the chooser. Nothing changes.

The same editor serves Edit from the summary, for guesses that were typed. Guesses read from a screenshot have no Edit unless they went through the editor to have an unsure letter checked.

### Summary

- **Guesses:** the guess words in order. Tapping a word shows the clues as of that guess; the words up to it are highlighted. This replaces the `‹ Guess 2/3 ›` control.
- **In:** the existing mini stack, a column per slot with the green letter or the letters that were yellow there.
- **Out:** the letters not in the word. A letter with one gray copy and one colored copy is in the word, so it isn't listed here.
- A line above says when an earlier guess is the one shown: "Showing the clues after guess 1 of 3."
- **Edit:** reopens the guess editor with the current guesses. Shown for typed guesses only, not for a clean screenshot read.
- **Practice puzzles:** a line says "Practice puzzle. The answer is hidden." and **New puzzle** takes the place of Edit, since edited colours would disagree with the hidden answer. New puzzle draws another in place.
- **Start over:** returns to the chooser and hides the other panels. The chooser shows "Clues cleared. Undo" until new clues are used or the page is left; Undo restores the clues, the selected guess, the pins and the letters tried on the board. No confirmation dialog and no timer.
- Copy link and help stay in the card's top right corner.

Clues that arrive without guesses (a link made before this change) show In and Out only: no guess words and no Edit.

Below the summary, the board and the arrangements panels appear as they are today, without their numbers.

## Navigation

- The phone's Back gesture and the browser's Back button do what Cancel does in the editor. From the summary, Back does not start over.
- A shared link, and a same-day reload, open directly on the summary.

## Data model

Today the guesses live only in memory (`importHistory`) and are dropped on reload or on any manual edit; the saved state and the links carry only greens, yellows, grays and tile counts.

- Guesses become the source of truth. Greens, yellows, grays and counts are derived from the guesses up to the selected one (`setCluesFromGuesses` already does this).
- The saved state stores the guesses, the selected guess and whether it is a practice puzzle.
- Links gain a guesses parameter (words and colours). The old `green` / `ban<i>` / `yellow` / `gray` parameters are still written and still read, so old links open and new links degrade gracefully.

## Removed

- **The green / yellow / gray form**, replaced by the guess editor.
- **Excluding a letter from the letters panel** (hold or right-click to mark it gray, and letting a gray letter back in). Grays come only from the guesses.
- **The double-letter count override.** Counts are derived from the guesses.
- **Step numbers** on the panels.

## Smaller decisions

- The editor does not check guesses against a word list; any five letters are accepted.
- The board and arrangements panels keep their fold toggles and lose their numbers.
- The first-time tips are rewritten for the new flow; the chooser carries the one-line introduction.

## Deferred

- **Two phone previews.** `?view=mobile` and the Dev panel's Phone width overlap. Not part of this redesign; to be settled before more is built on either.

## Build order

1. Guesses as the stored model: saved state, links, derivation. No visible change.
2. Card states and visibility: chooser, summary, hidden panels, no step numbers.
3. Guess editor, wired to Type clues and Edit.
4. Summary: tappable guess words, Start over with Undo.
5. Paste, Choose image and Practice puzzle straight to the summary; unsure reads open the editor.
6. Back handling, first-time tips, help dialogs, README, tests.

Each stage leaves the app working and the tests passing.
