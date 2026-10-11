#!/usr/bin/env node
// Letter and vowel statistics over words/answers.csv, printed as Markdown.
//   node scripts/analyze-answers.mjs [--source all|original|nyt]   (original and nyt include 'both')
// Counts words, not occurrences: a letter is "in" a word however many times it appears.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'words', 'answers.csv');
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ETAOIN = 'ETAOINSHRDLUCMFWYPVBGKJQXZ';  // the Linotype keyboard order
const VOWELS = 'AEIOUY';

const sourceArg = process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : 'all';
const rows = readFileSync(CSV, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const words = rows.filter(([, s]) => sourceArg === 'all' || s === 'both' || s === { original: 'original', nyt: 'nyt-used' }[sourceArg])
  .map(([w]) => w);

// yellow: letters the word must contain; gray: letters it must not.
const filter = (list, yellow, gray) =>
  list.filter(w => [...yellow].every(l => w.includes(l)) && ![...gray].some(l => w.includes(l)));

// P(letter present) for each unknown vowel, plus P(none of the unknown vowels present).
function vowelOdds(list, yellow, gray) {
  const left = filter(list, yellow, gray);
  const unknown = [...VOWELS].filter(v => !yellow.includes(v) && !gray.includes(v));
  const p = l => left.filter(w => w.includes(l)).length / left.length;
  const none = left.filter(w => !unknown.some(v => w.includes(v))).length / left.length;
  return { n: left.length, odds: unknown.map(v => [v, p(v)]).sort((a, b) => b[1] - a[1]), none };
}

const pct = x => `${(100 * x).toFixed(0)}%`;
const pct1 = x => `${(100 * x).toFixed(1)}%`;

console.log(`# Answer-list letter analysis\n\n${words.length} words (source: ${sourceArg}).\n`);

// ── 1. Letter ranking ─────────────────────────────────────────────────────────
const freq = [...ALPHA].map(l => [l, words.filter(w => w.includes(l)).length / words.length])
  .sort((a, b) => b[1] - a[1]);
const rank = Object.fromEntries(freq.map(([l], i) => [l, i + 1]));
console.log('## Letter ranking (share of words containing the letter)\n');
console.log('| # | Letter | Words | etaoin # | Δ | etaoin order |\n|---|---|---|---|---|---|');
freq.forEach(([l, f], i) => {
  const e = ETAOIN.indexOf(l) + 1;
  console.log(`| ${i + 1} | ${l} | ${pct1(f)} | ${e} | ${e - (i + 1) > 0 ? '+' : ''}${e - (i + 1)} | ${ETAOIN[i]} (${pct1(words.filter(w => w.includes(ETAOIN[i])).length / words.length)}) |`);
});
const top = freq.map(([l]) => l).join('');
console.log(`\nTop 12: **${top.slice(0, 6)} ${top.slice(6, 12)}** (vs ETAOIN SHRDLU); full: ${top}\n`);

// ── 2. Vowels ─────────────────────────────────────────────────────────────────
console.log('## Vowels with nothing known\n');
const base = vowelOdds(words, '', '');
console.log(base.odds.map(([v, p]) => `${v} ${pct(p)}`).join(', ') + `; no vowel at all: ${pct1(base.none)}\n`);
const nv = n => words.filter(w => new Set([...w].filter(c => VOWELS.includes(c))).size === n).length;
console.log(`Distinct vowels (AEIOUY) per word: ${[0, 1, 2, 3, 4].map(n => `${n}: ${pct1(nv(n) / words.length)}`).join(', ')}\n`);

console.log('## One yellow vowel, no grays\n');
console.log('| Yellow | Words | Next vowels | No other vowel |\n|---|---|---|---|');
for (const y of VOWELS) {
  const r = vowelOdds(words, y, '');
  console.log(`| ${y} | ${r.n} | ${r.odds.map(([v, p]) => `${v} ${pct(p)}`).join(', ')} | ${pct(r.none)} |`);
}

console.log('\n## Table: yellow (columns) × gray (rows): top two vowels, then no other vowel\n');
console.log(`| gray ↓ / yellow → | ${[...VOWELS].join(' | ')} |\n|---|${'---|'.repeat(6)}`);
for (const g of VOWELS) {
  const cells = [...VOWELS].map(y => {
    if (y === g) return '—';
    const r = vowelOdds(words, y, g);
    return `${r.odds.slice(0, 2).map(([v, p]) => `${v} ${pct(p)}`).join(' ')} · none ${pct(r.none)} (n=${r.n})`;
  });
  console.log(`| **${g}** | ${cells.join(' | ')} |`);
}

console.log('\n## Where U beats O or I (one yellow, up to two grays)\n');
const out = [];
for (const y of VOWELS) {
  const others = [...VOWELS].filter(v => v !== y);
  const grays = [''];
  others.forEach((a, i) => { grays.push(a); others.slice(i + 1).forEach(b => grays.push(a + b)); });
  for (const g of grays) {
    if (g.includes('U')) continue;
    const r = vowelOdds(words, y, g);
    const p = Object.fromEntries(r.odds);
    const beats = ['O', 'I'].filter(v => v in p && p.U > p[v]);
    if (beats.length) out.push(`| ${y} | ${g || '—'} | ${r.n} | ${r.odds.map(([v, q]) => `${v} ${pct(q)}`).join(', ')} | ${beats.join(', ')} |`);
  }
}
console.log('| Yellow | Gray | Words | Odds | U beats |\n|---|---|---|---|---|\n' + out.join('\n'));
