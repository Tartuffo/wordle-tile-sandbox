# Wordle Tile Sandbox

A simple visual sandbox for experimenting with possible Wordle solutions.

I built this because I used to work through Wordle possibilities on paper, and sometimes with actual Scrabble tiles. That worked, but it was a little clumsy: I wanted an easy WYSIWYG tool where I could drag letters around, keep green tiles fixed, and see possible arrangements without constantly rewriting them.

Developed with assistance from ChatGPT and Claude Code.

## What it does

Wordle Tile Sandbox lets you enter what you know from a Wordle puzzle, slot by slot, and shows every way the yellow tiles can still be arranged. Optional analysis, closed until you ask for it, adds vowel odds and a letter ranking drawn from past Wordle answers.

- **Paste or import a screenshot** of your Wordle game. **Paste screenshot** reads it from the clipboard, so it never has to be saved to Photos (on iPhone: take the screenshot, tap its thumbnail, tap Done, then Copy and Delete); **Import file** picks a saved one, and Ctrl/⌘+V works on a computer. Either way the grid and letters are read in the browser, you check them, and the green, yellow and gray rows fill in, including double letters. A solved row is left out. After importing, ‹ and › step back and forward through the guesses, so one screenshot gives you the clues as they stood after each guess.
- **Green row**: type a letter into each slot you know; it fills and moves on, like Wordle itself. Space skips a slot, and pasting a pattern such as `..A.E` fills the row.
- **Yellow row**: under each slot, type the letters that turned yellow there. The yellow tiles are derived from these, so each letter is entered once.
- **Gray row**: letters that are not in the word. They sharpen the word check, and gray vowels feed the vowel odds.
- **Double letters**: a yellow letter counts as one tile, or as already placed if it is green elsewhere. Tap its tile to change the count.
- **Every legal arrangement**, sorted and grouped by where the most constrained letter sits. Tap one to put it on the board.
- **Where each yellow can go**: a letter-by-slot grid counting the arrangements that put each letter in each slot, with forced placements called out and a legend for the cell styles. An "unknown" row covers the letter that isn't one of your yellows. Tap a number to pin that letter there and narrow the list.
- **List or grid first**: the list comes first; **put grid first**, next to the arrangement count, swaps them, and the order is remembered.
- **Word check**: arrangements that no English word fits are dimmed and struck through by default; a Dim / Hide / Off switch can instead hide them or show them normally. Unknown slots may hold any letter that is not gray and was not yellow in that slot. The word lists are in [`words/`](words/README.md).
- **Letters left**: above the board, the letters that aren't gray, as a keyboard (default), as vowels and consonants, or by **Rank** (most common in Wordle answers first, gray letters disabled in place), so you needn't switch back to the game to check them. Tap one to try it in the first blank board slot that allows it; hold a tried letter to remove it, or drag it. Once every slot is filled, the board says whether the word is in the word list.
- **More analysis**: closed by default, since some players would rather not see odds while they solve; the choice is remembered. Inside:
  - **Vowel odds**: how many answers fit, and for each vowel (A E I O U Y) still unknown, the chance it is in the word, plus the chance that no other vowel is, which says when to stop hunting vowels and switch to consonants. Options are sorted by chance and shaded by it.
  - The vowels start from your clues (a green or yellow vowel counts as present). Tap one to cycle it through unknown, yellow and gray; **reset to clues** undoes your taps.
  - **Use: Vowels only / All clues**: by default only vowel clues count. All clues also uses your consonants, gray ones out and green or yellow ones in. That is closer to a solver, so it stays off until you choose it; the choice is remembered.
  - Two collapsed reference sections: **every case of one yellow and one gray vowel** (the two likeliest other vowels and the chance of none), and the **letter ranking** with percentages, noting the date of the latest answer in the list.
  - Odds count Wordle answer words, not letters, and ignore position. They cover 5-letter words only.
- **Drag tiles on the board** to try arrangements by hand; a tile in a slot where it was yellow is flagged.
- **Light and dark themes**: light by default, like Wordle; the sun/moon switch by the title changes it, and the choice is remembered in the browser.
- **Copy link** shares the current clues. Clues are saved in the browser for the rest of the day, then cleared for the next puzzle.

Words of 5 to 7 letters are supported. The tool is intentionally visual. It uses a dictionary only to flag arrangements no word fits, and the answer list only for letter and vowel odds, never to suggest words; it helps you reason about the puzzle by moving tiles around.

## Letters in Wordle answers

"Etaoin shrdlu" ranks letters by how often they occur in running English text. Ranked instead by the share of Wordle answers that contain each letter (each word counted once, so double letters don't inflate a count), the order is:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Answers | E | A | R | O | T | I | L | S | N | U | C | Y |
| % of answers | 45 | 39 | 36 | 29 | 29 | 28 | 28 | 27 | 24 | 20 | 19 | 18 |
| Etaoin shrdlu | E | T | A | O | I | N | S | H | R | D | L | U |

So the top twelve are **EAROTI LSNUCY**: R and L rise, H and D drop out, Y comes in. O, T, I and L are within 1.4 points of each other, so their order among themselves is close to a tie. The list is the union of the original Wordle answers and every answer NYT has used (see [`words/README.md`](words/README.md)); the table is from October 2026. The list is refreshed weekly, and [`words/answers-sources.json`](words/answers-sources.json) has its current word count and last date. The app computes the ranking from the current list, under **More analysis**; `node scripts/analyze-answers.mjs` prints it with the vowel tables.

## Run it

Use Wordle Tile Sandbox here:

https://tartuffo.github.io/wordle-tile-sandbox/

You can also open `index.html` directly in any modern browser.

No installation, build step, server, or dependencies are required. Opened directly as a file, everything works except what needs the files in `words/`, since browsers don't let a local file load them: the word check, vowel odds and letter ranking are off, and the Rank view uses a built-in order. To have everything locally, serve the folder (see Development).

## Repository structure

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
    ├── 5.txt, 6.txt, 7.txt
    ├── answers.csv, answers-sources.json, nyt-archive.csv, original-answers.txt
    ├── README.md
    └── SCOWL-Copyright.txt
```

## Development

This is a single-file static web app. To modify it, edit `index.html` directly and reload the browser.

The answer list updates itself: the `refresh-answers.yml` workflow runs every Monday, fetches answers through the last date whose puzzle is over in every time zone, runs the tests, and commits any new answers to main. To update it sooner, run it from the repository's Actions tab. The date of the latest answer is shown under the letter ranking in **More analysis**.

Suggested local workflow:

```bash
git clone git@github.com:YOUR-GITHUB-USERNAME/wordle-tile-sandbox.git
cd wordle-tile-sandbox
python3 -m http.server 8000
```

Then open http://localhost:8000. Serving the folder, rather than opening `index.html` as a file, lets the page load the word lists and the answer list. Any static server works.

### Browser regression tests

The app still has no runtime dependencies or build step. Development tests use
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

Coverage includes clue entry, duplicate yellow counts, lengths 5–7, arrangements
and pins, the list/grid order switch, contradictory clues, daily persistence,
share links, dictionary modes, gray letters, letters-left taps/holds/drags, the
Rank view, real dictionary lookup, PNG import, guess stepping, cancel/retry,
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

One test is explicitly marked as an **expected failure**: importing BEEFY's
feedback against BERRY loses the maximum count of one E, so the dictionary
filter can still admit BEERY. It asserts the desired filtering behavior and
does not bless the bug or change the app. If the assertion starts passing,
Playwright fails the run as an unexpected pass; remove the expected-failure
marker when fixing the underlying count handling. Fixture/import setup runs
before that marker so unrelated setup failures still fail CI.

This is a focused desktop Chromium suite, not exhaustive browser, touch-device,
accessibility, or OCR coverage.

## License

This project is licensed under the [MIT License](LICENSE).

## Disclaimer

This is an independent fan-made helper tool. It is not affiliated with Wordle, The New York Times, Hasbro, or Scrabble.
