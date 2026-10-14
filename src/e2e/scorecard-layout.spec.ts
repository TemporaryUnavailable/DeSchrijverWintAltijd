import { expect, test } from '@playwright/test';

test('five-player table fits a phone viewport and the scorecard footer follows long content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Scorekaarten.' })).toBeVisible();
  await page.getByRole('button', { name: 'Scorekaart maken' }).first().click();
  await page.getByRole('button', { name: 'Speler toevoegen' }).click();
  await page.getByRole('combobox', { name: 'Scoringssysteem' }).click();
  await page.getByRole('option', { name: 'Broederschap Abondance (handmatig)' }).click();

  const names = ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'];
  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
  }
  await page.getByRole('button', { name: 'Scorekaart maken' }).last().click();

  await expect(page.locator('.score-table .player-heading')).toHaveCount(5);
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
    await page.locator('[data-action="save-gift"]').getByText('Gift opslaan').click();
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY > 0)).toBe(true);
  await expect(footer).toBeInViewport();
  await expect.poll(() => footer.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight) < 2)).toBe(true);
  await expect(page.locator('.scorecard-fab')).toBeInViewport();
});