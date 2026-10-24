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
  await page.getByRole('combobox', { name: /Case/i }).selectOption('marine');
  await expect(page.locator('.rail-status')).toContainText('Stopped');
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
});
