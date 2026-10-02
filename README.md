# Wordle Tile Sandbox

A simple visual sandbox for experimenting with possible Wordle solutions.

I built this because I used to work through Wordle possibilities on paper, and sometimes with actual Scrabble tiles. That worked, but it was a little clumsy: I wanted an easy WYSIWYG tool where I could drag letters around, keep green tiles fixed, and see possible arrangements without constantly rewriting them.

Developed with assistance from ChatGPT and Claude Code.

## What it does

Wordle Tile Sandbox lets you enter what you know from a Wordle puzzle, slot by slot, and shows every way the yellow tiles can still be arranged:

- **Import a screenshot** of your Wordle game (or paste one): the grid and letters are read in the browser, you check them, and the green, yellow and gray rows fill in, including double letters. A solved row is left out. After importing, ‹ and › step back and forward through the guesses, so one screenshot gives you the clues as they stood after each guess.
- **Green row**: type a letter into each slot you know; it fills and moves on, like Wordle itself. Space skips a slot, and pasting a pattern such as `..A.E` fills the row.
- **Yellow row**: under each slot, type the letters that turned yellow there. The yellow tiles are derived from these, so each letter is entered once.
- **Gray row**: letters that are not in the word. They sharpen the word check below.
- **Double letters**: a yellow letter counts as one tile, or as already placed if it is green elsewhere. Tap its tile to change the count.
- **Every legal arrangement**, sorted and grouped by where the most constrained letter sits. Tap one to put it on the board.
- **Where each yellow can go**: a letter-by-slot grid counting the arrangements that put each letter in each slot, with forced placements called out and a legend for the cell styles. An "unknown" row covers the letter that isn't one of your yellows. Tap a number to pin that letter there and narrow the list.
- **Word check**: arrangements that no English word fits are dimmed and struck through by default; a Dim / Hide / Off switch can instead hide them or show them normally. Unknown slots may hold any letter that is not gray and was not yellow in that slot. The word lists are in [`words/`](words/README.md).
- **Letters left**: above the board, the letters that aren't gray, as vowels and consonants (default) or a keyboard, so you needn't switch back to the game to check them. Tap one to try it in the first blank board slot that allows it; hold a tried letter to remove it, or drag it. Once every slot is filled, the board says whether the word is in the word list.
- **Drag tiles on the board** to try arrangements by hand; a tile in a slot where it was yellow is flagged.
- **Copy link** shares the current clues. Clues are saved in the browser for the rest of the day, then cleared for the next puzzle.

Words of 5 to 7 letters are supported. The tool is intentionally visual. It uses a dictionary only to flag arrangements no word fits, never to suggest words; it helps you reason about the puzzle by moving tiles around.

## Run it

Use Wordle Tile Sandbox here:

https://tartuffo.github.io/wordle-tile-sandbox/

You can also open `index.html` directly in any modern browser.

No installation, build step, server, or dependencies are required. Opened directly as a file, everything works except the word check, since browsers don't let a local file load the word lists.

## Repository structure

```text
wordle-tile-sandbox/
├── index.html
├── LICENSE
├── README.md
└── words/
    ├── 5.txt, 6.txt, 7.txt
    ├── README.md
    └── SCOWL-Copyright.txt
```

## Development

This is a single-file static web app. To modify it, edit `index.html` directly and reload the browser.

Suggested local workflow:

```bash
git clone git@github.com:YOUR-GITHUB-USERNAME/wordle-tile-sandbox.git
cd wordle-tile-sandbox
open index.html
```

On Windows, double-click `index.html` or open it from your browser.

## License

This project is licensed under the [MIT License](LICENSE).

## Disclaimer

This is an independent fan-made helper tool. It is not affiliated with Wordle, The New York Times, Hasbro, or Scrabble.
