import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 412, height: 915 },
]) {
  test(`gift entry fits ${viewport.width}x${viewport.height} without scrolling for every contract`, async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Nieuwe scorekaart maken' }).click();
    await page.getByRole('button', { name: 'Speler toevoegen' }).click();
    await page.getByRole('combobox', { name: 'Scoringssysteem', exact: true }).click();
    await page.getByRole('option', { name: 'Broederschap Abondance', exact: true }).click();
    for (const [index, name] of ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'].entries()) {
      await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
    }
    await page.getByRole('button', { name: 'Scorekaart maken', exact: true }).click();
    await page.getByRole('button', { name: 'Gift toevoegen', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Score invoeren' });
    await page.setViewportSize(viewport);
    for (const contract of [
      'Rik/Afrik', 'Troel', 'Abondance', 'Miserie', 'Twee-speler-Miserie',
      'Open Miserie', '13 slagen', 'Solo slim', 'Verzaking', 'Handmatige invoer',
    ]) {
      await dialog.getByRole('combobox', { name: 'Contract', exact: true }).click();
      await page.getByRole('option', { name: contract, exact: true }).click();
      await expect(page.getByRole('listbox')).not.toBeVisible();
      await expect.poll(() => dialog.evaluate((element) =>
        element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth,
      ), { message: `${contract} fits ${viewport.width}x${viewport.height}` }).toBe(true);
      await expect(dialog).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('button', { name: 'Venster sluiten' })).toBeInViewport({ ratio: 1 });
      await expect(dialog.locator('.score-entry-actions button').last()).toBeInViewport({ ratio: 1 });
      await expect(dialog.locator('.score-preview-row')).toHaveCount(5);
    }

    await page.setViewportSize({ width: 360, height: 740 });
    await dialog.getByRole('spinbutton', { name: 'Punten voor Jules' }).fill('5');
    await dialog.getByRole('button', { name: 'Opslaan met waarschuwing' }).click();
    await expect(dialog.getByRole('alert')).toContainText('niet in balans');
    await expect(dialog.getByRole('button', { name: 'Toch handmatig opslaan' })).toBeInViewport({ ratio: 1 });
    await dialog.getByRole('button', { name: 'Toch handmatig opslaan' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.score-table tbody tr')).toHaveCount(2);
  });
}

test('five-player table fits a phone viewport and the scorecard footer follows long content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Scorekaarten.' })).toBeVisible();
  await page.getByRole('button', { name: 'Scorekaart maken' }).first().click();
  await page.getByRole('button', { name: 'Speler toevoegen' }).click();
  await page.getByRole('combobox', { name: 'Scoringssysteem' }).click();
  await page.getByRole('option', { name: 'Broederschap Abondance', exact: true }).click();

  const names = ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'];
  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
  }
  await page.getByRole('button', { name: 'Scorekaart maken' }).last().click();

  await expect(page.locator('.score-table .player-heading')).toHaveCount(5);
  const table = page.locator('.score-table');
  const tableColors = () => table.locator('th, td, span, button, svg').evaluateAll((elements) =>
    [...new Set(elements.filter((element) => !element.closest('.dealer-sit-out'))
      .map((element) => getComputedStyle(element).color))],
  );
  await expect.poll(tableColors).toEqual(['rgb(0, 0, 0)']);
  const footer = page.locator('.scorecard-footer');
  await expect(footer).toBeVisible();
  await page.setViewportSize({ width: 360, height: 1200 });
  await expect.poll(() => footer.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight) < 2)).toBe(true);
  await page.setViewportSize({ width: 412, height: 915 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const tableScroll = page.locator('.table-scroll');
  await expect.poll(() => tableScroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  for (let gift = 0; gift < 15; gift++) {
    await footer.getByRole('button', { name: 'Gift toevoegen' }).click();
    await page.getByRole('button', { name: 'Handmatig invoeren' }).click();
    if (gift === 0) {
      const activeScores = page.locator('.manual-score-list input[type="number"]:enabled');
      await activeScores.nth(0).fill('10');
      await activeScores.nth(1).fill('-10');
    }
    await page.locator('[data-action="save-gift"]').getByText('Gift opslaan').click();
  }
  await footer.getByRole('button', { name: 'Giftdetails tonen' }).click();
  await footer.getByRole('button', { name: 'Bewerk- en verwijderknoppen tonen' }).click();
  await expect(table.locator('.score-gain')).toHaveText('+10');
  await expect(table.locator('.score-loss')).toHaveText('-10');
  await expect.poll(tableColors).toEqual(['rgb(0, 0, 0)']);
  await expect(table.locator('.dealer-sit-out').first()).toHaveCSS('color', 'rgb(97, 97, 97)');
  await expect(table.locator('.dealer-sit-out .score-value').first()).toHaveCSS('color', 'rgb(97, 97, 97)');
  await expect(table.locator('.dealer-sit-out .dealer-mark').first()).toHaveCSS('color', 'rgb(97, 97, 97)');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY > 0)).toBe(true);
  await expect(footer).toBeInViewport();
  await expect.poll(() => footer.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight) < 2)).toBe(true);
  await expect(page.locator('.scorecard-fab')).toBeInViewport();
});