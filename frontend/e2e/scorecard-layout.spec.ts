import { expect, test } from '@playwright/test';

test('keeps the light palette and native controls when the phone prefers dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Rechtshandig', exact: true }).click();
  await page.getByRole('button', { name: 'Nieuwe scorekaart maken' }).click();
  await expect(page.getByLabel('Naam speler 1')).toBeVisible();

  const colors = () => page.locator('html, body, .setup-form, .draft-player input').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      const palette = Array.from(style)
        .filter((name) => name.startsWith('--md-sys-color-'))
        .sort()
        .map((name) => style.getPropertyValue(name));
      return [style.color, style.backgroundColor, style.colorScheme, ...palette];
    }),
  );
  const lightColors = await colors();

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light only');
  await expect.poll(colors).toEqual(lightColors);
});

for (const viewport of [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 412, height: 892 },
]) {
  test(`gift entry fits ${viewport.width}x${viewport.height} without scrolling for every contract`, async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Rechtshandig', exact: true }).click();
    await page.getByRole('button', { name: 'Nieuwe scorekaart maken' }).click();
    await page.getByRole('button', { name: 'Speler toevoegen' }).click();
    await page.locator('input[role="combobox"][aria-label="Scoringssysteem"]').click();
    await page.getByRole('option', { name: 'Broederschap Abondance', exact: true }).click();
    for (const [index, name] of ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'].entries()) {
      await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
    }
    await page.getByRole('button', { name: 'Scorekaart maken', exact: true }).click();
    await page.getByRole('button', { name: 'Gift toevoegen', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Score invoeren' });
    await expect(dialog.locator('input[aria-label="Contract"]')).toHaveCSS('border-radius', '10px');
    await expect(dialog.locator('.score-preview-row').first()).toHaveCSS('border-top-color', 'rgb(107, 64, 151)');
    await expect(dialog.locator('.score-preview-row strong').first()).toHaveCSS('color', 'rgb(79, 33, 122)');
    await expect(dialog.locator('input[type="range"]').first()).toHaveCSS('accent-color', 'rgb(233, 30, 99)');
    await page.setViewportSize(viewport);
    for (const contract of [
      'Rik/Afrik', 'Troel', 'Abondance', 'Miserie', 'Twee-speler-Miserie',
      'Open Miserie', '13 slagen', 'Solo slim', 'Verzaking', 'Handmatige invoer',
    ]) {
      await dialog.locator('input[role="combobox"][aria-label="Contract"]').click();
      await page.getByRole('option', { name: contract, exact: true }).click();
      await expect(page.getByRole('listbox')).not.toBeVisible();
      await expect.poll(() => dialog.evaluate((element) =>
        element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth,
      ), { message: `${contract} fits ${viewport.width}x${viewport.height}` }).toBe(true);
      await expect(dialog).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('button', { name: 'Venster sluiten' })).toBeInViewport({ ratio: 1 });
      await expect(dialog.locator('.score-entry-actions button').last()).toBeInViewport({ ratio: 1 });
      const actions = dialog.locator('.score-entry-actions');
      const actionBox = await actions.boundingBox();
      const buttons = await actions.locator('button').all();
      let previousBottom = 0;
      for (const button of buttons) {
        await expect(button).toHaveCSS('justify-content', 'center');
        await expect(button).toHaveCSS('text-align', 'center');
        const box = (await button.boundingBox())!;
        expect(Math.abs(box.width - actionBox!.width)).toBeLessThan(1);
        expect(box.y).toBeGreaterThanOrEqual(previousBottom);
        previousBottom = box.y + box.height;
      }
      if (await actions.locator('[data-action="manual-entry"]').count()) {
        await expect(actions.locator('button').first()).toHaveText('Handmatig invoeren');
      }
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
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Rechtshandig', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Scorekaarten.' })).toBeVisible();
  await page.getByRole('button', { name: 'Scorekaart maken' }).first().click();
  await page.getByRole('button', { name: 'Speler toevoegen' }).click();
  await page.locator('input[role="combobox"][aria-label="Scoringssysteem"]').click();
  await page.getByRole('option', { name: 'Broederschap Abondance', exact: true }).click();

  const names = ['Noor', 'Jules', 'Sam', 'Mila', 'Pim'];
  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
  }
  await page.getByRole('button', { name: 'Scorekaart maken' }).last().click();

  await expect(page.locator('.score-table .player-heading')).toHaveCount(5);
  const deleteScorecard = page.getByRole('button', { name: 'Scorekaart verwijderen' });
  await expect(deleteScorecard).toBeVisible();
  await expect(deleteScorecard).toHaveCSS('background-color', 'rgb(233, 30, 99)');
  await expect(deleteScorecard).toHaveCSS('color', 'rgb(255, 255, 255)');
  const menuButton = page.getByRole('button', { name: 'Navigatiemenu openen' });
  await expect(menuButton).toBeVisible();
  const menuX = await menuButton.evaluate((element) => element.getBoundingClientRect().x);
  const brandX = await page.locator('.brand').evaluate((element) => element.getBoundingClientRect().x);
  expect(menuX).toBeLessThan(brandX);
  const table = page.locator('.score-table');
  const tableColors = () => table.locator('th, td, span, button, svg').evaluateAll((elements) =>
    [...new Set(elements.filter((element) => !element.closest('.dealer-cell'))
      .map((element) => getComputedStyle(element).color))],
  );
  await expect.poll(tableColors).toEqual(['rgb(11, 37, 62)']);
  const footer = page.locator('.scorecard-footer');
  await expect(footer).toBeVisible();
  await page.setViewportSize({ width: 360, height: 1200 });
  await expect.poll(() => footer.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight) < 2)).toBe(true);
  await page.setViewportSize({ width: 412, height: 892 });
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
  await expect.poll(tableColors).toEqual(['rgb(11, 37, 62)']);
  await expect(table.locator('.dealer-cell').first()).toHaveCSS('background-color', 'rgb(107, 64, 151)');
  await expect(table.locator('.dealer-cell').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(table.locator('.dealer-sit-out').first()).toHaveCSS('background-color', 'rgb(107, 64, 151)');
  await expect(table.locator('.dealer-sit-out').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  for (const width of [320, 412, 1280]) {
    await page.setViewportSize({ width, height: 640 });
    await page.evaluate(() => {
      const table = document.querySelector('.score-table')!;
      window.scrollTo(0, window.scrollY + table.getBoundingClientRect().top + 200);
    });
    await expect.poll(() => table.locator('thead th').evaluateAll((headers) =>
      headers.every((header) => Math.abs(header.getBoundingClientRect().top) < 1),
    )).toBe(true);
    for (const name of names) {
      await expect(table.getByRole('columnheader', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await expect(table.locator('tbody tr').first()).not.toBeInViewport();
    await expect(tableScroll).toHaveCSS('overflow-y', 'visible');
    await expect.poll(() => tableScroll.evaluate((element) =>
      element.scrollHeight <= element.clientHeight && element.scrollTop === 0,
    )).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 412, height: 892 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY > 0)).toBe(true);
  await expect(footer).toBeInViewport();
  await expect.poll(() => footer.evaluate((element) => Math.abs(element.getBoundingClientRect().bottom - window.innerHeight) < 2)).toBe(true);
  await expect(page.locator('.scorecard-fab')).toBeInViewport();
});

for (const hand of ['Rechtshandig', 'Linkshandig']) {
  test(`${hand} choice persists and floating buttons avoid table toggles`, async ({ page }) => {
    await page.goto('/');
    const choice = page.getByRole('dialog', { name: 'Ben je rechtshandig of linkshandig?' });
    await expect(choice).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(choice).toBeVisible();
    await choice.getByRole('button', { name: hand, exact: true }).click();
    await page.reload();
    await expect(choice).not.toBeVisible();

    const leftHanded = hand === 'Linkshandig';
    const checkSide = async () => {
      const box = await page.locator('.fixed-action-btn').boundingBox();
      expect(box).not.toBeNull();
      const width = page.viewportSize()!.width;
      expect(leftHanded ? box!.x < width / 2 : box!.x > width / 2).toBe(true);
    };
    await checkSide();
    await page.getByRole('button', { name: 'Nieuwe scorekaart maken' }).click();
    await page.locator('input[role="combobox"][aria-label="Scoringssysteem"]').click();
    await page.getByRole('option', { name: 'Broederschap Abondance', exact: true }).click();
    for (const [index, name] of ['Noor', 'Jules', 'Sam', 'Mila'].entries()) {
      await page.getByLabel(`Naam speler ${index + 1}`).fill(name);
    }

    await page.getByRole('button', { name: 'Scorekaart maken', exact: true }).click();

    for (const width of [320, 360, 412, 1280]) {
      await page.setViewportSize({ width, height: 915 });
      await checkSide();
      const fab = await page.getByRole('button', { name: 'Gift toevoegen', exact: true }).boundingBox();
      for (const name of ['Giftdetails tonen', 'Bewerk- en verwijderknoppen tonen']) {
        const toggle = page.getByRole('button', { name, exact: true });
        await expect(toggle).toBeInViewport({ ratio: 1 });
        const box = await toggle.boundingBox();
        expect(fab && box && (
          fab.x + fab.width <= box.x || box.x + box.width <= fab.x ||
          fab.y + fab.height <= box.y || box.y + box.height <= fab.y
        )).toBe(true);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.getByRole('button', { name: 'Gift toevoegen', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Score invoeren' })).toBeVisible();
  });
}

test('menu changes handedness immediately and remembers it without changing the current screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rechtshandig', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Ben je rechtshandig of linkshandig?' });
  const shell = page.locator('.app-shell');
  const openPreference = async () => {
    await page.getByRole('button', { name: 'Navigatiemenu openen' }).click();
    await page.getByRole('button', { name: 'Handvoorkeur', exact: true }).click();
    await expect(dialog).toBeVisible();
  };
  for (const hand of ['Linkshandig', 'Rechtshandig']) {
    await openPreference();
    await expect(dialog.getByRole('button', { name: hand === 'Linkshandig' ? 'Rechtshandig' : 'Linkshandig', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: hand, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(shell).toHaveClass(hand === 'Linkshandig' ? /left-handed/ : /^app-shell$/);
    await page.reload();
    await expect(dialog).not.toBeVisible();
    await expect(shell).toHaveClass(hand === 'Linkshandig' ? /left-handed/ : /^app-shell$/);
  }
  await openPreference();
  await dialog.getByRole('button', { name: 'Annuleren' }).click();
  await expect(shell).not.toHaveClass(/left-handed/);
  await openPreference();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.archive-layout')).toBeVisible();
});

test('opens statistics from the menu and returns to the archive on a phone viewport', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Rechtshandig', exact: true }).click();
  await page.getByRole('button', { name: 'Navigatiemenu openen' }).click();
  await page.getByRole('button', { name: 'Statistieken', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Statistieken' })).toBeVisible();
  await expect(page.locator('#addNewScorecardButton')).toHaveCount(0);
  await expect(page.getByText('Nog geen contracten geregistreerd').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Navigatiemenu openen' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rik-scorekaarten.' })).toBeVisible();
});