import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('first visit shows the running School and regulates to zero', async ({ page }) => {
  await expect(page.getByText('ESCAPEMENT').first()).toBeVisible();
  await expect(page.locator('.rail-rate')).toContainText('+32.0 s/d');
  await expect(page.locator('.rail-status')).toContainText('Running');
  const slider = page.getByRole('slider', { name: /Regulator index/ });
  await expect(slider).toHaveAttribute('aria-valuenow', '8');
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.rail-rate')).toContainText('0.0 s/d');
});

test('runs a still test and certifies the School', async ({ page }) => {
  await page.getByRole('button', { name: 'Toggle still mode' }).click();
  const slider = page.getByRole('slider', { name: /Regulator index/ });
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: /Run test/ }).click();
  await expect(page.locator('.stand-verdict')).toHaveText('Certified', { timeout: 6000 });
  await expect(page.locator('.stamp')).toHaveClass(/is-certified/);
  await expect(page.locator('.bench-log')).toContainText('Rate test');
  await expect(page.locator('.rail-reserve')).toContainText('36 h');
});

test('diagnoses and repairs the Pocket worn pivot', async ({ page }) => {
  await page.getByRole('combobox', { name: /Case/i }).selectOption('pocket');
  await expect(page.locator('.cabinet')).toContainText('Worn fourth pivot');
  await expect(page.locator('.calibre-card')).toContainText('Worn pivot');
  await page.getByRole('button', { name: 'Replace the fourth wheel' }).click();
  await expect(page.locator('.cabinet')).toContainText('Condition sound');
  await expect(page.locator('.cabinet')).not.toContainText('Worn fourth pivot');
  await expect(page.locator('.calibre-card')).toContainText('Sound');
  await expect(page.locator('.timing-stand')).not.toContainText('Worn fourth pivot');
});

test('stops a School when a swapped wheel breaks the beat', async ({ page }) => {
  await page.locator('.cabinet').getByRole('button', { name: /Fourth/ }).click();
  await page.getByRole('button', { name: /Fourth 64/ }).click();
  await expect(page.locator('.rail-status')).toContainText('Out of train');
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
  await expect(page.locator('.rail-rate')).toBeVisible();
});

test('persists the regulator across a reload', async ({ page }) => {
  const slider = page.getByRole('slider', { name: /Regulator index/ });
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.rail-rate')).toContainText('0.0 s/d');
  await page.waitForTimeout(900);
  await page.reload();
  await expect(page.locator('.rail-rate')).toContainText('0.0 s/d');
  await expect(page.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});

test('switches to the night bench and remembers the lamp', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to the night bench' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.getByRole('button', { name: 'Switch to the day bench' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
});

test('offers the JSON export', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^escapement-ESC-[0-9A-F]{4}-[0-9A-F]{4}\.json$/);
});
