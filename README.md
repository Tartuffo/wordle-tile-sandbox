# Wordle Tile Sandbox

A simple visual sandbox for experimenting with possible Wordle solutions.

I built this because I used to work through Wordle possibilities on paper, and sometimes with actual Scrabble tiles. That worked, but it was a little clumsy: I wanted an easy WYSIWYG tool where I could drag letters around, keep green tiles fixed, and see possible arrangements without constantly rewriting them.

This project was built interactively with ChatGPT.

## What it does

Wordle Tile Sandbox lets you model the information you know from a Wordle puzzle:

- **Fixed green tiles** for letters you know are correct and in the right position
- **Movable yellow tiles** for letters you know are in the word but not yet placed
- **Inferred unknown tiles** for the remaining unknown positions
- **Ruled-out letters by position** for letters that cannot go in a given slot
- **Legal initial board generation** that respects green tiles and ruled-out positions
- **Shuffle movable tiles** to quickly try other legal arrangements
- **Allow temporary conflicts** when you want to rearrange tiles freely while thinking

The tool is intentionally visual. It does not try to solve Wordle from a dictionary; it helps you reason about the puzzle by moving tiles around.

## Run it

Use Wordle Tile Sandbox here:

https://tartuffo.github.io/wordle-tile-sandbox/

You can also open `index.html` directly in any modern browser.

No installation, build step, server, or dependencies are required.

## Repository structure

```text
wordle-tile-sandbox/
├── index.html
├── LICENSE
└── README.md
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
