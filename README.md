# Wordle Tile Sandbox

A simple visual sandbox for experimenting with possible Wordle solutions.

**Use it here: https://tartuffo.github.io/wordle-tile-sandbox/** It runs in your browser; there is nothing to install. Page views, and a few milestones such as a first clue entered or a first tile moved, are counted anonymously with [GoatCounter](https://www.goatcounter.com/) (no cookies, nothing personal stored).

I built this because I used to work through Wordle possibilities on paper, and sometimes with actual Scrabble tiles. That worked, but it was a little clumsy: I wanted an easy WYSIWYG tool where I could drag letters around, keep green tiles fixed, and see possible arrangements without constantly rewriting them.

Developed with assistance from ChatGPT and Claude Code.

## What it does

Wordle Tile Sandbox lets you enter what you know from a Wordle puzzle, slot by slot, and shows every way the yellow tiles can still be arranged. Optional analysis, closed until you ask for it, adds vowel odds and a letter ranking drawn from Wordle's answer list.

The page is three numbered steps: **1 Enter your clues**, **2 Try letters on the board**, **3 Browse every legal arrangement**. Steps 2 and 3 open as soon as there is something to show; a step's heading folds or unfolds it by hand. After a screenshot, Random or a shared link, step 1 folds to a one-line summary of the clues, with **Edit clues** to open it again and **Start over** to clear everything. On a first visit, four short tips appear one at a time, the first saying what the tool is for and the rest under the thing each explains; **?** on step 1 can show them again.

- **Paste or import a screenshot** of your Wordle game. **Paste screenshot** reads it from the clipboard, so it never has to be saved to Photos (on iPhone: take the screenshot, tap its thumbnail, tap Done, then Copy and Delete); **Import file** picks a saved one, and Ctrl/⌘+V works on a computer. Either way the grid and letters are read in the browser, you check them, and the green, yellow and gray rows fill in, including double letters. A solved row is left out. After importing, ‹ Guess 2/3 › steps back and forward through the guesses, so one screenshot gives you the clues as they stood after each guess; editing a clue by hand ends the stepping.
- **Random** makes up a puzzle to practice on: a past Wordle answer as the solution, which stays hidden, and a first guess drawn from the 400 answers with five different letters most common in answers. If that guess turns up fewer than two letters (green, or yellow tiles), a second guess that fits its clues is added, as in hard mode. It is drawn again until 3 to 40 arrangements fit a word, with a few, some (7 to 15) or many (16 or more) equally likely; ‹ and › step through the guesses as after an import. A line under the step says which guesses were made up, and **New puzzle** draws another.
- **Green row** (right spot): type a letter into each slot you know; it fills and moves on, like Wordle itself. Space skips a slot, and pasting a pattern such as `..A.E` into slot 1 fills the row.
- **Yellow row** (wrong spot): enter each letter under every slot where it turned yellow, across all your guesses. The app creates the tiles for you.
- **Gray row** (ruled out): letters that are not in the word. They sharpen the word check, and gray vowels feed the vowel odds. If a letter turned gray in one place but green or yellow in another, enter it here too: the word then has no more copies of it than your green and yellow ones.
- **Double letters**: a yellow letter counts as one tile, or as already placed if it is green elsewhere. When a letter could be in the word twice (yellow in two slots, or green in one and yellow in another), a **Double letters** row appears under the clues with **+** and **−** to change its count.
- **The board** shows one arrangement of your tiles, with green letters fixed. Tap an empty slot, then a letter on the keyboard below, to try it there; without choosing a slot, the letter goes in the first blank slot that allows it. A tried letter has an × to remove it (on a touch screen, holding it works too). Under the board, ‹ Arrangement 3 of 12 › says which of the listed arrangements it shows, and the arrows cycle through them in the list's order; otherwise a line says why the board isn't one of them, or that the blanks are still to fill. Once every slot is filled, it says whether the word is in the word list and whether it has been a Wordle answer: the date it was used, or the number of times and the last date if NYT has reused it.
- **Available letters**: under the board, the letters that aren't gray, so you needn't switch back to the game to check them. Show them as **Keyboard** (the default), **V/C** (vowels, then consonants) or **Rank** (most common in Wordle answers first, gray letters dimmed in place). Hold a letter (or right-click it) to mark it gray without going back to the clues, and hold a gray one to let it back in.
- **Drag tiles on the board** to try arrangements by hand; the list outlines the arrangement now on the board, and a tile in a slot where it was yellow is flagged.
- **Every legal arrangement**, sorted and grouped by where the most constrained letter sits. Tap one to put it on the board; tap a group heading to pin its letter there.
- **Matching words**: hold an arrangement (or right-click it) to list the dictionary words with its known letters in place. Words your clues rule out (a gray letter, or a letter in a slot where it was yellow) are struck through and listed last, and past Wordle answers are bold. Since this can give the answer away, it asks first, once per browser tab.
- **Where each letter can go**: a letter-by-slot grid counting the arrangements that put each letter in each slot, with forced placements called out and a legend for the cell styles. An "Unknown" row counts the slots shown as · in the list; an unknown slot may hold another copy of a known letter. Tap a number to pin that letter there and narrow the list. Tap a yellow letter at the left of the grid to sort the list by where that letter goes (pins still apply); tap it again to go back.
- **List or grid first**: the list comes first; **Put grid first**, next to the arrangement count, swaps them, and the order is remembered.
- **Word check**: arrangements that no word in the word list fits, given your gray and yellow clues, are left out by default; a Dim / Hide / Show switch can instead show them dimmed and struck through, or show them normally. The choice is remembered. Unknown slots may hold any letter that is not gray and was not yellow in that slot. The word list is in [`words/`](words/README.md).
- **More analysis**: closed by default; the choice is remembered. Inside:
  - **Vowel odds**: how many answers fit, and for each vowel (A E I O U Y) still unknown, the chance it is in the word, plus the chance that no other vowel is, to help you decide whether to keep trying vowels or switch to consonants. Options are sorted by chance and shaded by it.
  - The vowels start from your clues (a green or yellow vowel counts as present). Tap one to cycle it through unknown, yellow and gray; **Reset to clues** undoes your taps.
  - **Use: Vowels only / All clues**: by default only vowel clues count. All clues also uses your consonants, gray ones out and green or yellow ones in. That is closer to a solver, so it stays off until you choose it; the choice is remembered.
  - Two collapsed reference sections: **every case of one yellow and one gray vowel** (the two likeliest other vowels and the chance of none), and the **letter ranking** with percentages, noting the date of the latest answer in the list.
  - Odds count Wordle answer words, not letters, and ignore position.
- **Help**: each step has a **?** that explains it, and the first visit gets four short tips. Instructions say "click" on a device with a mouse or trackpad and "tap" on a touch screen.
- **Light and dark themes**: follows your device's light or dark setting; the sun/moon switch by the title overrides it, and that choice is remembered in the browser.
- **Copy link**, the link icon at the top right of the clues, shares the current clues. Your clues are also saved in the browser and come back if you reopen the app the same day.

The tool is intentionally visual: it helps you reason about the puzzle by moving tiles around on the board. It uses a word list to flag arrangements no word fits, and the answer list for letter and vowel odds and to say when a word on the board was an answer. Matching words stay hidden unless you hold an arrangement and choose Show words.

## Letters in Wordle answers

[Etaoin shrdlu](https://en.wikipedia.org/wiki/Etaoin_shrdlu) is an old mnemonic for the twelve most common letters in English, E T A O I N S H R D L U, taken from the order of the keys on Linotype typesetting machines. It ranks letters by how often they occur in running English text, which is a poor guide for Wordle: the answers are a few thousand five-letter words, and what matters is whether a letter is in the answer at all, not how often it turns up in prose. Ranked instead by the share of Wordle answers that contain each letter (each word counted once, so double letters don't inflate a count), the order is:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Answers | E | A | R | O | T | I | L | S | N | U | C | Y |
| % of answers | 45 | 39 | 36 | 29 | 29 | 28 | 28 | 27 | 24 | 20 | 19 | 18 |
| Etaoin shrdlu | E | T | A | O | I | N | S | H | R | D | L | U |

So the top twelve are **EAROTI LSNUCY**: R and L rise, H and D drop out, Y comes in. O, T, I and L are within 1.4 points of each other, so their order among themselves is close to a tie. The list is the union of the original Wordle answers and every answer NYT has used (see [`words/README.md`](words/README.md)); the table is from October 2026. The list is refreshed weekly, and [`words/answers-sources.json`](words/answers-sources.json) has its current word count and last date. The app computes the ranking from the current list, under **More analysis**.

## Development

This is a single-file static web app with no build step or dependencies. To modify it, edit `index.html` directly and reload the browser.

Opened directly as a file, the app works except for what needs the files in `words/`, since browsers don't let a local file load them: the word check, matching words, vowel odds and letter ranking are off, Random is hidden, and the Rank view uses a built-in order. To have everything locally, serve the folder:

```bash
git clone git@github.com:YOUR-GITHUB-USERNAME/wordle-tile-sandbox.git
cd wordle-tile-sandbox
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works.

The answer list updates itself: the `refresh-answers.yml` workflow runs every Monday, fetches answers through the last date whose puzzle is over in every time zone, runs the tests, and commits any new answers to main. To update it sooner, run it from the repository's Actions tab. The date of the latest answer is shown under the letter ranking in **More analysis**. `node scripts/analyze-answers.mjs` prints the letter ranking and vowel tables from the current list.

### Repository structure

```text
wordle-tile-sandbox/
├── index.html
├── LICENSE
├── README.md
├── package.json, playwright.config.js     development tests only
├── .github/workflows/
│   ├── browser-tests.yml      runs the tests on pull requests and pushes to main
│   └── refresh-answers.yml    weekly answer-list refresh
├── tests/
│   ├── sandbox.spec.js        Playwright browser tests
│   ├── server.cjs             static server the tests start
│   └── fixtures/              synthetic screenshots and their generator
├── scripts/
│   ├── refresh-answers.mjs    adds newly used answers to words/answers.csv
│   └── analyze-answers.mjs    prints the letter ranking and vowel tables
└── words/
    ├── 5.txt
    ├── answers.csv, answers-sources.json, nyt-archive.csv, original-answers.txt
    ├── README.md
    └── SCOWL-Copyright.txt
```

### Browser regression tests

Development tests use
Node.js 22+ and Playwright Chromium:

```bash
npm ci
npx playwright install chromium
npm test
```

The test runner starts its own small static server on port 4173. On Linux,
`npx playwright install --with-deps chromium` also installs browser system
dependencies. For an existing Chromium installation, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

`npm run test:ui` opens the interactive runner; `npm run test:report` opens the
last HTML report. Failed tests retain a trace and screenshot. GitHub Actions
runs the suite for pull requests and pushes to main, and uploads reports and
failure artifacts for 14 days.

Coverage includes clue entry, duplicate yellow counts with the + / − stepper, old 6/7-letter links, arrangements, held-arrangement word lists
and pins, the list/grid order switch, contradictory clues, daily persistence,
share links, dictionary modes, gray letters and gray duplicates capping a count,
the numbered steps folding and unfolding, the first-time tips, choosing a board slot, the × on a tried letter, the board's
‹ › arrangement cycling, holding a letter to mark it gray,
letter taps, board tile drags and holds, the Rank view, real dictionary lookup, PNG import, guess stepping, cancel/retry,
Random puzzles (Wordle scoring with duplicates, and each puzzle checked against the real answer list and the arrangement range),
manual edits after import, and More analysis: opening and closing it, the vowel
odds' filtering and probability functions on a small hand-checked list, and the
panel, Vowels only / All clues, the vowel table and the letter ranking against
the real answer list, with the expected numbers computed independently in the
test. Clipboard writes
are captured at the browser API boundary; dictionary filtering uses a tiny
controlled word list while a separate test loads the real bundled dictionary.
The checked-in PNGs are synthetic, contain no personal data, and exercise real
image decoding, tile detection and OCR. See `tests/fixtures/generate.py` for
optional regeneration (Pillow and Liberation Sans Bold required only then).

This is a focused desktop Chromium suite, not exhaustive browser, touch-device,
accessibility, or OCR coverage.

## Bugs and requests

Found a bug or have an idea? [Open an issue](https://github.com/Tartuffo/wordle-tile-sandbox/issues) (a free GitHub account is needed); the app links there too, at the bottom of the page.

## License

This project is licensed under the [MIT License](LICENSE).

## Disclaimer

This is an independent fan-made helper tool. It is not affiliated with Wordle, The New York Times, Hasbro, or Scrabble.
