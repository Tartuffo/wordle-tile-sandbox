const { test, expect } = require('@playwright/test');
const path = require('node:path');

const green = (page, slot) => page.getByRole('textbox', { name: `Green letter, slot ${slot}`, exact: true });
const yellow = (page, slot) => page.getByRole('textbox', { name: `Letters that were yellow in slot ${slot}`, exact: true });
const boardSlot = (page, slot) => page.locator(`#board .slot[data-pos="${slot - 1}"]`);
const letter = (page, value) => page.locator('#lettersBody').getByRole('button', { name: value, exact: true });
const arrangements = page => page.locator('#list .arr');
const fixture = name => path.join(__dirname, 'fixtures', name);

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

test('duplicate yellow counts and 5–7 letter lengths', async ({ page }) => {
  await open(page);
  await yellow(page, 1).fill('E');
  await yellow(page, 2).fill('E');
  await page.locator('#tileChips button').click();
  await expect(page.locator('#board .tile.yellow')).toHaveCount(2);
  await expect(arrangements(page)).toHaveCount(3);
  for (const length of [6, 7, 5]) {
    await page.locator('#wordLength').selectOption(String(length));
    await expect(page.locator('#board .slot')).toHaveCount(length);
    await expect(page.locator('.green-cell')).toHaveCount(length);
    await expect(page.locator('.yellow-cell')).toHaveCount(length);
  }
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
  await expect(page.locator('#boardWord')).toHaveText('APPLE ✓ is in the word list');
  await letter(page, 'Z').click();
  await expect(page.locator('#board .trial')).toHaveCount(5);
  await yellow(page, 1).fill('Z');
  await expect(page.locator('#board .yellow')).toHaveText('Z');
  await expect(page.locator('#board .trial')).toHaveCount(4);
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
