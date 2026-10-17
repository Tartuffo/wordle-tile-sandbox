#!/usr/bin/env node
// Rebuilds words/answers.csv: the union of Josh Wardle's original Wordle answer list and
// every answer NYT has published, each word flagged original / nyt-used / both.
//
//   node scripts/refresh-answers.mjs                     fetch new NYT dates through yesterday
//   node scripts/refresh-answers.mjs --through 2026-10-11  ... through a given date (never after today)
//   node scripts/refresh-answers.mjs --offline           rebuild answers.csv from the cached files only
//
// The NYT answers are cached per date in words/nyt-archive.csv, so a refresh fetches only
// dates it hasn't seen. Yesterday is the default end: today's puzzle may not be over in
// your time zone, and its answer in the list would leak into the vowel odds.
// Requires Node 18+ (global fetch).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WORDS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'words');
const ORIGINAL_TXT = path.join(WORDS, 'original-answers.txt');
const ARCHIVE_CSV = path.join(WORDS, 'nyt-archive.csv');
const ANSWERS_CSV = path.join(WORDS, 'answers.csv');
const SOURCES_JSON = path.join(WORDS, 'answers-sources.json');

// Wardle's last build before the game moved to nytimes.com; the answers are its array La.
const ORIGINAL_JS = 'https://www.powerlanguage.co.uk/wordle/main.e65ce0a5.js';
const WAYBACK_SNAPSHOT = '20220203122419';
const NYT_ENDPOINT = 'https://www.nytimes.com/svc/wordle/v2/{date}.json';
const NYT_FIRST_DATE = '2021-06-19';  // puzzle 0, CIGAR
const CONCURRENCY = 4;

const iso = d => d.toISOString().slice(0, 10);
const localToday = () => {
  const d = new Date();
  return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
};
const addDays = (date, n) => iso(new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000));

function parseArgs(argv) {
  const args = { offline: false, through: addDays(localToday(), -1) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--offline') args.offline = true;
    else if (argv[i] === '--through') args.through = argv[++i];
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.through)) throw new Error('--through takes YYYY-MM-DD');
  if (args.through > localToday()) throw new Error(`Refusing to fetch after today (${localToday()}): no spoilers`);
  return args;
}

async function fetchRetry(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return r;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000 * 2 ** (i - 1)));
    }
  }
}

function readSources() {
  return existsSync(SOURCES_JSON) ? JSON.parse(readFileSync(SOURCES_JSON, 'utf8')) : {};
}

// ── Original list ─────────────────────────────────────────────────────────────

async function ensureOriginal(sources) {
  if (existsSync(ORIGINAL_TXT)) return readFileSync(ORIGINAL_TXT, 'utf8').trim().split('\n');
  const url = `https://web.archive.org/web/${WAYBACK_SNAPSHOT}id_/${ORIGINAL_JS}`;
  const js = await (await fetchRetry(url)).text();
  const m = js.match(/\bLa=\[((?:"[a-z]{5}",?)+)\]/);
  if (!m) throw new Error('Answer array La not found in the original JS');
  const words = m[1].match(/[a-z]{5}/g).map(w => w.toUpperCase());
  writeFileSync(ORIGINAL_TXT, words.join('\n') + '\n');
  sources.original = {
    description: "Josh Wardle's original answer list, in play order (puzzle 0 = CIGAR): the array La in the game's JS",
    url: ORIGINAL_JS,
    retrievedFrom: url,
    sha256: createHash('sha256').update(js).digest('hex'),
    fetched: localToday(),
    count: words.length,
  };
  return words;
}

// ── NYT archive ───────────────────────────────────────────────────────────────

function readArchive() {
  if (!existsSync(ARCHIVE_CSV)) return new Map();
  const rows = readFileSync(ARCHIVE_CSV, 'utf8').trim().split('\n').slice(1);
  return new Map(rows.map(line => {
    const [date, id, solution, fetched] = line.split(',');
    return [date, { date, id: Number(id), solution, fetched }];
  }));
}

function writeArchive(archive) {
  const rows = [...archive.values()].sort((a, b) => a.date.localeCompare(b.date))
    .map(r => [r.date, r.id, r.solution, r.fetched].join(','));
  writeFileSync(ARCHIVE_CSV, ['date,nyt_id,solution,fetched', ...rows].join('\n') + '\n');
}

async function fetchNYT(archive, through) {
  const missing = [];
  for (let d = NYT_FIRST_DATE; d <= through; d = addDays(d, 1)) if (!archive.has(d)) missing.push(d);
  if (!missing.length) return 0;
  console.error(`Fetching ${missing.length} NYT dates (${missing[0]} … ${missing.at(-1)})`);
  const fetched = localToday();
  let next = 0, done = 0;
  const worker = async () => {
    while (next < missing.length) {
      const date = missing[next++];
      const r = await fetchRetry(NYT_ENDPOINT.replace('{date}', date));
      if (r.status === 404) throw new Error(`NYT has no puzzle for ${date}`);
      const j = await r.json();
      if (j.print_date !== date || !/^[a-z]{5}$/.test(j.solution)) throw new Error(`Unexpected reply for ${date}`);
      archive.set(date, { date, id: j.id, solution: j.solution.toUpperCase(), fetched });
      if (++done % 200 === 0) console.error(`  ${done}/${missing.length}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    writeArchive(archive);  // keep what arrived, so a failed run resumes where it stopped
  }
  return missing.length;
}

// ── Union ─────────────────────────────────────────────────────────────────────

function buildAnswers(original, archive) {
  const origSet = new Set(original);
  const nyt = new Map();  // word -> { first, last, uses }
  for (const r of [...archive.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const e = nyt.get(r.solution);
    if (e) { e.last = r.date; e.uses++; } else nyt.set(r.solution, { first: r.date, last: r.date, uses: 1 });
  }
  const words = [...new Set([...origSet, ...nyt.keys()])].sort();
  const rows = words.map(w => {
    const source = origSet.has(w) ? (nyt.has(w) ? 'both' : 'original') : 'nyt-used';
    const n = nyt.get(w);
    return [w, source, n?.first || '', n?.last || '', n?.uses || 0].join(',');
  });
  writeFileSync(ANSWERS_CSV, ['word,source,first_used,last_used,nyt_uses', ...rows].join('\n') + '\n');
  const count = s => rows.filter(r => r.split(',')[1] === s).length;
  return { total: words.length, original: count('original'), both: count('both'), nytUsed: count('nyt-used') };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const sources = readSources();
const original = args.offline
  ? readFileSync(ORIGINAL_TXT, 'utf8').trim().split('\n')
  : await ensureOriginal(sources);
const archive = readArchive();
if (!args.offline) {
  const n = await fetchNYT(archive, args.through);
  if (n) sources.nyt = { ...sources.nyt, lastFetched: localToday() };
}
const dates = [...archive.keys()].sort();
sources.nyt = {
  description: "Every answer NYT's per-date endpoint returns, from puzzle 0 (Wardle-era dates included) on; one row per date in nyt-archive.csv, with the date each row was fetched",
  endpoint: NYT_ENDPOINT,
  firstDate: dates[0],
  throughDate: dates.at(-1),
  lastFetched: sources.nyt?.lastFetched,
  dates: dates.length,
  distinctAnswers: new Set([...archive.values()].map(r => r.solution)).size,
};
const counts = buildAnswers(original, archive);
sources.answers = {
  description: 'answers.csv: union of original-answers.txt and nyt-archive.csv; source is original, nyt-used or both; first_used, last_used and nyt_uses come from the NYT archive',
  built: localToday(),
  ...counts,
};
writeFileSync(SOURCES_JSON, JSON.stringify({ original: sources.original, nyt: sources.nyt, answers: sources.answers }, null, 2) + '\n');
console.error(`answers.csv: ${counts.total} words (both ${counts.both}, original only ${counts.original}, nyt-used only ${counts.nytUsed}); NYT through ${sources.nyt.throughDate}`);
