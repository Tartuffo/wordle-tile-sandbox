const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

// The clues the app holds, read from its state: the green pattern, the letters that were
// yellow in each slot, and the gray letters. Only the keys asked for are compared.
const expectClues = (page, want) => expect.poll(() => page.evaluate(keys => {
  const all = { green: greens.map(g => g || '?').join(''), yellow: yellows.map(y => y || '-').join(' '), gray: grays };
  return Object.fromEntries(keys.map(k => [k, all[k]]));
}, Object.keys(want))).toEqual(want);
const NO_CLUES = { green: '?????', yellow: '- - - - -', gray: '' };
// The guess editor: a tile by guess and slot, and typing a guess then coloring it, where
// colors has a digit per letter: 0 gray, 1 yellow, 2 green.
const guessTile = (page, row, slot) => page.locator('#guessRows .guess-row').nth(row - 1).locator('.guess-tile').nth(slot - 1);
const guessWords = page => page.locator('#guessRows .guess-row').evaluateAll(rows =>
  rows.map(row => [...row.querySelectorAll('.guess-tile')].map(t => t.textContent || '·').join('')));
// The summary's guess words: all of them in order, and how many count toward the clues shown.
async function expectGuesses(page, words, step = words.length) {
  await expect(page.locator('#guessWords .guess-word')).toHaveText(words);
  await expect(page.locator('#guessWords .guess-word:not(.later)')).toHaveCount(step);
}
const guessWord = (page, word) => page.locator('#guessWords').getByRole('button', { name: word, exact: true });
async function typeGuess(page, row, word, colors = '00000') {
  await page.keyboard.type(word);
  for (let i = 0; i < 5; i++) for (let n = 0; n < Number(colors[i]); n++) await guessTile(page, row, i + 1).click();
}
const boardSlot = (page, slot) => page.locator(`#board .slot[data-pos="${slot - 1}"]`);
const letter = (page, value) => page.locator('#lettersBody').getByRole('button', { name: value, exact: true });
const arrangements = page => page.locator('#list .arr');
const fixture = name => path.join(__dirname, 'fixtures', name);
const openTables = page => page.getByRole('button', { name: 'Reference tables', exact: true }).click();
// Which answers fit every clue, computed here independently of the app.
const fitting = ({ green = '?????', bans = {}, yellow = '', gray = '' }) => answerWords.filter(w =>
  [...green].every((g, i) => g === '?' || w[i] === g) &&
  Object.entries(bans).every(([i, letters]) => ![...letters].includes(w[Number(i)])) &&
  ![...gray].filter(l => !green.includes(l) && !yellow.includes(l)).some(l => w.includes(l)) &&
  [...new Set(green.replace(/\?/g, '') + yellow)].every(l => [...w].filter(x => x === l).length >= [...green + yellow].filter(x => x === l).length) &&
  [...gray].filter(l => green.includes(l) || yellow.includes(l)).every(l => [...w].filter(x => x === l).length <= [...green + yellow].filter(x => x === l).length));
// By share, most common first; among equal shares, gray letters last, then alphabetical.
const rankOf = (words, gray = '') => [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].sort((a, b) =>
  (words.filter(w => w.includes(b)).length - words.filter(w => w.includes(a)).length) ||
  (gray.includes(a) - gray.includes(b)));
const editClues = page => page.getByRole('button', { name: 'Edit clues', exact: true }).click();
const typeClues = page => page.getByRole('button', { name: 'Type clues', exact: true }).click();
const useClues = page => page.getByRole('button', { name: 'Use these clues', exact: true }).click();
const cancel = page => page.getByRole('button', { name: 'Cancel', exact: true }).click();
// The least clue there is: one gray letter, which leaves every slot of the board free.
const ONLY_Q_GRAY = '?green=%3F%3F%3F%3F%3F&gray=Q';
const P_YELLOW = '?green=%3F%3F%3F%3F%3F&ban0=P&yellow=P';
const startOver = page => page.getByRole('button', { name: 'Start over', exact: true }).click();
const TIPS = ['intro', 'board', 'list'];

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
  options.push([yellow ? 'No other vowel' : 'No vowel', left.filter(w => !unknown.some(v => w.includes(v))).length]);
  options.sort((a, b) => b[1] - a[1]);
  return { count: left.length, chips: options.map(([label, n]) => `${label} ${percent(n, left.length)}`), options };
}

async function open(page, query = '') {
  const loaded = page.waitForResponse(response => response.url().endsWith('/words/5.txt'));
  await page.goto('/' + query);
  await loaded;
}
// A screenshot that reads cleanly goes straight to the summary.
async function importImage(page, name) {
  await page.locator('#importFile').setInputFiles(fixture(name));
  await expect(page.locator('#cluesSummary')).toBeVisible();
}
const guessCode = page => page.evaluate(() => encodeGuesses(guesses.rows));

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-02T12:00:00Z'));
  // The first-time tips have their own test, which opts out of this; elsewhere they would only get in the way.
  await page.addInitScript(tips => {
    if (!sessionStorage.getItem('test-tips')) localStorage.setItem('wordle-sandbox-tips-seen', JSON.stringify(tips));
    // Most tests count arrangements with the non-words dimmed, as the default once was; the
    // Hide default has its own test, which opts out of this.
    if (!sessionStorage.getItem('test-wordmode')) localStorage.setItem('wordle-sandbox-nonword-mode-2', 'dim');
  }, TIPS);
});

test('typing guesses: letters fill a row at a time, a tap colors a letter, Backspace and × take letters back', async ({ page }) => {
  await open(page);
  const use = page.getByRole('button', { name: 'Use these clues', exact: true });
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeHidden();
  await typeClues(page);
  // One empty row, the first tile marked as where the next letter goes.
  expect(await guessWords(page)).toEqual(['·····']);
  await expect(guessTile(page, 1, 1)).toHaveClass(/next/);
  await expect(use).toBeDisabled();
  await page.keyboard.type('cra');
  expect(await guessWords(page)).toEqual(['CRA··']);
  await expect(guessTile(page, 1, 4)).toHaveClass(/next/);
  await expect(use).toBeDisabled();   // a started guess must be finished
  // A full row opens the next; letters past it go there. Anything but letters is ignored.
  await page.keyboard.type('ne b1 ');
  expect(await guessWords(page)).toEqual(['CRANE', 'B····']);
  await expect(use).toBeDisabled();
  await page.keyboard.press('Backspace');
  expect(await guessWords(page)).toEqual(['CRANE', '·····']);
  await expect(use).toBeEnabled();
  // Backspace on the empty row goes on into the guess before it.
  await page.keyboard.press('Backspace');
  expect(await guessWords(page)).toEqual(['CRAN·']);
  await page.keyboard.type('e');

  // A letter starts gray; each tap moves it on: yellow, green, gray again. Typing still works after.
  const r = guessTile(page, 1, 2);
  await expect(r).toHaveClass(/gray/);
  await expect(r).toHaveAttribute('aria-label', 'Guess 1, slot 2: R, gray');
  await r.click();
  await expect(r).toHaveClass(/yellow/);
  await r.click();
  await expect(r).toHaveClass(/green/);
  await r.click();
  await expect(r).toHaveClass(/gray/);
  await r.click();
  await guessTile(page, 1, 5).click();
  await typeGuess(page, 2, 'beefy', '22002');
  expect(await guessWords(page)).toEqual(['CRANE', 'BEEFY', '·····']);

  // × empties a guess and keeps its place, so a retyped one goes back there; on the empty row it removes it.
  await page.getByRole('button', { name: 'Clear guess 1', exact: true }).click();
  expect(await guessWords(page)).toEqual(['·····', 'BEEFY']);
  await page.keyboard.type('slate');
  expect(await guessWords(page)).toEqual(['SLATE', 'BEEFY', '·····']);
  await page.getByRole('button', { name: 'Clear guess 1', exact: true }).click();
  await page.getByRole('button', { name: 'Remove the empty row 1', exact: true }).click();
  expect(await guessWords(page)).toEqual(['BEEFY', '·····']);
  await typeGuess(page, 2, 'crane', '01001');

  // Nothing has changed yet; Use these clues takes the guesses in the order they stand.
  await expectClues(page, NO_CLUES);
  await use.click();
  await expectClues(page, { green: 'BE??Y', yellow: '- R - - E', gray: 'ACEFN' });
  await expectGuesses(page, ['BEEFY', 'CRANE']);
  await expect(page.locator('#clueNote')).toHaveText('');
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();

  // Six guesses fill the editor: no seventh row, and more letters go nowhere.
  await startOver(page);
  await expectClues(page, NO_CLUES);
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeHidden();
  await typeClues(page);
  expect(await guessWords(page)).toEqual(['·····']);
  await page.keyboard.type('aaaaabbbbbcccccdddddeeeeefffffggggg');
  expect(await guessWords(page)).toEqual(['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF']);
});

test('holding or right-clicking a letter clears just that one; the next letter typed goes there, in the color the slot had', async ({ page }) => {
  await open(page);
  const use = page.getByRole('button', { name: 'Use these clues', exact: true });
  await typeClues(page);
  await expect(page.locator('#holdHint')).toHaveText('Hold or right-click a letter to clear it and type another.');
  await typeGuess(page, 1, 'crxne', '01201');
  await page.keyboard.type('be');
  await guessTile(page, 2, 1).click();
  expect(await guessWords(page)).toEqual(['CRXNE', 'BE···']);

  // A right-click takes the X out. The gap is where typing goes next, ahead of the unfinished guess below.
  await guessTile(page, 1, 3).click({ button: 'right' });
  expect(await guessWords(page)).toEqual(['CR·NE', 'BE···']);
  await expect(guessTile(page, 1, 3)).toHaveClass(/next/);
  await expect(guessTile(page, 1, 3)).toHaveClass(/keeps-green/);
  await expect(guessTile(page, 1, 3)).toHaveAttribute('aria-label', 'Guess 1, slot 3: empty, green');
  await expect(use).toBeDisabled();
  await page.keyboard.type('a');
  expect(await guessWords(page)).toEqual(['CRANE', 'BE···']);
  await expect(guessTile(page, 1, 3)).toHaveClass(/green/);
  await expect(guessTile(page, 1, 2)).toHaveClass(/yellow/);   // the others kept their colors
  await expect(guessTile(page, 2, 3)).toHaveClass(/next/);

  // Holding does the same, and the release after it is not a tap on the tile.
  await guessTile(page, 1, 2).hover();
  await page.mouse.down();
  await expect.poll(() => guessWords(page)).toEqual(['C·ANE', 'BE···']);
  await page.mouse.up();
  await expect(guessTile(page, 1, 2)).toHaveClass(/keeps-yellow/);
  // A short press still changes the color, as before.
  await guessTile(page, 1, 1).click();
  await expect(guessTile(page, 1, 1)).toHaveClass(/yellow/);

  // Backspace takes the letter before the gap, then runs out of letters in that guess.
  await page.keyboard.press('Backspace');
  expect(await guessWords(page)).toEqual(['··ANE', 'BE···']);
  await page.keyboard.press('Backspace');
  expect(await guessWords(page)).toEqual(['··ANE', 'BE···']);
  await page.keyboard.type('stefy');
  expect(await guessWords(page)).toEqual(['STANE', 'BEEFY', '·····']);
  await expect(guessTile(page, 1, 1)).toHaveClass(/yellow/);
  await expect(guessTile(page, 1, 2)).toHaveClass(/yellow/);

  // A guess emptied whole forgets its colors.
  await page.getByRole('button', { name: 'Clear guess 1', exact: true }).click();
  await page.keyboard.type('pilot');
  for (let slot = 1; slot <= 5; slot++) await expect(guessTile(page, 1, slot)).toHaveClass(/gray/);
  await expect(use).toBeEnabled();
});

test('arrangements of a typed guess can be pinned and cleared', async ({ page }) => {
  await open(page);
  await typeClues(page);
  await typeGuess(page, 1, 'bezil', '21000');
  await useClues(page);
  await expect(arrangements(page)).toHaveCount(3);
  expect((await arrangements(page).allTextContents()).sort()).toEqual(['B···E', 'B··E·', 'B·E··'].sort());
  await page.getByTitle('Pin E to slot 3', { exact: true }).click();
  await expect(arrangements(page)).toHaveCount(1);
  await arrangements(page).click();
  await expect(boardSlot(page, 3)).toHaveText('E');
  await page.getByRole('button', { name: 'Clear pins', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(3);
  await startOver(page);
  await expect(page.locator('#board .tile')).toHaveCount(0);
});

test('guesses that contradict each other are reported and block Use these clues until put right', async ({ page }) => {
  await open(page);
  const use = page.getByRole('button', { name: 'Use these clues', exact: true });
  const status = page.locator('#guessStatus');
  await typeClues(page);
  await typeGuess(page, 1, 'crane', '20000');
  await typeGuess(page, 2, 'blimp', '20000');
  await expect(status).toHaveText('Slot 1 is green for both C and B.');
  await expect(use).toBeDisabled();
  await guessTile(page, 2, 1).click();   // B back to gray
  await expect(status).toHaveText('');
  await expect(use).toBeEnabled();
  // The same letter in the same slot can't be green in one guess and not in another.
  await typeGuess(page, 3, 'cable', '00000');
  await expect(status).toHaveText('C in slot 1 is green in one guess but not in another.');
  await guessTile(page, 3, 1).click();
  await guessTile(page, 3, 1).click();
  await expect(status).toHaveText('');
  // Gray says the word has no more of a letter; a later guess can't color more of them.
  await typeGuess(page, 4, 'rebar', '10000');
  await expect(status).toHaveText('R is gray in one guess but colored in another.');
  await expect(use).toBeDisabled();
  await page.getByRole('button', { name: 'Clear guess 4', exact: true }).click();
  await expect(status).toHaveText('');
  await typeGuess(page, 4, 'eerie', '11000');
  await expect(status).toHaveText('E is gray in one guess but colored in another.');
  await page.getByRole('button', { name: 'Clear guess 4', exact: true }).click();
  // A gray copy beside a colored one caps the count, here at one O; three can't follow.
  await typeGuess(page, 4, 'ootsy', '10000');
  await expect(status).toHaveText('');
  await typeGuess(page, 5, 'ouozo', '10101');
  await expect(status).toHaveText('One guess shows 1 of O, another shows 3.');
  await expect(use).toBeDisabled();
});

test('double letters come from the guesses: two yellows in one guess are two tiles', async ({ page }) => {
  await open(page);
  await typeClues(page);
  await typeGuess(page, 1, 'eerie', '11000');
  await useClues(page);
  await expect(page.locator('#board .tile.yellow')).toHaveCount(2);
  await expect(arrangements(page)).toHaveCount(3);
  await expect(page.locator('#clueIn > .mini').locator('span')).toHaveText(['E×2']);
  await expect(page.locator('#clueOut .mini span')).toHaveText(['I', 'R']);   // not E: its gray copy only caps the count
  // One yellow and a gray copy: a single tile, and no more E than that.
  await editClues(page);
  await guessTile(page, 1, 2).click();
  await guessTile(page, 1, 2).click();
  await expect(guessTile(page, 1, 2)).toHaveClass(/gray/);
  await useClues(page);
  await expect(page.locator('#board .tile.yellow')).toHaveCount(1);
});

test('links from the 6- and 7-letter versions are ignored; 5-letter ones still open', async ({ page }) => {
  await open(page, '?len=6&green=B%3F%3F%3F%3F%3F&gray=FX');
  await expectClues(page, NO_CLUES);
  expect(new URL(page.url()).search).toBe('');
  await page.goto('/?green=B%3F%3F%3F%3F&gray=FX');
  await expectClues(page, { green: 'B????', gray: 'FX' });
});

test('same-day clues survive reload, copy link round-trips, yesterday expires', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async text => { window.copiedLink = text; },
    } });
  });
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&ban2=E&yellow=EE&gray=FX');
  await page.reload();
  await expectClues(page, { green: 'B????', gray: 'FX' });
  await expect(page.locator('#board .tile.yellow')).toHaveCount(2);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#clueLinkNote')).toHaveText('Copied');
  const shared = await page.evaluate(() => window.copiedLink);
  const fresh = await context.browser().newContext();
  const recipient = await fresh.newPage();
  await recipient.goto(shared);
  await expectClues(recipient, { green: 'B????', yellow: '- E E - -', gray: 'FX' });
  await expect(recipient.locator('#board .tile.yellow')).toHaveCount(2);
  await fresh.close();
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
  await page.reload();
  await expectClues(page, NO_CLUES);
  await expect(page.locator('#board .tile')).toHaveCount(0);
});

test('gray letters and Dim / Hide / Show use deterministic dictionary results', async ({ page }) => {
  // Isolate filtering from changes to the full dictionary. The normal smoke test below uses it.
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'APPLE\nAMPLE\n', contentType: 'text/plain' }));
  await open(page, P_YELLOW);
  await expect(arrangements(page)).toHaveCount(4);
  await expect(page.locator('#list .arr.noword')).toHaveCount(2);
  await page.locator('#wordNote').getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(2);
  await page.locator('#wordNote').getByRole('button', { name: 'Show', exact: true }).click();
  await expect(arrangements(page)).toHaveCount(4);
  await expect(page.locator('#list .arr.noword')).toHaveCount(0);
  await page.locator('#wordNote').getByRole('button', { name: 'Dim', exact: true }).click();
  await open(page, P_YELLOW + '&gray=AM');
  await expect(page.locator('#list .arr.noword')).toHaveCount(4);
  await page.locator('#lettersSeg [data-view="vc"]').click();
  await expect(letter(page, 'A')).toHaveCount(0);
  await page.locator('#lettersSeg [data-view="keyboard"]').click();
  await expect(letter(page, 'A')).toBeDisabled();
  await expect(letter(page, 'P')).toBeEnabled();
});

test('holding an arrangement asks once per tab, then lists matching words with ruled-out ones struck', async ({ page }) => {
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'APPLE\nAMPLE\nPLANT\n', contentType: 'text/plain' }));
  await open(page, P_YELLOW + '&gray=M');
  // Desktop Chrome has a mouse, so the caption mentions right-click.
  await expect(page.locator('#listCaption')).toHaveText('Click one to put it on the board. Long click / right click to see all matching words.');
  const arr = arrangements(page).filter({ hasText: '··P··' });
  const confirm = page.locator('#wordsConfirm');
  const dialog = page.locator('#wordsDialog');
  const hold = async () => {
    await arr.hover();
    await page.mouse.down();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.mouse.up();
  };

  // Cancel shows nothing and isn't remembered; the hold wasn't a tap either.
  await hold();
  await expect(confirm).toContainText('Are you sure you want to see the matching words?');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog).toBeHidden();
  await expect(arr).not.toHaveClass(/current/);

  await hold();
  await confirm.getByRole('button', { name: 'Show words' }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('#wordsTitle')).toHaveText('··P··');
  // APPLE fits; AMPLE matches the pattern but M is gray. Both were answers.
  await expect(page.locator('#wordsList span')).toHaveText(['APPLE', 'AMPLE']);
  await expect(page.locator('#wordsList .out')).toHaveText(['AMPLE']);
  await expect(page.locator('#wordsList .out')).toHaveAttribute('title', /^Ruled out: M is gray\. Wordle answer on /);
  const used = ['APPLE', 'AMPLE'].filter(w => answerWords.includes(w));
  await expect(page.locator('#wordsList .answer')).toHaveText(used);
  await expect(page.locator('#wordsNote')).toHaveText(
    `1 word fits your clues; 1 more matches but is ruled out (struck through). ${used.length} were Wordle answers (bold).`);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await arr.click();
  await expect(arr).toHaveClass(/current/);

  // Confirmed for this tab: right-click goes straight to the words.
  await arrangements(page).filter({ hasText: '····P' }).click({ button: 'right' });
  await expect(confirm).toBeHidden();
  await expect(page.locator('#wordsNote')).toHaveText('No word in the dictionary matches this.');
});

test('letters-left taps fill legal blanks; a mouse press keeps a trial, × removes it, a touch hold removes it', async ({ page, browser }) => {
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await letter(page, 'E').click();
  await expect(boardSlot(page, 2).locator('.trial')).toHaveCount(0);
  await expect(page.locator('#board .trial')).toHaveCount(1);
  await page.locator('#board .trial').click();
  await expect(page.locator('#board .trial')).toHaveCount(1);
  // A long press with a mouse is the start of a slow drag, never a removal.
  const trial = page.locator('#board .trial');
  await trial.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.locator('#board .trial')).toHaveCount(1);
  await page.getByRole('button', { name: /^Remove E from slot/ }).click();
  await expect(page.locator('#board .trial')).toHaveCount(0);
  await expect(boardSlot(page, 1).locator('.green')).toHaveText('B');

  // On a touch screen, holding a tried letter still removes it.
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
  const phone = await context.newPage();
  await phone.goto('http://127.0.0.1:4173/?len=5&green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await phone.locator('.tip button').tap();
  await letter(phone, 'E').tap();
  await expect(phone.locator('#board .trial')).toHaveCount(1);
  const box = await phone.locator('#board .trial').boundingBox();
  await phone.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);   // a quick tap keeps it
  await expect(phone.locator('#board .trial')).toHaveCount(1);
  const client = await context.newCDPSession(phone);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await expect(phone.locator('#board .trial')).toHaveCount(0);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await context.close();
});

test('a tried letter dragged onto another takes its place; onto a yellow tile they trade; greens stay fixed; a yellow tile is refused where it was yellow', async ({ page }) => {
  await open(page, '?len=5&green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await letter(page, 'A').click();
  await expect(boardSlot(page, 2)).toHaveText('A');
  await letter(page, 'O').click();
  const slotOf = async sel => Number(await page.locator('#board .slot').filter({ has: page.locator(sel) }).getAttribute('data-pos')) + 1;
  const oSlot = await slotOf('.trial:text("O")');
  // A dropped on O: A is there now, O is gone, and the slot A left is empty.
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, oSlot));
  await expect(boardSlot(page, oSlot)).toHaveText('A');
  await expect(boardSlot(page, 2)).toHaveText('');
  await expect(page.locator('#board .trial')).toHaveText(['A']);
  // Onto an empty slot it just moves; onto a green one it stays where it was.
  await boardSlot(page, oSlot).locator('.trial').dragTo(boardSlot(page, 2));
  await expect(boardSlot(page, 2)).toHaveText('A');
  await expect(boardSlot(page, oSlot)).toHaveText('');
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, 1));
  await expect(boardSlot(page, 1)).toHaveText('B');
  await expect(boardSlot(page, 2)).toHaveText('A');
  // Onto the yellow tile they trade places, but not from slot 2: E was yellow there, and
  // the trade would send it back. Nothing moves.
  const eSlot = await slotOf('.yellow');
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, eSlot));
  await expect(boardSlot(page, 2).locator('.trial')).toHaveText('A');
  await expect(boardSlot(page, eSlot).locator('.yellow')).toHaveText('E');
  // From another slot the trade goes through.
  await boardSlot(page, 2).locator('.trial').dragTo(boardSlot(page, oSlot));
  await boardSlot(page, oSlot).locator('.trial').dragTo(boardSlot(page, eSlot));
  await expect(boardSlot(page, eSlot).locator('.trial')).toHaveText('A');
  await expect(boardSlot(page, oSlot).locator('.yellow')).toHaveText('E');

  // The yellow tile itself can't be dropped where it was yellow: it stays, and nothing is flagged.
  await expect(page.locator('#boardBans span')).toHaveText(['', 'E', '', '', '']);
  await page.locator('#board .yellow').dragTo(boardSlot(page, 2));
  await expect(boardSlot(page, oSlot).locator('.yellow')).toHaveText('E');
  await expect(boardSlot(page, 2)).toHaveText('');
  await expect(page.locator('#board .conflict')).toHaveCount(0);
  await expect(page.locator('#boardStatus')).toHaveText('');
  // Any other open slot takes it.
  const free = [2, 3, 4, 5].find(n => n !== 2 && n !== oSlot && n !== eSlot);
  await page.locator('#board .yellow').dragTo(boardSlot(page, free));
  await expect(boardSlot(page, free).locator('.yellow')).toHaveText('E');
});

test('full board checks the real word list; another arrangement clears the tried letters, a dragged tile replaces the one it lands on', async ({ page }) => {
  await open(page, ONLY_Q_GRAY);
  for (const value of 'APPLE') await letter(page, value).click();
  await expect(page.locator('#boardWord')).toHaveText(/^APPLE ✓ is in the word list\./);
  await expect(boardSlot(page, 1)).toHaveAttribute('aria-label', 'Slot 1: A, tried');
  await letter(page, 'Z').click();
  await expect(page.locator('#board .trial')).toHaveCount(5);
  // Another arrangement, from the arrows or the list, starts the board clean: the letters
  // tried were chosen around the old one's tiles.
  await open(page, '?green=%3F%3F%3F%3F%3F&ban0=Z&yellow=Z');
  await expect(page.locator('#board .yellow')).toHaveText('Z');
  const fill = async () => {
    for (const value of 'APPL') await letter(page, value).click();
    await expect(page.locator('#board .trial')).toHaveCount(4);
  };
  await fill();
  await page.getByRole('button', { name: 'Next arrangement', exact: true }).click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 2 of 4');
  await expect(page.locator('#board .trial')).toHaveCount(0);
  await fill();
  await arrangements(page).first().click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 1 of 4');
  await expect(page.locator('#board .trial')).toHaveCount(0);
  // The arrangement already on the board keeps them when picked again.
  await fill();
  await arrangements(page).first().click();
  await expect(page.locator('#board .trial')).toHaveCount(4);
  // A chosen slot is forgotten with them.
  await page.getByRole('button', { name: /^Remove P from slot/ }).first().click();
  await expect(page.locator('#board .slot.selected')).toHaveCount(1);
  await page.getByRole('button', { name: 'Next arrangement', exact: true }).click();
  await expect(page.locator('#board .slot.selected')).toHaveCount(0);
  // Dragging a yellow tile is different: it replaces the tried letter it is dropped on, which
  // does not move to the slot the tile left, and the other tried letters stay.
  await fill();
  const from = await page.locator('#board .slot').filter({ has: page.locator('.yellow') }).getAttribute('data-pos');
  const target = await page.locator('#board .slot').filter({ has: page.locator('.trial', { hasText: 'L' }) }).getAttribute('data-pos');
  await page.locator('#board .yellow').dragTo(boardSlot(page, Number(target) + 1));
  await expect(boardSlot(page, Number(target) + 1)).toHaveText('Z');
  await expect(page.locator('#board .trial')).toHaveText(['A', 'P', 'P']);
  await expect(boardSlot(page, Number(from) + 1)).toHaveText('');
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
    await open(page, ONLY_Q_GRAY);
    for (const value of word) await letter(page, value).click();
  };

  await type('APPLE');
  await expect(note).toHaveText(`Wordle answer on ${date(once[3])}.`);
  await type('CIGAR');
  await expect(page.locator('#boardWord')).toHaveText(`CIGAR ✓ is in the word list. Wordle answer 2 times, last on ${date(twice[3])}.`);
  await type('GAFFE');
  // Never used: says how recent the list is, since it is refreshed weekly.
  const through = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'words', 'answers-sources.json'), 'utf8')).nyt.throughDate;
  await expect(note).toHaveText(`Not a Wordle answer through ${date(through)}.`);
});

test('PNG import reads colors/letters straight into the summary, omits solved row; a guess word shows the clues after it; Edit clues is for typed guesses and opens them in the editor', async ({ page }) => {
  await open(page);
  // No review: the letters and colors read go straight to the summary.
  await importImage(page, 'guesses.png');
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  expect(await guessCode(page)).toBe('CRANE01001.BEEFY22002');
  await expect(page.locator('#clueNote')).toHaveText('The solved row was left out.');
  // BEEFY's second E was gray: kept, since it caps the E count at the green one, but E is
  // in the word, so the summary doesn't list it as out.
  await expectClues(page, { green: 'BE??Y', gray: 'ACEFN' });
  await expect(page.locator('#clueOut .mini span')).toHaveText(['A', 'C', 'F', 'N']);
  // A guess word shows the clues as they stood after it; the later ones go faint.
  await expect(guessWord(page, 'BEEFY')).toHaveClass(/shown/);
  await guessWord(page, 'CRANE').click();
  await expectGuesses(page, ['CRANE', 'BEEFY'], 1);
  await expect(guessWord(page, 'CRANE')).toHaveClass(/shown/);
  await expect(guessWord(page, 'CRANE')).toHaveAttribute('aria-pressed', 'true');
  await expect(guessWord(page, 'BEEFY')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#clueNote')).toHaveText('The solved row was left out. Showing the clues after guess 1 of 2.');
  await expectClues(page, { green: '?????', yellow: '- R - - E' });
  // A screenshot was read whole: there is no Edit clues for it, only Start over.
  await expect(page.getByRole('button', { name: 'Edit clues', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start over', exact: true })).toBeVisible();

  // Typed guesses, here from a link, have it. It opens every guess, whatever the step; a
  // changed color is used with all of them.
  await open(page, '?guesses=CRANE01001.BEEFY22002&step=1');
  await expectGuesses(page, ['CRANE', 'BEEFY'], 1);
  await editClues(page);
  expect(await guessWords(page)).toEqual(['CRANE', 'BEEFY', '·····']);
  await expect(guessTile(page, 2, 5)).toHaveClass(/green/);
  await guessTile(page, 1, 1).click();
  await cancel(page);
  await expectGuesses(page, ['CRANE', 'BEEFY'], 1);
  await expectClues(page, { yellow: '- R - - E' });
  await editClues(page);
  await guessTile(page, 1, 3).click();
  await useClues(page);
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  await expectClues(page, { green: 'BE??Y', yellow: '- R A - E', gray: 'CEFN' });
  await expect(page.locator('#clueNote')).toHaveText('');
});

test('guesses survive a reload and travel in the link, with the step and the practice mark; a bad guesses parameter falls back', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedLink = text; } } });
  });
  await open(page);
  await importImage(page, 'guesses.png');
  await guessWord(page, 'CRANE').click();
  await expectGuesses(page, ['CRANE', 'BEEFY'], 1);

  // A reload keeps the guesses and the step, and opens on the summary.
  await page.reload();
  await expectGuesses(page, ['CRANE', 'BEEFY'], 1);
  await expect(page.locator('#clueNote')).toHaveText('Showing the clues after guess 1 of 2.');
  await expect(page.locator('#cluesSummary')).toBeVisible();
  await expectClues(page, { green: '?????', yellow: '- R - - E' });

  // The link carries the older parameters, then the guesses and the step.
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.locator('#clueLinkNote')).toHaveText('Copied');
  const shared = new URL(await page.evaluate(() => window.copiedLink));
  expect(shared.searchParams.get('green')).toBe('?????');
  expect(shared.searchParams.get('ban1')).toBe('R');
  expect(shared.searchParams.get('guesses')).toBe('CRANE01001.BEEFY22002');
  expect(shared.searchParams.get('step')).toBe('1');
  expect(shared.searchParams.has('practice')).toBe(false);
  expect(shared.searchParams.get('shot')).toBe('1');   // read from a screenshot, so not editable there either
  await expect(page.getByRole('button', { name: 'Edit clues', exact: true })).toBeHidden();

  const fresh = await context.browser().newContext();
  const recipient = await fresh.newPage();
  await recipient.goto(shared.href);
  await expectGuesses(recipient, ['CRANE', 'BEEFY'], 1);
  await expect(recipient.getByRole('button', { name: 'Edit clues', exact: true })).toBeHidden();
  await guessWord(recipient, 'BEEFY').click();
  await expectClues(recipient, { green: 'BE??Y', gray: 'ACEFN' });
  expect(new URL(recipient.url()).search).toBe('');

  // With every guess applied the link has no step; guesses alone are enough to open one.
  await recipient.goto(`${shared.origin}/?guesses=crane01001.beefy22002&practice=1`);
  await expectGuesses(recipient, ['CRANE', 'BEEFY']);
  await expectClues(recipient, { green: 'BE??Y' });
  await expect(recipient.locator('#clueNote')).toHaveText('Practice puzzle. The answer is hidden.');
  await expect(recipient.getByRole('button', { name: 'New puzzle', exact: true })).toBeVisible();

  // Guesses that don't parse are ignored and the older parameters are read instead.
  await recipient.goto(`${shared.origin}/?green=B%3F%3F%3F%3F&gray=FX&guesses=CRANE0100`);
  await expectClues(recipient, { green: 'B????', gray: 'FX' });
  await expect(recipient.locator('#guessLine')).toBeHidden();
  await expect(recipient.locator('#clueInLine')).toBeVisible();
  // Clues with no guesses behind them have nothing for the editor: no Edit clues.
  await expect(recipient.getByRole('button', { name: 'Start over', exact: true })).toBeVisible();
  await expect(recipient.getByRole('button', { name: 'Edit clues', exact: true })).toBeHidden();
  await fresh.close();

  // Typed guesses survive a reload as typed ones: still with Edit clues.
  await open(page, '?guesses=CRANE01001.BEEFY22002');
  await editClues(page);
  await typeGuess(page, 3, 'berry', '22022');
  await useClues(page);
  await expectGuesses(page, ['CRANE', 'BEEFY', 'BERRY']);
  await page.reload();
  await expectGuesses(page, ['CRANE', 'BEEFY', 'BERRY']);
  await expect(page.getByRole('button', { name: 'Edit clues', exact: true })).toBeVisible();
  await expectClues(page, { green: 'BE?RY' });
});

test('an image with no grid is said in the card, which stays as it was; a good one replaces what was being typed', async ({ page }) => {
  await open(page);
  await typeClues(page);
  await page.keyboard.type('a');
  await page.locator('#importFile').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(page.locator('#importMsg')).toHaveText('Couldn’t find a Wordle grid in that image. Try a full, uncropped screenshot.');
  await expect(page.locator('#importMsg')).not.toHaveClass(/busy/);
  await expect(page.locator('#cluesBody')).toBeVisible();
  expect(await guessWords(page)).toEqual(['A····']);
  await importImage(page, 'guesses.png');
  await expect(page.locator('#importMsg')).toHaveText('');
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  await expect(page.locator('#cluesBody')).toBeHidden();
});

test('a screenshot with letters that were hard to read opens the editor on it, those tiles outlined; used from there it counts as typed', async ({ page }) => {
  await open(page);
  // Stand in for the reader: a first guess with the given letters unsure (and its R misread
  // as P), BEEFY sure, then the solved row.
  const stubRead = unsure => page.evaluate(unsure => {
    const row = (word, colors, doubt = '') => [...word].map((letter, i) =>
      ({ letter, color: ['gray', 'yellow', 'green'][colors[i]], unsure: doubt.includes(letter) }));
    window.readScreenshot = async () => [row('CPANE', '01001', unsure), row('BEEFY', '22002'), row('BERRY', '22222')];
  }, unsure);
  const png = { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from('stubbed') };
  const note = page.locator('#guessNote');
  await stubRead('PE');
  await page.locator('#importFile').setInputFiles(png);

  await expect(page.locator('#cluesBody')).toBeVisible();
  expect(await guessWords(page)).toEqual(['CPANE', 'BEEFY', '·····']);
  await expect(page.locator('#guessRows .guess-tile.unsure')).toHaveText(['P', 'E']);
  await expect(guessTile(page, 1, 2)).toHaveAttribute('aria-label', 'Guess 1, slot 2: P, yellow, hard to read');
  await expect(note).toHaveText('Read from your screenshot. 2 letters were hard to read and are outlined in red. ' +
    'If one is wrong, hold or right-click it and type the right one. The solved row was left out.');
  // The marks are advice: the guesses can be used as they are.
  await expect(page.getByRole('button', { name: 'Use these clues', exact: true })).toBeEnabled();

  // Retyping a marked letter clears its mark and keeps the slot's color.
  await guessTile(page, 1, 2).click({ button: 'right' });
  await page.keyboard.type('r');
  expect(await guessWords(page)).toEqual(['CRANE', 'BEEFY', '·····']);
  await expect(guessTile(page, 1, 2)).toHaveClass(/yellow/);
  await expect(page.locator('#guessRows .guess-tile.unsure')).toHaveText(['E']);
  await expect(note).toContainText('One letter was hard to read and is outlined in red. If it is wrong,');
  await useClues(page);
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  expect(await guessCode(page)).toBe('CRANE01001.BEEFY22002');
  // Having been through the editor, they are typed guesses: Edit clues is there, with no marks left.
  await editClues(page);
  await expect(page.locator('#guessRows .guess-tile.unsure')).toHaveCount(0);
  await expect(note).toHaveText('');
  await cancel(page);

  // Cancel on a doubtful read leaves things as they were: here, the summary.
  await stubRead('A');
  await page.locator('#importFile').setInputFiles(png);
  await expect(page.locator('#guessRows .guess-tile.unsure')).toHaveText(['A']);
  await cancel(page);
  await expect(page.locator('#cluesSummary')).toBeVisible();
  expect(await guessCode(page)).toBe('CRANE01001.BEEFY22002');

  // A sure read needs no editor, and has no Edit clues.
  await stubRead('');
  await page.locator('#importFile').setInputFiles(png);
  await expectGuesses(page, ['CPANE', 'BEEFY']);
  await expect(page.getByRole('button', { name: 'Edit clues', exact: true })).toBeHidden();
});

test('a gray duplicate caps the count: BEEFY against BERRY rules out BEERY', async ({ page }) => {
  // BEERY satisfies every positional clue, but BEEFY's second E was gray, so the word
  // has one E. A single-word dictionary makes the count check observable in the list.
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'BEERY\n', contentType: 'text/plain' }));
  await open(page);
  await importImage(page, 'duplicate-cap.png');
  await expectGuesses(page, ['RANTS', 'BEEFY']);
  // The gray E is kept: it is what caps the count.
  await expectClues(page, { green: 'BE??Y', yellow: 'R - - - -', gray: 'AEFNST' });
  await expect(page.locator('#clueStatus')).toHaveText('');
  await expect(page.locator('#lettersTitle')).toContainText('21 available letters');  // E isn't counted as gray
  await expect(page.locator('#list .arr.noword')).toHaveCount(2);
  await arrangements(page).filter({ hasText: 'BE·RY' }).click({ button: 'right' });
  await page.locator('#wordsConfirm').getByRole('button', { name: 'Show words' }).click();
  await expect(page.locator('#wordsList .out')).toHaveText(['BEERY']);
  await expect(page.locator('#wordsList .out')).toHaveAttribute('title', /^Ruled out: more E’s than your clues allow\./);
  await page.locator('#wordsDialog').getByRole('button', { name: 'Close' }).click();
  await page.locator('#wordNote').getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(page.locator('#resultsTitle')).toHaveText('None of the legal arrangements fits a known word.');
  // Trying another E on the board is flagged too.
  await letter(page, 'E').click();
  await expect(page.locator('#boardStatus')).toHaveText('Too many E’s: your clues allow 1.');
});

test('Random scores guesses like Wordle, duplicates included', async ({ page }) => {
  await open(page);
  const brief = await page.evaluate(() => [['SPEED', 'ABIDE'], ['EERIE', 'THREE'], ['CRANE', 'CRANE']].map(([g, s]) =>
    scoreGuess(g, s).map(t => t.color === 'green' ? t.letter : t.color === 'yellow' ? t.letter.toLowerCase() : '.').join('')));
  expect(brief).toEqual(['..e.d', 'e.R.E', 'CRANE']);
});

test('Random makes up one or two guesses against an answer, with a few to a few dozen arrangements', async ({ page }) => {
  // Colors computed here independently of the app, to check each guess against some answer.
  const colors = (guess, solution) => {
    const out = [...guess].map((l, i) => l === solution[i] ? 'green' : 'gray');
    const left = [...solution].filter((l, i) => out[i] !== 'green');
    out.forEach((c, i) => {
      const k = left.indexOf(guess[i]);
      if (c === 'gray' && k >= 0) { out[i] = 'yellow'; left.splice(k, 1); }
    });
    return out.join();
  };
  await open(page);
  await expect(page.locator('#randomBtn')).toBeEnabled();
  // The first puzzle goes straight to the summary; New puzzle there draws the next.
  const next = () => page.getByRole('button', { name: /^(Practice puzzle|New puzzle)$/ }).click();
  for (let n = 0; n < 12; n++) {
    await next();
    const { rows, total, fitting, tiles } = await page.evaluate(() => ({
      rows: guesses.rows.map(r => ({ word: r.map(t => t.letter).join(''), colors: r.map(t => t.color).join() })),
      total: arrangements.length, fitting: arrangements.length - noWord.size, tiles: movable.length,
    }));
    expect([1, 2]).toContain(rows.length);
    await expectGuesses(page, rows.map(r => r.word));
    await expect(page.locator('#clueNote')).toHaveText('Practice puzzle. The answer is hidden.');
    await expect(page.locator('#resultsTitle')).toHaveText(`${total} legal arrangements of your yellow tiles`);
    expect(total).toBeLessThanOrEqual(80);
    expect(fitting).toBeGreaterThanOrEqual(3);
    expect(fitting).toBeLessThanOrEqual(40);
    expect(tiles).toBeGreaterThanOrEqual(1);
    expect(new Set(rows[0].word).size).toBe(5);
    expect(answerWords.some(w => w !== rows.at(-1).word && rows.every(r => colors(r.word, w) === r.colors))).toBe(true);
    if (rows.length === 2) expect(colors(rows[0].word, rows[1].word)).toBe(rows[0].colors);
  }
  // A two-guess puzzle steps back to its first guess.
  for (let n = 0; n < 100 && await page.evaluate(() => guesses.rows.length) < 2; n++) await next();
  await page.locator('#guessWords .guess-word').first().click();
  await expect(page.locator('#guessWords .guess-word:not(.later)')).toHaveCount(1);
  await expect(page.locator('#clueNote')).toHaveText('Practice puzzle. The answer is hidden. Showing the clues after guess 1 of 2.');
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
  await expect(page.locator('#importMsg')).toContainText('no image on the clipboard');
  await expect(page.locator('#chooser')).toBeVisible();
  await putOnClipboard(page, { image: 'guesses.png' });
  await page.getByRole('button', { name: 'Paste screenshot' }).click();
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  await expect(page.locator('#importMsg')).toHaveText('');
});

test('keyboard paste of an image imports it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await putOnClipboard(page, { image: 'guesses.png' });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+V');
  await expectGuesses(page, ['CRANE', 'BEEFY']);
  await expect(page.locator('#importMsg')).toHaveText('');
});

test('the letters help button opens a dialog explaining the views', async ({ page }) => {
  await open(page, ONLY_Q_GRAY);
  const help = page.locator('#lettersHelp');
  await expect(help).toBeHidden();
  await page.getByRole('button', { name: 'About the board and the letters' }).click();
  await expect(help).toBeVisible();
  await expect(help.getByRole('heading')).toHaveText('The board and the letters');
  await expect(help.locator('dt')).toHaveText(['Keyboard', 'V/C', 'Rank']);
  await help.getByRole('button', { name: 'Close' }).click();
  await expect(help).toBeHidden();
  await page.getByRole('button', { name: 'About the board and the letters' }).click();
  await page.mouse.click(5, 5);  // the backdrop
  await expect(help).toBeHidden();
  await page.getByRole('button', { name: 'About the board and the letters' }).click();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

test('every section has a help button that opens its own popup', async ({ page }) => {
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await openTables(page);
  const helps = [
    ['About entering clues', 'Entering clues'],
    ['About the board and the letters', 'The board and the letters'],
    ['About the arrangements', 'Legal arrangements'],
    ['About the grid', 'Where each letter can go'],
    ['About Reference tables', 'Reference tables'],
  ];
  await expect(page.locator('[data-help]')).toHaveCount(helps.length);
  for (const [button, heading] of helps) {
    await page.getByRole('button', { name: button, exact: true }).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading')).toHaveText(heading);
    // With a mouse, instructions say Click.
    await expect(dialog).not.toContainText(/\btap\b/i);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  }
});

test('on a touch screen, instructions say Tap and the list caption says Long tap', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
  const phone = await context.newPage();
  await phone.goto('http://127.0.0.1:4173/?green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await expect(phone.locator('#boardNote')).toContainText('Tap an empty slot, then a letter below, to fill it.');
  await expect(phone.locator('#listCaption')).toHaveText('Tap one to put it on the board. Long tap to see all matching words.');
  await expect(phone.locator('#summaryCaption')).toContainText('Tap a number to pin the letter there; tap a letter');
  await expect(phone.locator('#gridHelp')).toContainText('Tap a number to pin the letter there');
  await context.close();
});

test('letters panel defaults to the keyboard view and remembers a change', async ({ page }) => {
  await open(page, ONLY_Q_GRAY);
  const pressed = page.locator('#lettersSeg [aria-pressed="true"]');
  await expect(pressed).toHaveText('Keyboard');
  await expect(page.locator('#lettersBody .kb-row')).toHaveCount(3);
  await page.locator('#lettersSeg').getByRole('button', { name: 'Vowels and consonants (V/C)', exact: true }).click();
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

test('Rank letters view ranks over the answers that fit the clues, grays last and disabled; the reference table is over all answers', async ({ page }) => {
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&gray=EZ');
  const fits = fitting({ gray: 'EZ' });
  const share = l => fits.filter(w => w.includes(l)).length;
  const expected = rankOf(fits, 'EZ');
  await page.locator('#lettersSeg').getByRole('button', { name: 'Rank', exact: true }).click();
  await expect(page.locator('#lettersBody .key')).toHaveText(expected);
  await expect(page.locator('#lettersBody .vc-label')).toHaveText(['Top 12', '', 'Then']);
  await expect(page.locator('#rankNote')).toHaveText(`Ranked over the ${fits.length} answers that fit your clues.`);
  await expect(letter(page, 'E')).toBeDisabled();
  expect(expected.slice(-2).sort()).toEqual(['E', 'Z']);
  await expect(letter(page, expected[1])).toHaveAttribute('title',
    `Click to try ${expected[1]} in the chosen slot, or the first blank one that allows it. ${expected[1]} is in ${percent(share(expected[1]), fits.length)} of the answers that fit your clues.`);
  await letter(page, expected[1]).click();
  await expect(page.locator('#board .trial')).toHaveCount(1);

  // The reference table is over every answer, whatever the clues.
  const all = l => answerWords.filter(w => w.includes(l)).length;
  const overall = rankOf(answerWords);
  await openTables(page);
  await expect(page.locator('#rankTable .rank-cell')).toHaveText(overall.map(l => `${l}${percent(all(l), answerWords.length)}`));
  await expect(page.locator('#rankTable .rank-row')).toHaveCount(4);
  await expect(page.locator('#rankCaption')).toContainText(`top 12 are ${overall.slice(0, 6).join('')} ${overall.slice(6, 12).join('')}`);
  const through = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'words', 'answers-sources.json'), 'utf8')).nyt.throughDate;
  const shown = await page.evaluate(d => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), through);
  expect(shown).toContain(through.slice(0, 4));
  await expect(page.locator('#rankThrough')).toHaveText(`Published answers through ${shown}.`);
});

test('tapping a letter in the grid groups the whole list by where it goes', async ({ page }) => {
  // A, E and R each yellow in one slot: 3 movable tiles in 5 slots.
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban0=A&ban1=E&ban2=R&yellow=AER');
  const label = l => page.locator('#summary .sum-label', { hasText: new RegExp(`^${l}$`) });
  const heads = page.locator('#list .group-head');
  const total = await page.locator('#summary .row-grid').first().locator('.sum-cell')
    .evaluateAll(cells => cells.reduce((n, c) => n + (Number(c.textContent) || 0), 0));
  expect(total).toBeGreaterThan(24);  // collapsed until shown
  await expect(page.locator('#summaryCaption')).toHaveText(
    `Where each letter can go in the ${total} arrangements. Click a number to pin the letter there; click a letter to sort the list by it.`);
  await expect(page.locator('#list .arr')).toHaveCount(0);

  // Screen readers get each cell's letter, slot and count.
  await expect(page.locator('#summary .sum-cell[aria-label="E, slot 2: 0 arrangements"]')).toHaveCount(1);  // E was yellow there
  await expect(page.locator('#summary .sum-cell[aria-label^="E, slot 1: "]')).not.toHaveAttribute('aria-label', /: 0 /);
  await label('E').click();
  await expect(label('E')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#list .arr')).toHaveCount(total);
  const texts = await heads.allTextContents();
  expect(texts.length).toBeGreaterThan(1);
  for (const t of texts) expect(t).toMatch(/^E in slot \d · \d+$/);
  // A group heading still pins.
  await heads.first().click();
  await expect(page.locator('#list .arr')).toHaveCount(Number(texts[0].split('· ')[1]));
  await heads.first().click();

  await label('R').click();
  await expect(label('E')).toHaveAttribute('aria-pressed', 'false');
  for (const t of await heads.allTextContents()) expect(t).toMatch(/^R in /);
  await label('R').click();
  await expect(label('R')).toHaveAttribute('aria-pressed', 'false');
  for (const t of await heads.allTextContents()) expect(t).not.toMatch(/^R in /);
});

test('arrangement list comes before the grid; the swap link reverses that and is remembered', async ({ page }) => {
  // Three yellows give more arrangements than the list shows before "Show all".
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban0=A&ban1=E&ban2=R&yellow=AER');
  const listFirst = () => page.evaluate(() =>
    !!($('listWrap').compareDocumentPosition($('summaryWrap')) & Node.DOCUMENT_POSITION_FOLLOWING));
  const swap = page.locator('#swapResultsBtn');
  expect(await listFirst()).toBe(true);
  await expect(swap).toHaveText('Put grid first');
  // The switch is the last thing in the panel, under the list and the grid whichever is first.
  const swapLast = () => page.evaluate(() => $('resultsBody').lastElementChild === $('swapResultsBtn'));
  expect(await swapLast()).toBe(true);
  await expect(page.locator('#listCaption')).toContainText('Click a number in the grid below');

  await swap.click();
  expect(await listFirst()).toBe(false);
  expect(await swapLast()).toBe(true);
  await expect(swap).toHaveText('Put list first');
  await expect(page.locator('#listCaption')).toContainText('Click a number in the grid above');

  await page.reload();
  await expect(swap).toHaveText('Put list first');
  expect(await listFirst()).toBe(false);
  await swap.click();
  expect(await listFirst()).toBe(true);
});

test('the clues card shows one thing at a time: the ways in, the guess editor, then the summary; the other panels wait for the clues', async ({ page }) => {
  await open(page);
  const el = id => page.locator(`#${id}`);
  const body = el;
  const toggle = name => page.getByRole('button', { name, exact: true });
  const others = ['boardPanel', 'resultsPanel', 'analysisPanel'];
  const use = page.getByRole('button', { name: 'Use these clues', exact: true });

  // With no clues the card is the only panel, offering the four ways in.
  await expect(el('cluesTitle')).toHaveText('Enter your clues');
  await expect(page.locator('#cluesToolbar button')).toHaveText(['Paste screenshot', 'Choose image', 'Type clues', 'Practice puzzle']);
  await expect(el('pasteBtn')).toHaveClass(/primary/);
  for (const id of ['cluesBody', 'cluesDone', ...others]) await expect(el(id)).toBeHidden();

  // Type clues puts the guess editor in the card. Nothing else shows until the clues are used.
  await typeClues(page);
  await expect(el('chooser')).toBeHidden();
  await expect(el('cluesBody')).toBeVisible();
  await expect(page.locator('#guessInput')).toBeFocused();
  await expect(use).toBeDisabled();
  await typeGuess(page, 1, 'bezil', '20000');
  await expect(use).toBeEnabled();
  for (const id of others) await expect(el(id)).toBeHidden();
  // Cancel goes back to the ways in, with nothing kept.
  await cancel(page);
  await expect(el('chooser')).toBeVisible();
  await expectClues(page, NO_CLUES);
  await typeClues(page);
  expect(await guessWords(page)).toEqual(['·····']);

  await typeGuess(page, 1, 'bezil', '21000');
  await useClues(page);
  await expect(el('cluesTitle')).toHaveText('Your clues');
  await expect(el('cluesBody')).toBeHidden();
  await expect(el('cluesSummary')).toBeVisible();
  for (const id of others) await expect(el(id)).toBeVisible();
  await expect(body('boardBody')).toBeVisible();
  await expect(body('resultsBody')).toBeVisible();
  await expect(arrangements(page)).toHaveCount(3);

  // One panel holds the board and, under it, the arrangements; nothing in it folds.
  await expect(page.getByRole('heading', { name: 'Try letters on the board', exact: true })).toBeVisible();
  expect(await page.evaluate(() => $('boardPanel').contains($('resultsPanel')))).toBe(true);
  await expect(page.locator('#boardPanel button[aria-expanded]')).toHaveCount(0);
  await expect(page.locator('#resultsTitle')).toHaveText('3 legal arrangements of your yellow tiles');

  // Edit clues reopens the editor on the guesses. Cancel drops the changes and returns to the summary.
  await editClues(page);
  await expect(el('cluesBody')).toBeVisible();
  for (const id of others) await expect(el(id)).toBeHidden();
  expect(await guessWords(page)).toEqual(['BEZIL', '·····']);
  await expect(guessTile(page, 1, 2)).toHaveClass(/yellow/);
  await typeGuess(page, 2, 'stone', '00001');
  await cancel(page);
  await expect(el('cluesSummary')).toBeVisible();
  await expectClues(page, { green: 'B????', yellow: '- E - - -', gray: 'ILZ' });
  await expect(arrangements(page)).toHaveCount(3);
  await editClues(page);
  expect(await guessWords(page)).toEqual(['BEZIL', '·····']);
  await typeGuess(page, 2, 'stone', '00001');
  await useClues(page);
  await expectClues(page, { green: 'B????', yellow: '- E - - E', gray: 'ILNOSTZ' });
  await expect(page.locator('#clueOut .mini span')).toHaveText([...'ILNOSTZ']);
  await expect(arrangements(page)).toHaveCount(2);

  // Start over goes back to the ways in and takes the other panels away.
  await startOver(page);
  await expect(el('chooser')).toBeVisible();
  await expect(el('cluesTitle')).toHaveText('Enter your clues');
  for (const id of others) await expect(el(id)).toBeHidden();
  await expectClues(page, NO_CLUES);
  await page.reload();
  await expect(el('chooser')).toBeVisible();

  // With no yellow letter there is nothing to arrange, and that panel says so; nor is there
  // anything to rule out of a slot.
  await open(page, '?green=B%3F%3F%3F%3F&gray=ST');
  await expect(el('boardBans')).toBeHidden();
  await expect(el('arrNav')).toBeHidden();
  await expect(body('boardBody')).toBeVisible();
  await expect(el('resultsTitle')).toHaveText('Your clues have no yellow letters to arrange.');
  await expect(el('listWrap')).toBeHidden();
  await expect(el('summaryWrap')).toBeHidden();

  // A practice puzzle is redrawn, not edited; other guesses can be edited; clues from a
  // link with no guesses can only be started over.
  await open(page, '?guesses=CRANE01001.BEEFY22002&practice=1');
  await expect(toggle('New puzzle')).toBeVisible();
  await expect(toggle('Edit clues')).toBeHidden();
  await open(page, '?guesses=CRANE01001.BEEFY22002');
  await expect(toggle('Edit clues')).toBeVisible();
  await expect(toggle('New puzzle')).toBeHidden();
  await open(page, '?green=B%3F%3F%3F%3F&gray=ST');
  await expect(toggle('Edit clues')).toBeHidden();
  await expect(toggle('New puzzle')).toBeHidden();
  await expect(toggle('Start over')).toBeVisible();

  // Opened from a link, the clues came in whole: the card is their summary.
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&ban2=R&yellow=ER&gray=STLN');
  await expect(body('cluesBody')).toBeHidden();
  // In is a stack: a column per slot with its green letter, else the letters that were
  // yellow there piled up, else a dot. Out is the gray letters, in alphabetical order.
  await expect(page.locator('#cluesSummary .row-label:visible')).toHaveText(['In', 'Out']);
  const column = i => page.locator('#clueIn .clue-stack .mini').nth(i).locator('span');
  await expect(page.locator('#clueIn .clue-stack .mini')).toHaveCount(5);
  await expect(column(0)).toHaveText(['B']);
  await expect(column(1)).toHaveText(['E']);
  await expect(column(2)).toHaveText(['R']);
  await expect(column(3)).toHaveText(['·']);
  await expect(column(4)).toHaveText(['·']);
  await expect(column(0).first()).toHaveClass('g');
  await expect(column(1).first()).toHaveClass('y');
  await expect(column(1).first()).toHaveAttribute('title', 'E was yellow in slot 2');
  await expect(page.locator('#clueOut .mini span')).toHaveText(['L', 'N', 'S', 'T']);
  // A green slot shows only its green, whatever was yellow there before; a letter yellow in
  // two slots is in both columns and, counted twice, gets a ×2 chip.
  await open(page, '?green=%3F%3F%3FS%3F&ban1=E&ban3=ED&ban4=E&yellow=ED&gray=TLN');
  await expect(page.locator('#clueIn .clue-stack .mini')).toHaveCount(5);
  await expect(column(1)).toHaveText(['E']);
  await expect(column(3)).toHaveText(['S']);
  await expect(column(3).first()).toHaveClass('g');
  await expect(column(4)).toHaveText(['E']);
  await expect(page.locator('#clueIn > .mini')).toHaveCount(0);
  await open(page, '?green=%3F%3F%3FS%3F&ban1=E&ban3=ED&ban4=E&yellow=EED&gray=TLN');
  await expect(page.locator('#clueIn > .mini')).toHaveCount(1);
  await expect(page.locator('#clueIn > .mini').locator('span')).toHaveText(['E×2']);
  // With no green letter, the yellows alone make the stack.
  await open(page, '?green=%3F%3F%3F%3F%3F&ban1=E&yellow=E&gray=ST');
  await expect(column(1)).toHaveText(['E']);
  await expect(column(0)).toHaveText(['·']);
  await expect(body('boardBody')).toBeVisible();
  await expect(body('resultsBody')).toBeVisible();
});

test('Back leaves the guess editor as Cancel does, and the editor leaves no step behind in the history', async ({ page }) => {
  await open(page);
  const depth = () => page.evaluate(() => history.length);
  const start = await depth();
  // From the ways in: Back returns to them, the page stays, nothing is kept.
  await typeClues(page);
  expect(await page.evaluate(() => history.state)).toEqual({ editor: true });
  await page.keyboard.type('crane');
  await page.goBack();
  await expect(page.locator('#chooser')).toBeVisible();
  await expectClues(page, NO_CLUES);
  expect(new URL(page.url()).pathname).toBe('/');

  // Use these clues and Cancel take the editor's step back out themselves.
  await typeClues(page);
  await typeGuess(page, 1, 'bezil', '21000');
  await useClues(page);
  await expect(page.locator('#cluesSummary')).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state)).toBeNull();
  await editClues(page);
  await cancel(page);
  await expect(page.locator('#cluesSummary')).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state)).toBeNull();

  // From the summary: Back out of the editor returns to the summary, changes dropped.
  await editClues(page);
  await typeGuess(page, 2, 'stone', '00001');
  await page.goBack();
  await expect(page.locator('#cluesSummary')).toBeVisible();
  await expectGuesses(page, ['BEZIL']);
  // And the editor still opens and cancels as before after all that.
  await editClues(page);
  expect(await guessWords(page)).toEqual(['BEZIL', '·····']);
  await cancel(page);
  await expect(page.locator('#cluesSummary')).toBeVisible();
  expect(await depth()).toBeLessThanOrEqual(start + 1);
});

test('Start over can be undone from the ways in, until other clues are used or the page is left', async ({ page }) => {
  await open(page, '?guesses=CRANE01001.BEEFY22002.SLATE00000');
  const undoLine = page.locator('#undoLine');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  // Something of each kind to get back: an earlier guess shown, the second arrangement on the board, a tried letter.
  await guessWord(page, 'BEEFY').click();
  await page.getByRole('button', { name: 'Next arrangement', exact: true }).click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 2 of 2');
  await letter(page, 'O').click();
  await expect(page.locator('#board .trial')).toHaveText(['O']);
  const before = await page.evaluate(() => $('board').textContent);

  await startOver(page);
  await expect(page.locator('#chooser')).toBeVisible();
  await expect(undoLine).toHaveText('Clues cleared. Undo');
  await expectClues(page, NO_CLUES);
  // Looking at the editor and backing out doesn't take the offer away.
  await typeClues(page);
  await expect(undoLine).toBeHidden();
  await cancel(page);
  await expect(undoLine).toBeVisible();

  await undo.click();
  await expect(page.locator('#cluesSummary')).toBeVisible();
  await expect(undoLine).toBeHidden();
  await expectGuesses(page, ['CRANE', 'BEEFY', 'SLATE'], 2);
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 2 of 2');
  await expect(page.locator('#board .trial')).toHaveText(['O']);
  expect(await page.evaluate(() => $('board').textContent)).toBe(before);
  // It is saved again, too.
  await page.reload();
  await expectGuesses(page, ['CRANE', 'BEEFY', 'SLATE'], 2);

  // Other clues used after a Start over leave nothing to undo but themselves.
  await startOver(page);
  await typeClues(page);
  await typeGuess(page, 1, 'bodil', '20000');
  await useClues(page);
  await startOver(page);
  await undo.click();
  await expectGuesses(page, ['BODIL']);
  await expectClues(page, { green: 'B????' });
  // The offer doesn't outlast the page.
  await startOver(page);
  await expect(undoLine).toBeVisible();
  await page.reload();
  await expect(page.locator('#chooser')).toBeVisible();
  await expect(undoLine).toBeHidden();
});

test('first-time tips show one at a time, in order, and are remembered; help can bring them back', async ({ page }) => {
  // Once, on the first load: after that the app's own record of seen tips must survive reloads.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test-tips')) return;
    sessionStorage.setItem('test-tips', 'on');
    localStorage.removeItem('wordle-sandbox-tips-seen');
  });
  await open(page);
  const tip = page.locator('.tip');
  const gotIt = () => tip.getByRole('button', { name: 'Got it' }).click();
  // First, what the tool is for, right under the subtitle.
  await expect(tip).toHaveAttribute('data-tip', 'intro');
  await expect(tip).toContainText('Stuck on a Wordle?');
  expect(await page.evaluate(() => $('subtitle').nextElementSibling.classList.contains('tip'))).toBe(true);
  await gotIt();
  // Nothing more until the clues are in: the guess editor explains itself.
  await expect(tip).toHaveCount(0);
  await typeClues(page);
  await expect(tip).toHaveCount(0);

  // The board's tip waits for the board, which comes with the summary.
  await typeGuess(page, 1, 'bodil', '20000');
  await expect(tip).toHaveCount(0);
  await useClues(page);
  await expect(tip).toHaveAttribute('data-tip', 'board');
  await expect(tip).toContainText('Your green letters are in place');
  await editClues(page);
  await expect(tip).toHaveCount(0);
  await typeGuess(page, 2, 'femur', '01000');
  await useClues(page);
  await expect(tip).toHaveCount(1);  // the board tip again: one at a time
  await expect(tip).toHaveAttribute('data-tip', 'board');
  await gotIt();
  await expect(tip).toHaveAttribute('data-tip', 'list');
  await expect(tip).toContainText('Click one to put it on the board');
  await gotIt();
  await expect(tip).toHaveCount(0);

  await page.reload();
  await expect(tip).toHaveCount(0);
  await page.getByRole('button', { name: 'About entering clues', exact: true }).click();
  await page.getByRole('button', { name: 'Show the first-time tips again' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(tip).toHaveAttribute('data-tip', 'intro');
  await gotIt();
  await expect(tip).toHaveAttribute('data-tip', 'board');

  // A fresh visit with clues already in (a link): the intro was dismissed above.
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await expect(tip).toHaveAttribute('data-tip', 'board');
  await expect(tip).toContainText('This is one way your yellow letters could fit');
  await expect(tip).toContainText('Cycle through the legal arrangements with the ‹ and › arrows above it.');
});

test('board: a chosen slot takes the next letter, × removes a tried one, and the note says which arrangement is showing', async ({ page }) => {
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&ban2=R&yellow=ER');
  // Above the board: which arrangement it shows, then in yellow over each open slot the
  // letters that were yellow there. The board itself is just its five slots, with the note under it.
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 1 of 7');
  await expect(page.locator('#boardNote')).toHaveText('Click an empty slot, then a letter below, to fill it.');
  await expect(page.locator('#boardBans span')).toHaveText(['', 'E', 'R', '', '']);
  await expect(page.locator('#boardBans span').nth(1)).toHaveAttribute('aria-label', 'Slot 2: not E');
  await expect(page.locator('#board > *')).toHaveCount(5);
  expect(await page.evaluate(() => [$('arrNav'), $('boardBans'), $('board'), $('boardNote')]
    .every((el, i, all) => !i || all[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const slotBox = await boardSlot(page, 2).boundingBox();
  const banBox = await page.locator('#boardBans span').nth(1).boundingBox();
  expect(Math.abs((banBox.x + banBox.width / 2) - (slotBox.x + slotBox.width / 2))).toBeLessThan(1);
  // ‹ › cycle through the list in its order, wrapping at the ends, outlining the one on the board.
  const prev = page.getByRole('button', { name: 'Previous arrangement', exact: true });
  const next = page.getByRole('button', { name: 'Next arrangement', exact: true });
  await next.click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 2 of 7');
  await expect(page.locator('#list .arr.current')).toHaveText(await page.evaluate(() => shownOrder[1].replaceAll('?', '·')));
  for (let n = 0; n < 5; n++) await next.click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 7 of 7');
  await next.click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 1 of 7');
  await prev.click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 7 of 7');
  for (let n = 0; n < 6; n++) await prev.click();
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 1 of 7');
  // Two blank slots, wherever the first arrangement leaves them: choose the last one.
  const blanks = await page.locator('#board .slot.choosable').evaluateAll(els => els.map(el => Number(el.dataset.pos) + 1));
  expect(blanks).toHaveLength(2);
  const [first, last] = blanks;
  await boardSlot(page, last).click();
  await expect(boardSlot(page, last)).toHaveClass(/selected/);
  await letter(page, 'A').click();
  await expect(boardSlot(page, last)).toHaveText('A');
  await expect(boardSlot(page, last)).not.toHaveClass(/selected/);
  // The choice moves on to the next blank slot after it; there is none, so the next letter takes the first blank.
  await letter(page, 'O').click();
  await expect(boardSlot(page, first)).toHaveText('O');
  await page.getByRole('button', { name: `Remove A from slot ${last}` }).click();
  await expect(page.locator('#board .trial')).toHaveText(['O']);
  await expect(boardSlot(page, last)).toHaveClass(/selected/);  // ready for another letter there
  // A chosen slot takes the letter even where it was yellow; the conflict is shown.
  await boardSlot(page, last).click();  // unchoose
  await page.getByRole('button', { name: `Remove O from slot ${first}` }).click();

  // Moving a tile keeps the list's outline on the arrangement now on the board.
  const current = page.locator('#list .arr.current');
  const before = await current.textContent();
  // The dragged tile lands with a short animation (the class is on the tile the move rendered).
  await page.evaluate(() => { window.landedSeen = 0; new MutationObserver(() =>
    { window.landedSeen = Math.max(window.landedSeen, document.querySelectorAll('#board .tile.landed').length); })
    .observe($('board'), { childList: true, subtree: true }); });
  await page.locator('#board .yellow').first().dragTo(boardSlot(page, last));
  await expect(current).not.toHaveText(before);
  await expect(page.locator('#arrIndex')).toHaveText(/^Arrangement \d of \d+$/);
  expect(await page.evaluate(() => window.landedSeen)).toBe(1);

  // A chosen slot takes the letter even where it was yellow; the conflict is shown.
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&yellow=E');
  await boardSlot(page, 2).click();   // E was yellow here, so it is blank
  await expect(boardSlot(page, 2)).toHaveClass(/selected/);
  await letter(page, 'E').click();
  await expect(boardSlot(page, 2).locator('.conflict')).toHaveText('E');
  await expect(page.locator('#boardStatus')).toContainText("E can't go in slot 2");
  // One tile, three places: the index stays, next to the conflict.
  await expect(page.locator('#arrIndex')).toHaveText(/^Arrangement \d of 3$/);
});

test('a gray letter stays off the board, and holding or right-clicking a letter changes nothing', async ({ page }) => {
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&yellow=E&gray=S');
  await expect(page.locator('#lettersTitle')).toHaveText('25 available letters');
  await expect(letter(page, 'S')).toHaveAttribute('aria-disabled', 'true');
  await expect(letter(page, 'S')).toHaveAttribute('title', 'S is gray');
  await letter(page, 'S').click({ force: true });  // force: it is aria-disabled
  await expect(page.locator('#board .trial')).toHaveCount(0);
  // Grays come only from the guesses now.
  await letter(page, 'T').click({ button: 'right' });
  await letter(page, 'A').hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expectClues(page, { gray: 'S' });
  await expect(page.locator('#lettersTitle')).toHaveText('25 available letters');
});

test('arrangements no word fits are hidden by default; Dim is remembered; the old key is ignored', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test-wordmode')) return;
    sessionStorage.setItem('test-wordmode', 'on');
    localStorage.removeItem('wordle-sandbox-nonword-mode-2');
    localStorage.setItem('wordle-sandbox-nonword-mode', 'dim');   // from before Hide was the default
  });
  await page.route('**/words/5.txt', route => route.fulfill({ body: 'APPLE\nAMPLE\n', contentType: 'text/plain' }));
  await open(page, P_YELLOW);
  const mode = name => page.locator('#wordNote').getByRole('button', { name, exact: true });
  await expect(mode('Hide')).toHaveAttribute('aria-pressed', 'true');
  await expect(arrangements(page)).toHaveCount(2);
  await expect(page.locator('#wordNoteText')).toHaveText('2 of 4 fit no known word:');
  await expect(page.locator('#resultsTitle')).toHaveText('2 legal arrangements of your yellow tiles');
  await expect(page.locator('#arrIndex')).toHaveText('Arrangement 1 of 2');
  expect(await page.evaluate(() => localStorage.getItem('wordle-sandbox-nonword-mode'))).toBeNull();

  await mode('Dim').click();
  await expect(arrangements(page)).toHaveCount(4);
  await expect(page.locator('#list .arr.noword')).toHaveCount(2);
  await page.reload();
  await expect(mode('Dim')).toHaveAttribute('aria-pressed', 'true');
  await expect(arrangements(page)).toHaveCount(4);
});

test('dev panel: ?dev=1 turns it on and is remembered, Phone width previews the page in a frame, Off turns it off', async ({ page }) => {
  await open(page);
  await expect(page.locator('#devPanel')).toBeHidden();
  await open(page, '?dev=1');
  await expect(page.locator('#devPanel')).toBeVisible();
  expect(await page.evaluate(() => location.search)).toBe('');   // the parameter is dropped once read
  await open(page);
  await expect(page.locator('#devPanel')).toBeVisible();

  // Phone width shows the page again in a phone-sized frame, opened on the clues of the
  // moment and kept in step with them; the width picker resizes it; it survives a reload.
  const frame = page.locator('#phoneFrame');
  const inner = page.frameLocator('#phoneFrame iframe');
  await expect(frame).toBeHidden();
  await typeClues(page);
  await typeGuess(page, 1, 'bodil', '20000');
  await useClues(page);
  const phone = page.getByRole('switch', { name: 'Phone width' });
  await phone.click();
  await expect(phone).toHaveAttribute('aria-checked', 'true');
  await expect(frame).toBeVisible();
  expect(await frame.evaluate(el => el.clientWidth)).toBe(390);
  expect(await inner.locator('#cluesToolbar').evaluate(el => getComputedStyle(el).flexDirection)).toBe('column');   // the narrow layout
  await expect(inner.locator('#devPanel')).toBeHidden();            // no panel within the preview
  const innerColumn = i => inner.locator('#clueIn .clue-stack .mini').nth(i - 1).locator('span');
  await expect(innerColumn(1)).toHaveText(['B']);   // the preview opened on a clue link, so on the summary
  await editClues(page);
  await typeGuess(page, 2, 'femur', '01000');
  await useClues(page);
  await expect(innerColumn(2)).toHaveText(['E']);
  // And back: guesses edited in the preview reach the page.
  await inner.getByRole('button', { name: 'Edit clues', exact: true }).click();
  await expect(inner.locator('#guessInput')).toBeFocused();
  await page.keyboard.type('stank');
  const innerTile = inner.locator('#guessRows .guess-row').nth(2).locator('.guess-tile').nth(2);
  await innerTile.click();
  await innerTile.click();
  await inner.getByRole('button', { name: 'Use these clues', exact: true }).click();
  await expectClues(page, { green: 'B?A??' });
  await page.locator('#devPhoneSeg button[data-width="430"]').click();
  expect(await frame.evaluate(el => el.clientWidth)).toBe(430);
  await open(page);
  await expect(frame).toBeVisible();
  expect(await frame.evaluate(el => el.clientWidth)).toBe(430);
  await phone.click();
  await expect(frame).toBeHidden();

  // The wording switch reloads with the other word; the state line says which is in force.
  await expect(page.locator('#devState')).toContainText('Click wording');
  await page.locator('#devTouchSeg button[data-touch="tap"]').click();
  await page.waitForLoadState();
  await expect(page.locator('#devState')).toContainText('Tap wording');
  await expect(page.locator('#devTouchSeg button[data-touch="tap"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#devTouchSeg button[data-touch=""]').click();
  await page.waitForLoadState();
  await expect(page.locator('#devState')).toContainText('Click wording');

  // A clue link with the flag loads both; the state line carries the clue link.
  await open(page, '?dev=1&green=B%3F%3F%3F%3F&ban1=E&yellow=E&gray=ST');
  await expectClues(page, { green: 'B????' });
  await expect(page.locator('#devState')).toContainText('?green=B%3F%3F%3F%3F&yellow=E&gray=ST&ban1=E');

  await page.getByRole('button', { name: 'Off', exact: true }).click();
  await page.waitForLoadState();
  await expect(page.locator('#devPanel')).toBeHidden();
  await open(page);
  await expect(page.locator('#devPanel')).toBeHidden();
  await open(page, '?dev=0');
  await expect(page.locator('#devPanel')).toBeHidden();
});

test('Rank view: known letters lead at their share, it follows the clues, and falls back when no answer fits', async ({ page }) => {
  // M green in slot 1, A yellow in slots 3 and 4 (two tiles), E S T gray.
  await open(page, '?len=5&green=M%3F%3F%3F%3F&ban2=A&ban3=A&yellow=AA&gray=EST');
  await page.locator('#lettersSeg').getByRole('button', { name: 'Rank', exact: true }).click();
  const fits = fitting({ green: 'M????', bans: { 2: 'A', 3: 'A' }, yellow: 'AA', gray: 'EST' });
  expect(fits.length).toBeGreaterThan(0);
  expect(fits.every(w => w[0] === 'M' && [...w].filter(l => l === 'A').length >= 2)).toBe(true);
  await expect(page.locator('#lettersBody .key')).toHaveText(rankOf(fits, 'EST'));
  await expect(page.locator('#rankNote')).toHaveText(`Ranked over the ${fits.length} answers that fit your clues.`);
  await expect(page.locator('#lettersBody .key').nth(0)).toHaveClass(/green|yellow/);
  await expect(page.locator('#lettersBody .key').nth(1)).toHaveClass(/green|yellow/);
  await expect(letter(page, 'M')).toHaveAttribute('title', /M is in 100% of the answers that fit your clues\.$/);

  const link = (green, gray) => `?green=${encodeURIComponent(green)}&ban2=A&ban3=A&yellow=AA&gray=${gray}`;
  await open(page, link('M????', 'ESTR'));
  const fewer = fits.filter(w => !w.includes('R'));
  await expect(page.locator('#rankNote')).toHaveText(`Ranked over the ${fewer.length} answers that fit your clues.`);
  await expect(page.locator('#lettersBody .key')).toHaveText(rankOf(fewer, 'ESTR'));

  // Every letter but M, A and Y gray leaves MAMMA alone; a green Y leaves nothing, and Rank says so.
  await open(page, link('M????', 'BCDFGHJKLNPQRSTVWXYZEIOU'));
  await expect(page.locator('#rankNote')).toHaveText('Ranked over the 1 answers that fit your clues.');
  await open(page, link('MY???', 'BCDFGHJKLNPQRSTVWXYZEIOU'));
  await expect(page.locator('#rankNote')).toHaveText('No answer fits your clues, so this is the order over all answers.');
  await expect(page.locator('#lettersBody .key')).toHaveText(rankOf(answerWords));

  // With no clues at all, the order is over all answers too.
  await startOver(page);
  await expect(page.locator('#rankNote')).toHaveText(`Ranked over all ${answerWords.length} answers.`);
});

test('without the answer list, the reference tables explain and Rank falls back to the built-in order', async ({ page }) => {
  await page.route('**/words/answers.csv', route => route.abort());
  await open(page);
  await expect(page.locator('#chooser')).toBeVisible();
  await expect(page.locator('#randomBtn')).toBeHidden();
  await open(page, ONLY_Q_GRAY);
  await openTables(page);
  await expect(page.locator('#oddsNote')).toHaveText('These tables need the answer list, which didn’t load.');
  await expect(page.locator('#oddsBody')).toBeHidden();
  await page.locator('#lettersSeg').getByRole('button', { name: 'Rank', exact: true }).click();
  await expect(page.locator('#lettersBody .key').first()).toHaveText('E');
  await expect(page.locator('#lettersBody .key')).toHaveCount(26);
  await expect(page.locator('#rankNote')).toHaveText('Ranked over all answers by a built-in order; the answer list didn’t load.');
  await expect(letter(page, 'E')).not.toHaveAttribute('title', /is in/);
});

test('reference tables start closed, open and close, remember the choice, and outline the vowel case the clues match', async ({ page }) => {
  await open(page, '?len=5&green=%3F%3F%3F%3F%3F&ban2=A&yellow=A&gray=EST');
  const toggle = page.locator('#analysisBtn');
  await expect(toggle).toHaveText('Reference tables');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#analysisBody')).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveText('Hide tables');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#rankTable .rank-cell')).toHaveCount(26);

  // The yellow A / gray E cell is the one the clues match; its entries come from the answer list.
  await page.locator('summary', { hasText: 'Every case of one yellow and one gray vowel' }).click();
  const cell = page.locator('#oddsTable .odds-cell[data-yellow="A"][data-gray="E"]');
  await expect(cell).toHaveClass(/current/);
  await expect(page.locator('#oddsTable .odds-cell.current')).toHaveCount(1);
  const { options, count } = expectedOdds('A', 'E');
  const top = options.filter(([label]) => label.length === 1).slice(0, 2);
  const none = options.find(([label]) => label.length > 1);
  await expect(cell.locator('.odds-entry')).toHaveText([...top, ['∅', none[1]]].map(([label, n]) => `${label} ${percent(n, count)}`));
  await expect(cell).toHaveAttribute('title', `A yellow, E gray: ${count} answers`);

  await page.reload();
  await expect(page.locator('#analysisBody')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#analysisBody')).toBeHidden();
  await page.reload();
  await expect(page.locator('#analysisBody')).toBeHidden();
});

test('?view=mobile previews the phone layout and wording at 390px, or a given width; ?view=desktop forces the full width', async ({ page }) => {
  const width = () => page.locator('.app').evaluate(el => el.getBoundingClientRect().width);
  await open(page, '?view=mobile');
  expect(await width()).toBe(390 - 28);
  await expect(page.locator('#viewNote')).toHaveText('Phone preview, 390 px wide, with touch wording. Normal view');
  const direction = () => page.locator('#cluesToolbar').evaluate(el => getComputedStyle(el).flexDirection);
  expect(await direction()).toBe('column');   // the narrow layout stacks the ways to give clues
  await typeClues(page);
  await expect(page.locator('#typeIntro')).toContainText('Then tap its letters');
  await typeGuess(page, 1, 'bodil', '20000');
  await expect(guessTile(page, 1, 1)).toHaveAttribute('title', 'Tap to change the color; hold to clear the letter');
  await expect(page.locator('#holdHint')).toHaveText('Hold a letter to clear it and type another.');
  await useClues(page);
  await expect(page.locator('#boardNote')).toContainText('Tap an empty slot');

  // Beside the column, with room: a ruler of five phones, the fold line on the one nearest 390 wide.
  const ruler = page.locator('#phoneRuler');
  await expect(ruler).toBeVisible();
  await expect(ruler.locator('.phone')).toHaveCount(5);
  await expect(ruler.locator('.label.current')).toContainText('844 iPhone 12 to 14');
  await expect(ruler.locator('.phone.current')).toHaveCount(1);
  const fold = page.locator('#fold');
  await expect(fold).toHaveCSS('top', '844px');
  const app = await page.locator('.app').boundingBox();
  const box = await fold.boundingBox();
  expect(Math.round(box.x)).toBe(Math.round(app.x));
  expect(Math.round(box.width)).toBe(Math.round(app.width));
  expect(Number(await ruler.evaluate(el => parseFloat(el.style.left)))).toBeGreaterThan(app.x + app.width);
  await ruler.locator('.label', { hasText: '667' }).click();
  await expect(fold).toHaveCSS('top', '667px');
  await expect(ruler.locator('.label.current')).toContainText('iPhone SE');
  // The handle drags the screens' top down the page; the fold follows; a double-click resets.
  const grab = ruler.locator('.grab');
  const g = await grab.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 120, { steps: 6 });
  await page.mouse.up();
  await expect(ruler).toHaveCSS('top', '120px');
  await expect(fold).toHaveCSS('top', '787px');
  await expect(page.locator('#rulerNote')).toContainText('The screens’ top is 120 px down the page.');
  await grab.dblclick();
  await expect(ruler).toHaveCSS('top', '0px');
  await expect(fold).toHaveCSS('top', '667px');
  // No room beside the column: the ruler and the line go.
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(ruler).toBeHidden();
  await expect(fold).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(ruler).toBeVisible();

  // Opening a shared link with the preview on keeps it after the link is consumed.
  await open(page, '?green=B%3F%3F%3F%3F&ban1=E&yellow=E&view=mobile-320');
  expect(new URL(page.url()).search).toBe('?view=mobile-320');
  expect(await width()).toBe(320 - 28);
  await expect(page.locator('#viewNote')).toContainText('320 px wide');
  await expectClues(page, { green: 'B????' });

  await open(page, '?view=desktop');
  expect(await width()).toBe(640);
  await expect(page.locator('#viewNote')).toHaveText('Desktop preview, with mouse wording. Normal view');
  expect(await direction()).toBe('row');
  await page.locator('#viewNote a').click();
  await expect(page.locator('#viewNote')).toBeHidden();
  expect(new URL(page.url()).search).toBe('');
});
