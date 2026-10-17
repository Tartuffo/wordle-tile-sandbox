const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const green = (page, slot) => page.getByRole('textbox', { name: `Green letter, slot ${slot}`, exact: true });
const yellow = (page, slot) => page.getByRole('textbox', { name: `Letters that were yellow in slot ${slot}`, exact: true });
const boardSlot = (page, slot) => page.locator(`#board .slot[data-pos="${slot - 1}"]`);
const letter = (page, value) => page.locator('#lettersBody').getByRole('button', { name: value, exact: true });
const arrangements = page => page.locator('#list .arr');
const fixture = name => path.join(__dirname, 'fixtures', name);
const vowelKey = (page, vowel) => page.locator(`#oddsVowels [data-vowel="${vowel}"]`);
const oddsChips = page => page.locator('#oddsOptions .odds-opt');
const openAnalysis = page => page.getByRole('button', { name: 'More analysis', exact: true }).click();

// Expected vowel odds, computed here independently of the app from the real answer list.
const VOWELS = 'AEIOUY';
const answerRows = fs.readFileSync(path.join(__dirname, '..', 'words', 'answers.csv'), 'utf8')
  .trim().split('\n').slice(1).map(line => line.split(','));
const answerWords = answerRows.map(row => row[0]);
const percent = (n, total) => `${Math.round(100 * n / total)}%`;
// yellow and gray are vowels; have and lack are consonants the word must or mustn't contain.
function expectedOdds(yellow, gray, have = '', lack = '') {
  const left = answerWords.filter(w => [...yellow + have].every(l => w.includes(l)) && ![...gray + lack].some(l => w.includes(l)));
  const unknown = [...VOWELS].filter(v => !yellow.includes(v) && !gray.includes(v));
  const options = unknown.map(v => [v, left.filter(w => w.includes(v)).length]);
  options.push([yellow ? 'no other vowel' : 'no vowel', left.filter(w => !unknown.some(v => w.includes(v))).length]);
  options.sort((a, b) => b[1] - a[1]);
  return { count: left.length, chips: options.map(([label, n]) => `${label} ${percent(n, left.length)}`), options };
}

async function open(page, query = '') {
  const loaded = page.waitForResponse(response => response.url().endsWith('/words/5.txt'));
  await page.goto('/' + query);
  await loaded;
}
async function importImage(page, name) {
  await page.locator('#importFile').setInputFiles(fixture(name));
  await expect(page.getByRole('button', { name: 'Use these clues' })).toBeEnabled();
}
async function values(locator) {
  return locator.evaluateAll(inputs => inputs.map(input => input.value));
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-02T12:00:00Z'));
});

test('green typing advances, space skips, yellow arrangements can be pinned and cleared', async ({ page }) => {
  await open(page);
  await green(page, 1).pressSequentially('B ');
  await expect(green(page, 3)).toBeFocused();
  await expect(green(page, 1)).toHaveValue('B');
  await yellow(page, 2).fill('e');
  await expect(arrangements(page)).toHaveCount(3);
  expect((await arrangements(page).allTextContents()).sort()).toEqual(['B···E', 'B··E·', 'B·E··'].sort());
  await page.getByTitle('Pin E to slot 3', { exact: true }).click();
  await expect(arrangements(page)).toHaveCount(1);
  await arrangements(page).click();
  await expect(boardSlot(page, 3)).toHaveText('E');
  await page.getByRole('button', { name: 'clear pins', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('#board .tile')).toHaveCount(0);
  await expect(green(page, 1)).toHaveValue('');
});

test('contradictory green/yellow clues are reported and recover after editing', async ({ page }) => {
  await open(page);
  await green(page, 1).fill('A');
  await yellow(page, 1).fill('A');
  await expect(page.locator('#clueStatus')).toContainText("A can't be both green and yellow in slot 1");
  await yellow(page, 1).fill('');
  await expect(page.locator('#clueStatus')).toHaveText('');
});

test('duplicate yellow counts', async ({ page }) => {
  await open(page);
  await expect(page.locator('#board .slot')).toHaveCount(5);
  await yellow(page, 1).fill('E');
  await yellow(page, 2).fill('E');
  await page.locator('#tileChips button').click();
  await expect(page.locator('#board .tile.yellow')).toHaveCount(2);
  await expect(arrangements(page)).toHaveCount(3);
});

test('links from the 6- and 7-letter versions are ignored; 5-letter ones still open', async ({ page }) => {
  await open(page, '?len=6&green=B%3F%3F%3F%3F%3F&gray=FX');
  await expect(green(page, 1)).toHaveValue('');
  await expect(page.locator('#grayInput')).toHaveValue('');
  expect(new URL(page.url()).search).toBe('');
  await page.goto('/?green=B%3F%3F%3F%3F&gray=FX');
  await expect(green(page, 1)).toHaveValue('B');
  await expect(page.locator('#grayInput')).toHaveValue('FX');
});

test('same-day clues survive reload, copy link round-trips, yesterday expires', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async text => { window.copiedLink = text; },
    } });
  });
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&ban2=E&yellow=EE&gray=FX');
  await page.reload();
  await expect(green(page, 1)).toHaveValue('B');
  await expect(page.locator('#grayInput')).toHaveValue('FX');
  await expect(page.locator('#board .tile.yellow')).toHaveCount(2);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied!', exact: true })).toBeVisible();
  const shared = await page.evaluate(() => window.copiedLink);
  const fresh = await context.browser().newContext();
  const recipient = await fresh.newPage();
  await recipient.goto(shared);
  await expect(green(recipient, 1)).toHaveValue('B');
  await expect(yellow(recipient, 2)).toHaveValue('E');
  await expect(yellow(recipient, 3)).toHaveValue('E');
  await expect(recipient.locator('#grayInput')).toHaveValue('FX');
  await expect(recipient.locator('#board .tile.yellow')).toHaveCount(2);
  await fresh.close();
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
  await page.reload();
  await expect(green(page, 1)).toHaveValue('');
  await expect(page.locator('#grayInput')).toHaveValue('');
  await expect(page.locator('#board .tile')).toHaveCount(0);
});

test('gray letters and Dim / Hide / Off use deterministic dictionary results', async ({ page }) => {
  // Isolate filtering from changes to the full dictionary. The normal smoke test below uses it.
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'APPLE\nAMPLE\n', contentType: 'text/plain' }));
  await open(page);
  await yellow(page, 1).fill('P');
  await expect(arrangements(page)).toHaveCount(4);
  await expect(page.locator('#list .arr.noword')).toHaveCount(2);
  await page.locator('#wordNote').getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(2);
  await page.locator('#wordNote').getByRole('button', { name: 'Off', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(4);
  await expect(page.locator('#list .arr.noword')).toHaveCount(0);
  await page.locator('#wordNote').getByRole('button', { name: 'Dim', exact: true }).click();
  await page.locator('#grayInput').fill('AM');
  await expect(page.locator('#list .arr.noword')).toHaveCount(4);
  await page.locator('#lettersSeg [data-view="vc"]').click();
  await expect(letter(page, 'A')).toHaveCount(0);
  await page.locator('#lettersSeg [data-view="keyboard"]').click();
  await expect(letter(page, 'A')).toBeDisabled();
  await expect(letter(page, 'P')).toBeEnabled();
});

test('letters-left taps fill legal blanks; quick tap keeps a trial, hold removes it', async ({ page }) => {
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await letter(page, 'E').click();
  await expect(boardSlot(page, 2).locator('.trial')).toHaveCount(0);
  await expect(page.locator('#board .trial')).toHaveCount(1);
  await page.locator('#board .trial').click();
  await expect(page.locator('#board .trial')).toHaveCount(1);
  const trial = page.locator('#board .trial');
  await trial.hover();
  await page.mouse.down();
  await expect(page.locator('#board .trial')).toHaveCount(0);
  await page.mouse.up();
  await expect(boardSlot(page, 1).locator('.green')).toHaveText('B');
});

test('trial drag swaps letters, preserves fixed greens and flags banned destinations', async ({ page }) => {
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await letter(page, 'A').click();
  await expect(boardSlot(page, 2)).toHaveText('A');
  await letter(page, 'O').click();
  const destination = await page.locator('#board .slot').filter({ has: page.locator('.trial', { hasText: 'O' }) }).getAttribute('data-pos');
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, Number(destination) + 1));
  await expect(boardSlot(page, 2)).toHaveText('O');
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, 1));
  await expect(boardSlot(page, 1)).toHaveText('B');
  await expect(boardSlot(page, 2)).toHaveText('O');
  await page.locator('#board .yellow').dragTo(boardSlot(page, 2));
  await expect(boardSlot(page, 2).locator('.conflict')).toHaveText('E');
  await expect(page.locator('#boardStatus')).toContainText("E can't go in slot 2");
});

test('full board checks the real word list; changing arrangement clears displaced trials', async ({ page }) => {
  await open(page);
  for (const value of 'APPLE') await letter(page, value).click();
  await expect(page.locator('#boardWord')).toHaveText(/^APPLE ✓ is in the word list/);
  await letter(page, 'Z').click();
  await expect(page.locator('#board .trial')).toHaveCount(5);
  await yellow(page, 1).fill('Z');
  await expect(page.locator('#board .yellow')).toHaveText('Z');
  await expect(page.locator('#board .trial')).toHaveCount(4);
});

test('a full board says when the word was last a Wordle answer', async ({ page }) => {
  // Expected from answers.csv: word,source,first_used,last_used,nyt_uses.
  const row = word => answerRows.find(r => r[0] === word);
  const date = iso => new Date(iso + 'T00:00:00Z')
    .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const [once, twice, never] = ['APPLE', 'CIGAR', 'GAFFE'].map(row);
  expect([once[4], twice[4], never[4]]).toEqual(['1', '2', '0']);
  const note = page.locator('#boardWord .answer-date');
  const type = async word => {
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    for (const value of word) await letter(page, value).click();
  };

  await open(page);
  await type('APPLE');
  await expect(note).toHaveText(`Wordle answer on ${date(once[3])}.`);
  await type('CIGAR');
  await expect(page.locator('#boardWord')).toHaveText(`CIGAR ✓ is in the word list Wordle answer 2 times, last on ${date(twice[3])}.`);
  await type('GAFFE');
  await expect(note).toHaveText('Not a past Wordle answer.');
});

test('PNG import reads colors/letters, omits solved row, steps guesses and ends on manual edit', async ({ page }) => {
  await open(page);
  await importImage(page, 'guesses.png');
  expect(await values(page.locator('#importRows input'))).toEqual([...'CRANEBEEFY']);
  await expect(page.locator('#importRows .green')).toHaveCount(3);
  await expect(page.locator('#importRows .yellow')).toHaveCount(2);
  await expect(page.locator('#importNote')).toContainText('The solved row was left out');
  await page.getByRole('button', { name: 'Use these clues' }).click();
  await expect(page.locator('#guessStep')).toHaveText('2/2');
  await expect(green(page, 1)).toHaveValue('B');
  await expect(green(page, 2)).toHaveValue('E');
  await expect(green(page, 5)).toHaveValue('Y');
  await expect(page.locator('#grayInput')).toHaveValue('ACFN');
  await expect(page.getByRole('button', { name: 'Next guess' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous guess' }).click();
  await expect(page.locator('#guessStep')).toHaveText('1/2');
  await expect(page.getByRole('button', { name: 'Previous guess' })).toBeDisabled();
  await expect(green(page, 1)).toHaveValue('');
  await expect(yellow(page, 2)).toHaveValue('R');
  await expect(yellow(page, 5)).toHaveValue('E');
  await page.getByRole('button', { name: 'Next guess' }).click();
  await expect(green(page, 1)).toHaveValue('B');
  await yellow(page, 3).fill('R');
  await expect(page.locator('#guessNav')).toBeHidden();
});

test('import cancel preserves clues and invalid images can be retried', async ({ page }) => {
  await open(page);
  await green(page, 1).fill('A');
  await importImage(page, 'guesses.png');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(green(page, 1)).toHaveValue('A');
  await page.locator('#importFile').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(page.locator('#importNote')).toContainText('Couldn’t find a Wordle grid');
  await expect(page.getByRole('button', { name: 'Use these clues' })).toBeDisabled();
  await importImage(page, 'guesses.png');
  await expect(page.locator('#importRows input')).toHaveCount(10);
});

test('known bug: gray duplicate excludes BEERY after importing BEEFY against BERRY', async ({ page }) => {
  // BEERY would satisfy every positional clue, but has one E too many.
  // A single-word dictionary makes that maximum-count defect observable in the list.
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'BEERY\n', contentType: 'text/plain' }));
  await open(page);
  await importImage(page, 'duplicate-cap.png');
  expect(await values(page.locator('#importRows input'))).toEqual([...'RANTSBEEFY']);
  await page.getByRole('button', { name: 'Use these clues' }).click();
  expect(await values(page.locator('.green-cell'))).toEqual(['B', 'E', '', '', 'Y']);
  expect(await values(page.locator('.yellow-cell'))).toEqual(['R', '', '', '', '']);
  await expect(page.locator('#grayInput')).toHaveValue('AFNST');
  await expect(page.locator('#clueStatus')).toHaveText('');
  await expect(page.locator('#wordNote')).toBeVisible();
  await page.locator('#wordNote').getByRole('button', { name: 'Hide', exact: true }).click();
  // Setup errors remain real failures. Only the missing semantic constraint is expected.
  test.fail(true, 'Import stores minimum counts only; the gray duplicate maximum is lost.');
  await expect(page.locator('#resultsTitle')).toHaveText('None of the legal arrangements fits a known word.');
});

test('theme follows the system until the switch is used', async ({ page }) => {
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme || 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  expect(await theme()).toBe('dark');
  await expect(page.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'true');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(theme).toBe('light');
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  expect(await theme()).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  expect(await theme()).toBe('dark');
});

test('on a light system the theme starts light, switches to dark and is remembered', async ({ page }) => {
  await open(page);
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme || 'light');
  const toggle = page.getByRole('switch', { name: 'Dark mode' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await theme()).toBe('light');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(await theme()).toBe('dark');
  await open(page);
  expect(await theme()).toBe('dark');
  await expect(page.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await open(page);
  expect(await theme()).toBe('light');
});

async function putOnClipboard(page, { image, text }) {
  const bytes = image ? [...require('node:fs').readFileSync(fixture(image))] : null;
  await page.evaluate(async ({ bytes, text }) => {
    const item = bytes
      ? new ClipboardItem({ 'image/png': new Blob([new Uint8Array(bytes)], { type: 'image/png' }) })
      : new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
    await navigator.clipboard.write([item]);
  }, { bytes, text });
}

test('Paste screenshot reads an image from the clipboard and explains when there is none', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await putOnClipboard(page, { text: 'hello' });
  await page.getByRole('button', { name: 'Paste screenshot' }).click();
  await expect(page.locator('#importNote')).toContainText('no image on the clipboard');
  await expect(page.getByRole('button', { name: 'Use these clues' })).toBeDisabled();
  await putOnClipboard(page, { image: 'guesses.png' });
  await page.getByRole('button', { name: 'Paste screenshot' }).click();
  await expect(page.getByRole('button', { name: 'Use these clues' })).toBeEnabled();
  expect(await values(page.locator('#importRows input'))).toEqual([...'CRANEBEEFY']);
});

test('keyboard paste of an image imports it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await putOnClipboard(page, { image: 'guesses.png' });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+V');
  await expect(page.getByRole('button', { name: 'Use these clues' })).toBeEnabled();
  expect(await values(page.locator('#importRows input'))).toEqual([...'CRANEBEEFY']);
});

test('letters panel defaults to the keyboard view and remembers a change', async ({ page }) => {
  await open(page);
  const pressed = page.locator('#lettersSeg [aria-pressed="true"]');
  await expect(pressed).toHaveText('Keyboard');
  await expect(page.locator('#lettersBody .kb-row')).toHaveCount(3);
  await page.locator('#lettersSeg').getByRole('button', { name: 'V/C', exact: true }).click();
  await expect(page.locator('#lettersBody .vc-label')).toHaveCount(2);
  await open(page);
  await expect(pressed).toHaveText('V/C');
});

test('vowel odds: filtering counts words, not letters, and options sort by probability', async ({ page }) => {
  await open(page);
  const result = await page.evaluate(() => {
    const words = ['APPLE', 'BREAD', 'CHOIR', 'DUMPY', 'GLYPH', 'STORY'];
    const brief = ({ count, options }) => [count, options.map(o => `${o.vowel || '-'}${Math.round(600 * o.p)}`).join(' ')];
    return {
      filters: [filterAnswers(words, 'A', ''), filterAnswers(words, 'Y', 'O'), filterAnswers(words, '', 'AEIOU')],
      nothingKnown: brief(vowelOdds(words, {})),
      aYellow: brief(vowelOdds(words, { A: 'yellow' })),
      yYellowOGray: brief(vowelOdds(words, { Y: 'yellow', O: 'gray' })),
      noneLeft: brief(vowelOdds(words, { A: 'yellow', E: 'gray' })),
      allKnown: brief(vowelOdds(words, { A: 'yellow', E: 'yellow', I: 'gray', O: 'gray', U: 'gray', Y: 'gray' })),
      withConsonants: brief(vowelOdds(words, { Y: 'yellow' }, 'P', 'D')),
      rank: letterRank(words).slice(0, 3).map(r => `${r.letter}${Math.round(600 * r.p)}`),
    };
  });
  expect(result.filters).toEqual([['APPLE', 'BREAD'], ['DUMPY', 'GLYPH'], ['GLYPH']]);
  // Shares are in sixths (×600 → 100 per word); '-' is "none of the unknown vowels".
  expect(result.nothingKnown).toEqual([6, 'Y300 A200 E200 O200 I100 U100 -0']);
  expect(result.aYellow).toEqual([2, 'E600 I0 O0 U0 Y0 -0']);
  expect(result.yYellowOGray).toEqual([2, 'U300 -300 A0 E0 I0']);
  expect(result.noneLeft).toEqual([0, '']);
  expect(result.allKnown).toEqual([2, '']);
  // Other letters narrow the list too: Y and P in, D out leaves GLYPH.
  expect(result.withConsonants).toEqual([1, '-600 A0 E0 I0 O0 U0']);
  // APPLE's two Ps count once: P, R and Y are each in three of the six words.
  expect(result.rank).toEqual(['P300', 'R300', 'Y300']);
});

test('vowel odds panel starts from the clues, cycles vowels and matches the answer list', async ({ page }) => {
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban2=A&yellow=A&gray=EST');
  await openAnalysis(page);
  const check = async (yellow, gray) => {
    const { count, chips } = expectedOdds(yellow, gray);
    await expect(page.locator('#oddsCount')).toHaveText(`${count} of ${answerWords.length} answers left`);
    await expect(oddsChips(page)).toHaveText(chips);
  };
  await expect(vowelKey(page, 'A')).toHaveAttribute('data-state', 'yellow');
  await expect(vowelKey(page, 'E')).toHaveAttribute('data-state', 'gray');
  await expect(vowelKey(page, 'I')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('#oddsResetBtn')).toBeHidden();
  await check('A', 'E');

  // Shaded by value: each chip mixes in the accent at its own percentage, and equal odds look equal.
  const shades = await oddsChips(page).evaluateAll(els => els.map(el => [Number(el.dataset.p), el.style.background]));
  for (const [p, background] of shades) expect(background).toContain(`var(--accent) ${Math.round(100 * p)}%`);

  // The table's yellow A / gray E cell is the same slice, and is marked as the current case.
  const cell = page.locator('#oddsTable .odds-cell[data-yellow="A"][data-gray="E"]');
  await expect(cell).toHaveClass(/current/);
  const { options, count } = expectedOdds('A', 'E');
  const top = options.filter(([label]) => label.length === 1).slice(0, 2);
  const none = options.find(([label]) => label.length > 1);
  await expect(cell.locator('.odds-entry')).toHaveText(
    [...top, ['∅', none[1]]].map(([label, n]) => `${label} ${percent(n, count)}`));
  await expect(page.locator('#oddsTable .odds-cell.current')).toHaveCount(1);

  // Tapping cycles unknown → yellow → gray → unknown; back at the clue state, the override goes.
  await vowelKey(page, 'O').click();
  await expect(vowelKey(page, 'O')).toHaveAttribute('data-state', 'yellow');
  await expect(page.locator('#oddsResetBtn')).toBeVisible();
  await check('AO', 'E');
  await expect(page.locator('#oddsTable .odds-cell.current')).toHaveCount(0);
  await vowelKey(page, 'O').click();
  await check('A', 'EO');
  await vowelKey(page, 'O').click();
  await expect(vowelKey(page, 'O')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('#oddsResetBtn')).toBeHidden();

  // A clue vowel can be overridden too, and reset returns every vowel to the clues.
  await vowelKey(page, 'A').click();
  await vowelKey(page, 'I').click();
  await check('I', 'AE');
  await page.locator('#oddsResetBtn').click();
  await check('A', 'E');

  // The panel follows clue edits; Clear empties both.
  await page.locator('#grayInput').fill('ESTU');
  await check('A', 'EU');
  // A green vowel counts as present (position is ignored), even if a duplicate of it was gray.
  await green(page, 1).fill('U');
  await expect(vowelKey(page, 'U')).toHaveAttribute('data-state', 'yellow');
  await check('AU', 'E');
  await vowelKey(page, 'Y').click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await check('', '');
  await expect(oddsChips(page).last()).toHaveText('no vowel 0%');
});

test('Rank letters view orders letters by share of answers; grays stay in place, disabled', async ({ page }) => {
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&gray=EZ');
  const share = l => answerWords.filter(w => w.includes(l)).length;
  const expected = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].sort((a, b) => share(b) - share(a));
  await page.locator('#lettersSeg').getByRole('button', { name: 'Rank', exact: true }).click();
  await expect(page.locator('#lettersBody .key')).toHaveText(expected);
  await expect(page.locator('#lettersBody .vc-label')).toHaveText(['Top 12', '', 'Then']);
  await expect(letter(page, 'E')).toBeDisabled();
  await expect(letter(page, expected[1])).toHaveAttribute('title', new RegExp(`in ${percent(share(expected[1]), answerWords.length)} of answers`));
  await letter(page, expected[1]).click();
  await expect(page.locator('#board .trial')).toHaveCount(1);

  // The same ranking, with percentages, as reference data under the vowel odds.
  await openAnalysis(page);
  await page.locator('summary', { hasText: 'Letter ranking' }).click();
  await expect(page.locator('#rankTable .rank-cell')).toHaveText(expected.map(l => `${l}${percent(share(l), answerWords.length)}`));
  await expect(page.locator('#rankTable .rank-row')).toHaveCount(4);
  await expect(page.locator('#rankCaption')).toContainText(`top 12 are ${expected.slice(0, 6).join('')} ${expected.slice(6, 12).join('')}`);
  const through = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'words', 'answers-sources.json'), 'utf8')).nyt.throughDate;
  const shown = await page.evaluate(d => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), through);
  expect(shown).toContain(through.slice(0, 4));
  await expect(page.locator('#rankThrough')).toHaveText(`Using solutions up to ${shown}.`);
});

test('without the answer list, vowel odds explain and Rank falls back to the built-in order', async ({ page }) => {
  await page.route('**/words/answers.csv', route => route.abort());
  await open(page);
  await openAnalysis(page);
  await expect(page.locator('#oddsNote')).toHaveText('Vowel odds need the answer list, which didn’t load.');
  await expect(page.locator('#oddsBody')).toBeHidden();
  await page.locator('#lettersSeg').getByRole('button', { name: 'Rank', exact: true }).click();
  await expect(page.locator('#lettersBody .key').first()).toHaveText('E');
  await expect(page.locator('#lettersBody .key')).toHaveCount(26);
});

test('vowel odds use consonant clues only when switched to All clues, and remember it', async ({ page }) => {
  // Clues: A yellow, M green, E gray vowel, S and T gray consonants.
  await open(page, '?len=5&green=M%3F%3F%3F%3F&ban2=A&yellow=A&gray=EST');
  await openAnalysis(page);
  const scope = name => page.locator('#oddsScope').getByRole('button', { name, exact: true });
  const check = async (...args) => {
    const { count, chips } = expectedOdds(...args);
    await expect(page.locator('#oddsCount')).toHaveText(`${count} of ${answerWords.length} answers left`);
    await expect(oddsChips(page)).toHaveText(chips);
  };
  await expect(scope('Vowels only')).toHaveAttribute('aria-pressed', 'true');
  await check('A', 'E');
  await expect(page.locator('#oddsTable .odds-cell.current')).toHaveCount(1);

  await scope('All clues').click();
  await check('A', 'E', 'M', 'ST');
  // The table is vowels only, so no cell matches the panel now.
  await expect(page.locator('#oddsTable .odds-cell.current')).toHaveCount(0);
  await page.locator('#grayInput').fill('ESTR');
  await check('A', 'E', 'M', 'RST');

  await page.reload();
  await expect(scope('All clues')).toHaveAttribute('aria-pressed', 'true');
  await check('A', 'E', 'M', 'RST');
  await scope('Vowels only').click();
  await check('A', 'E');
});

test('arrangement list comes before the grid; the swap link reverses that and is remembered', async ({ page }) => {
  // Three yellows give more arrangements than the list shows before "Show all".
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban0=A&ban1=E&ban2=R&yellow=AER');
  const listFirst = () => page.evaluate(() =>
    !!($('listWrap').compareDocumentPosition($('summaryWrap')) & Node.DOCUMENT_POSITION_FOLLOWING));
  const swap = page.locator('#swapResultsBtn');
  expect(await listFirst()).toBe(true);
  await expect(swap).toHaveText('put grid first');
  await expect(page.locator('#listCaption')).toContainText('Pin a cell below');

  await swap.click();
  expect(await listFirst()).toBe(false);
  await expect(swap).toHaveText('put list first');
  await expect(page.locator('#listCaption')).toContainText('Pin a cell above');

  await page.reload();
  await expect(swap).toHaveText('put list first');
  expect(await listFirst()).toBe(false);
  await swap.click();
  expect(await listFirst()).toBe(true);
});

test('more analysis starts closed, opens and closes, and remembers the choice', async ({ page }) => {
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban2=A&yellow=A');
  const toggle = page.locator('#analysisBtn');
  await expect(toggle).toHaveText('More analysis');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#analysisBody')).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveText('Hide analysis');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(vowelKey(page, 'A')).toHaveAttribute('data-state', 'yellow');
  await expect(page.locator('#oddsCount')).toHaveText(`${expectedOdds('A', '').count} of ${answerWords.length} answers left`);

  await page.reload();
  await expect(page.locator('#analysisBody')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#analysisBody')).toBeHidden();
  await page.reload();
  await expect(page.locator('#analysisBody')).toBeHidden();
});
