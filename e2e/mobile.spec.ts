import { expect, test } from '@playwright/test';

test('fits a phone without horizontal scroll and keeps the bench usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('ESCAPEMENT').first()).toBeVisible();
  await expect(page.locator('.calibre-card')).toBeVisible();
  await expect(page.getByRole('button', { name: /Run test/ })).toBeVisible();
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
});

test('selects the Marine and shows a stopped movement with no rate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: /Case/i }).selectOption('marine');
  await expect(page.locator('.rail-status')).toContainText('Stopped');
  await expect(page.locator('.rail-rate')).toContainText('Stopped');
  await expect(page.locator('.rail-rate')).not.toContainText('+12.0');
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
});

test('opens help and the shelf at phone width without overflow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open bench help' }).click();
  await expect(page.locator('.help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Open the calibre shelf/ }).click();
  await expect(page.locator('.shelf-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Save current bench' }).click();
  await expect(page.locator('.shelf-entry')).toHaveCount(1);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
});
