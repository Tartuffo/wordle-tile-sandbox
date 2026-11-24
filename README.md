# Wordle Tile Sandbox

A simple visual sandbox for experimenting with possible Wordle solutions.

**Use it here: https://tartuffo.github.io/wordle-tile-sandbox/** It runs in your browser; there is nothing to install. Page views, and a few milestones such as a first clue entered or a first tile moved, are counted anonymously with [GoatCounter](https://www.goatcounter.com/) (no cookies, nothing personal stored).

I built this because I used to work through Wordle possibilities on paper, and sometimes with actual Scrabble tiles. That worked, but it was a little clumsy: I wanted an easy WYSIWYG tool where I could drag letters around, keep green tiles fixed, and see possible arrangements without constantly rewriting them.

Developed with assistance from ChatGPT and Claude Code.

## What it does

Wordle Tile Sandbox takes the guesses you have played in a Wordle puzzle, with their colors, and shows every way the yellow tiles can still be arranged. Two reference tables from Wordle's answer list, closed until you ask for them, sit at the bottom.

On opening, the page is one card, **Enter your clues**, offering four ways in: **Paste screenshot**, **Choose image**, **Type clues** and **Practice puzzle**. Once the clues are in, the card becomes **Your clues**, a summary of them in three lines (**Guesses**, the words you played; **In**, a stack with a column per slot, each showing its green letter or else the letters that were yellow there; **Out**, the letters not in the word, in alphabetical order), and the rest appears below it: one panel, **Try letters on the board**, with the board and the letters at the top and every legal arrangement under them, then the reference tables. With no yellow letter to arrange, the arrangements part says so. A shared link, or reopening the app the same day, goes straight to the summary. **Edit clues** in the summary opens the guesses you typed again, and **Start over** clears everything and returns to the four ways in, where **Undo** puts it all back (clues, the guess shown, pins and the letters tried on the board) until other clues are used or the page is left. On a first visit, three short tips appear one at a time, the first saying what the tool is for (and pointing a newcomer to Practice puzzle) and the rest under the thing each explains; **?** on the clues card can show them again.

- **Paste or import a screenshot** of your Wordle game. **Paste screenshot** reads it from the clipboard, so it never has to be saved to Photos (on iPhone: take the screenshot, tap its thumbnail, tap Done, then Copy and Delete); **Choose image** picks a saved one, and Ctrl/⌘+V works on a computer. Either way the grid and letters are read in the browser and go straight to the summary, with double letters counted. If the reader was unsure of a letter, the guesses open in the editor instead, with that letter outlined in red and a line saying how many to check; guesses used from there count as typed. A solved row is left out, and the summary says so. If there is no image to paste, or no grid in it, the card says so and stays as it was. In the summary, tap a guess word to see the clues as they stood after that guess; the later guesses go faint and a line says which is shown.
- **Practice puzzle** makes up a puzzle to practice on: a past Wordle answer as the solution, which stays hidden, and a first guess drawn from the 400 answers with five different letters most common in answers. If that guess turns up fewer than two letters (green, or yellow tiles), a second guess that fits its clues is added, as in hard mode. It is drawn again until 3 to 40 arrangements fit a word, with a few, some (7 to 15) or many (16 or more) equally likely; the guess words step through its guesses as with any others. It goes straight to the summary, where a line says it is a practice puzzle and **New puzzle**, in place of Edit clues, draws another.
- **Type clues** opens rows of tiles like Wordle's in the card. Type each guess you played; a full row opens the next, up to six. Then tap a letter to give it the color Wordle did: once for yellow, twice for green, a third time for gray again. To fix one letter, hold it (or right-click it): it is cleared, the rest of the guess keeps its letters and colors, and the next letter typed goes there in the color the slot had. Backspace takes back the letter before the marked tile, and **×** empties a guess so it can be retyped in the same place (on an empty row, it removes the row). Nothing else shows while the editor is open: **Use these clues**, enabled once every started guess is finished and none contradicts another, goes to the summary, and **Cancel** leaves the clues as they were, as does the phone's Back gesture or the browser's Back button. Contradictions are said under the rows: a slot green for two letters, a letter green in a slot in one guess but not in another, or one guess showing more copies of a letter than another allows.
- **Edit clues** opens the same editor on the guesses you typed, to change a color, fix a guess or add the next one. A practice puzzle has **New puzzle** in its place. Clues read straight from a screenshot, and clues from a link that carries no guesses, can only be started over; after another guess in Wordle, start over and paste the newer screenshot.
- **Double letters** come from the guesses: two yellow copies of a letter in one guess are two tiles, and a gray copy beside a green or yellow one caps the count, so the word has no more of that letter.
- **The board** shows one arrangement of your tiles, with green letters fixed. Tap an empty slot, then a letter on the keyboard below, to try it there; without choosing a slot, the letter goes in the first blank slot that allows it. A tried letter has an × to remove it (on a touch screen, holding it works too). Above the board, ‹ Arrangement 3 of 12 › says which of the listed arrangements it shows, and the arrows cycle through them in the list's order. Choosing another arrangement, with the arrows or from the list, clears the letters tried on the board, since they were picked to fit around the old one's tiles; dragging a tile keeps them. Over each open slot, in yellow, are the letters that were yellow there: in the word, but not in that slot. Under the board a line says why it isn't one of the listed arrangements, or that the blanks are still to fill. Once every slot is filled, it says whether the word is in the word list and whether it has been a Wordle answer: the date it was used, or the number of times and the last date if NYT has reused it.
- **Available letters**: under the board, the letters that aren't gray, so you needn't switch back to the game to check them. Show them as **Keyboard** (the default), **V/C** (vowels, then consonants) or **Rank**: by share of the answers that fit all your clues (green letters in place, yellow letters present but not where they were yellow, gray letters absent, duplicate counts), most common first, so known letters lead and gray ones trail, with a line saying how many answers that is. When no answer fits, or before the answer list loads, Rank falls back to the order over all answers and says so.
- **Drag tiles on the board** to try arrangements by hand; the list outlines the arrangement now on the board, and a tile in a slot where it was yellow is flagged.
- **Every legal arrangement**, sorted and grouped by where the most constrained letter sits. Tap one to put it on the board; tap a group heading to pin its letter there.
- **Matching words**: hold an arrangement (or right-click it) to list the dictionary words with its known letters in place. Words your clues rule out (a gray letter, or a letter in a slot where it was yellow) are struck through and listed last, and past Wordle answers are bold. Since this can give the answer away, it asks first, once per browser tab.
- **Where each letter can go**: a letter-by-slot grid counting the arrangements that put each letter in each slot, with forced placements called out and a legend for the cell styles. An "Unknown" row counts the slots shown as · in the list; an unknown slot may hold another copy of a known letter. Tap a number to pin that letter there and narrow the list. Tap a yellow letter at the left of the grid to sort the list by where that letter goes (pins still apply); tap it again to go back.
- **List or grid first**: the list comes first; **Put grid first**, at the bottom of the panel under both, swaps them, and the order is remembered.
- **Word check**: arrangements that no word in the word list fits, given your gray and yellow clues, are left out by default; a Dim / Hide / Show switch can instead show them dimmed and struck through, or show them normally. The choice is remembered. Unknown slots may hold any letter that is not gray and was not yellow in that slot. The word list is in [`words/`](words/README.md).
- **Reference tables**: closed by default; the choice is remembered. Neither table changes with your clues, and both count answer words, not letters, ignoring position.
  - **Letters in Wordle answers**: the share of answers containing each letter, with percentages, noting the date of the latest answer in the list. It is the order Rank starts from.
  - A collapsed table, **every case of one yellow and one gray vowel**: the two likeliest other vowels and the chance of none, with the case your clues match outlined.
- **Help**: each panel has a **?** that explains it, and the first visit gets three short tips. Instructions say "click" on a device with a mouse or trackpad and "tap" on a touch screen.
- **Light and dark themes**: follows your device's light or dark setting; the sun/moon switch by the title overrides it, and that choice is remembered in the browser.
- **Copy link**, the link icon at the top right of the clues, shares the current clues. Your clues are also saved in the browser and come back if you reopen the app the same day. The guesses behind them are saved and shared along with them, with which one is shown.

The tool is intentionally visual: it helps you reason about the puzzle by moving tiles around on the board. It uses a word list to flag arrangements no word fits, and the answer list for letter and vowel odds and to say when a word on the board was an answer. Matching words stay hidden unless you hold an arrangement and choose Show words.

## Letters in Wordle answers

[Etaoin shrdlu](https://en.wikipedia.org/wiki/Etaoin_shrdlu) is an old mnemonic for the twelve most common letters in English, E T A O I N S H R D L U, taken from the order of the keys on Linotype typesetting machines. It ranks letters by how often they occur in running English text, which is a poor guide for Wordle: the answers are a few thousand five-letter words, and what matters is whether a letter is in the answer at all, not how often it turns up in prose. Ranked instead by the share of Wordle answers that contain each letter (each word counted once, so double letters don't inflate a count), the order is:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Answers | E | A | R | O | T | I | L | S | N | U | C | Y |
| % of answers | 45 | 39 | 36 | 29 | 29 | 28 | 28 | 27 | 24 | 20 | 19 | 18 |
| Etaoin shrdlu | E | T | A | O | I | N | S | H | R | D | L | U |

So the top twelve are **EAROTI LSNUCY**: R and L rise, H and D drop out, Y comes in. O, T, I and L are within 1.4 points of each other, so their order among themselves is close to a tie. The list is the union of the original Wordle answers and every answer NYT has used (see [`words/README.md`](words/README.md)); the table is from October 2026. The list is refreshed weekly, and [`words/answers-sources.json`](words/answers-sources.json) has its current word count and last date. The app computes the ranking from the current list, under **Reference tables**, and the Rank view of the keyboard re-ranks the letters over the answers that fit your clues.

## Development

This is a single-file static web app with no build step or dependencies. To modify it, edit `index.html` directly and reload the browser.

Opened directly as a file, the app works except for what needs the files in `words/`, since browsers don't let a local file load them: the word check, matching words and the reference tables are off, Practice puzzle is hidden, and the Rank view uses a built-in order. To have everything locally, serve the folder:

```bash
git clone git@github.com:YOUR-GITHUB-USERNAME/wordle-tile-sandbox.git
cd wordle-tile-sandbox
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works.

Adding `?dev=1` to the URL turns on a **Dev** panel at the bottom of the page, remembered for that browser and site until Off or `?dev=0`. It shows the page again in a phone-sized frame at the right, kept in step with the clues, at a choice of phone widths; forces Click or Tap wording in the instructions, shows the first-time tips and the matching-words question again, forgets the remembered choices, and shows the current clue link and the word lists' status. The panel is for working on the app; it isn't mentioned in the app itself.

To check the phone layout in a desktop browser, add `?view=mobile` to the address: the page narrows to an iPhone 14's 390 px and uses touch wording ("tap"). `?view=mobile-414` sets another width, and `?view=desktop` forces the full width and mouse wording. A note under the title says which preview is on, and the setting survives opening a shared link. In the phone preview, when the window has room, a ruler beside the column shows the screen heights of common phones from the iPhone SE to the 15 Pro Max, with a dashed fold line across the column for the one nearest the preview's width; click a phone's label to move the line, and drag the ruler's handle to put the screens' top anywhere down the page (double-click it to return to the top).

The answer list updates itself: the `refresh-answers.yml` workflow runs every Monday, fetches answers through the last date whose puzzle is over in every time zone, runs the tests, and commits any new answers to main. To update it sooner, run it from the repository's Actions tab. The date of the latest answer is shown under the letter table in **Reference tables**. `node scripts/analyze-answers.mjs` prints the letter ranking and vowel tables from the current list.

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

Coverage includes the guess editor (typing, coloring, Backspace and ×, clearing one letter by holding it, contradictions, double letters), old 6/7-letter links, arrangements, held-arrangement word lists
and pins, the list/grid order switch, contradictory clues, daily persistence,
share links, dictionary modes, gray letters and gray duplicates capping a count,
the clues card's ways in, form and summary, the panels that wait for the clues, the first-time tips, choosing a board slot, the × on a tried letter, the board's
‹ › arrangement cycling,
letter taps, board tile drags and holds, the Rank view, real dictionary lookup, PNG import straight to the summary, a doubtful read opening the editor, showing the clues after an earlier guess, Start over and Undo, Back out of the editor, cancel/retry,
practice puzzles (Wordle scoring with duplicates, and each puzzle checked against the real answer list and the arrangement range),
editing guesses after import, the Rank view's clue-aware order against the real answer list
with the expected numbers computed independently, and Reference tables: opening and
closing them, the vowel-odds functions on a small hand-checked list, and the letter
table and the vowel table against the real answer list. Clipboard writes
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
