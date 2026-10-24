import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FORGED_PARTS = {
  barrel: 'B80',
  center: 'C64',
  third: 'T60',
  fourth: 'F60',
  escape: 'E15',
  balance: 'BAL1',
  centerPinion: 8,
  thirdPinion: 8,
  fourthPinion: 8,
  escapePinion: 6,
};

async function regulateTo(page: Page, value: number) {
  const slider = page.getByRole('slider', { name: /Regulator index/ });
  await slider.focus();
  await page.keyboard.press('Home');
  const steps = value + 10;
  for (let index = 0; index < steps; index += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', String(value));
}

async function certifySchool(page: Page) {
  await page.getByRole('button', { name: 'Toggle still mode' }).click();
  await regulateTo(page, 0);
  await page.getByRole('button', { name: /Run test/ }).click();
  await expect(page.locator('.stand-verdict')).toHaveText('Certified', { timeout: 6000 });
  await expect(page.locator('.stamp')).toHaveClass(/is-certified/);
}

async function openShelf(page: Page) {
  await page.getByRole('button', { name: /Open the calibre shelf/ }).click();
  await expect(page.locator('.shelf-dialog')).toBeVisible();
}

async function scanAxe(page: Page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const runner = (window as unknown as {
      axe: { run: (root: Document, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> };
    }).axe;
    const result = await runner.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    }));
  });
  expect(violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('first visit shows the running School and regulates to zero', async ({ page }) => {
  await expect(page.getByText('ESCAPEMENT').first()).toBeVisible();
  await expect(page.locator('.rail-rate')).toContainText('+32.0 s/d');
  await expect(page.locator('.rail-status')).toContainText('Running');
  await expect(page.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
    'aria-valuenow',
    '8',
  );
  await regulateTo(page, 0);
  await expect(page.locator('.rail-rate')).toContainText('0.0 s/d');
});

test('runs a still test and certifies the School', async ({ page }) => {
  await certifySchool(page);
  await expect(page.locator('.bench-log')).toContainText('Rate test');
  await expect(page.locator('.bench-log')).toContainText('Certificate issued');
  await expect(page.locator('.rail-reserve')).toContainText('36 h');
  await expect(page.locator('.cert-chip')).toHaveText('Certified');
});

test('a stopped movement loses its certificate', async ({ page }) => {
  await certifySchool(page);
  await page.getByRole('button', { name: 'Stop the movement' }).click();
  await expect(page.locator('.stand-verdict')).toHaveText('Stopped');
  await expect(page.locator('.stamp')).toHaveText(/MOVEMENT STOPPED/);
  await expect(page.locator('.cert-chip')).toHaveCount(0);
  await expect(page.locator('.timing-stand')).toContainText('Start it again to certify');
});

test('the Pocket arrives partly apart and can be fitted and repaired', async ({ page }) => {
  await page.getByRole('combobox', { name: /Case/i }).selectOption('pocket');
  await expect(page.locator('.cabinet')).toContainText('Fourth wheel missing');
  await expect(page.locator('.timing-stand')).toContainText('Fourth wheel missing from the train');
  await expect(page.getByRole('button', { name: 'Select Fourth · missing' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Fit the fourth wheel', exact: true }).click();
  await expect(page.locator('.cabinet')).not.toContainText('Fourth wheel missing');
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Replace the fourth wheel' }).click();
  await expect(page.locator('.cabinet')).toContainText('Condition sound');
  await expect(page.locator('.calibre-card')).toContainText('Sound');
  await page.getByRole('button', { name: 'Run the movement' }).click();
  await expect(page.locator('.rail-status')).toContainText('Running');
});

test('every seeded fault is visible and repairable', async ({ page }) => {
  const faults = [
    ['Magnetized hairspring', 'Demagnetize the hairspring'],
    ['Worn fourth pivot', 'Replace the fourth wheel'],
    ['Set mainspring', 'Fit a new mainspring'],
    ['Beat error', 'Center the collet'],
    ['Loose cannon pinion', 'Crimp the cannon pinion'],
  ];
  for (const [fault, fix] of faults) {
    await page.locator('.new-menu summary').click();
    await page.getByRole('button', { name: fault, exact: true }).click();
    await expect(page.locator('.new-menu')).not.toHaveAttribute('open', '');
    await expect(page.locator('.cabinet')).toContainText(fault);
    await expect(page.locator('.stand-fault')).toContainText(fault);
    await page.getByRole('button', { name: fix }).click();
    await expect(page.locator('.cabinet')).toContainText('Condition sound');
    await expect(page.locator('.stand-fault')).toHaveCount(0);
  }
});

test('the Marine at zero reserve shows stopped and cannot be tested', async ({ page }) => {
  await page.getByRole('combobox', { name: /Case/i }).selectOption('marine');
  await expect(page.locator('.rail-rate')).toContainText('Stopped');
  await expect(page.locator('.rail-rate')).not.toContainText('+12.0');
  await expect(page.locator('.timing-stand')).toContainText('no reserve');
  await expect(page.getByRole('button', { name: /Run test/ })).toBeDisabled();
});

test('a forged import cannot mint a certificate', async ({ page }) => {
  const payload = {
    version: 1,
    calibre: {
      fixture: 'school',
      name: 'Forged School',
      parts: FORGED_PARTS,
      regulator: 0,
      temperature: 20,
      fault: 'none',
      reserveHours: 60,
      running: true,
    },
    log: [],
    lastTest: {
      at: Date.now(),
      rate: 999,
      amplitude: 100,
      beatError: 3,
      reserve: 30,
      temperature: 20,
      signature: 'forged',
      certified: true,
      trace: [999, 999, 999],
    },
  };
  await page.locator('.calibre-card input[type="file"]').setInputFiles({
    name: 'forged.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.locator('.bench-log')).toContainText('Imported measurement discarded');
  await expect(page.getByRole('textbox', { name: 'Calibre name' })).toHaveValue('Forged School');
  await expect(page.locator('.stand-verdict')).toHaveText('Untested');
  await expect(page.locator('.stamp')).not.toHaveClass(/is-certified/);
  await expect(page.locator('.cert-chip')).toHaveCount(0);
});

test('saves, duplicates, reloads, and deletes a shelf entry', async ({ page }) => {
  await openShelf(page);
  await page.getByRole('button', { name: 'Save current bench' }).click();
  await expect(page.locator('.shelf-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close shelf' }).click();
  await page.waitForTimeout(900);
  await page.reload();
  await openShelf(page);
  await expect(page.locator('.shelf-entry')).toHaveCount(1);
  await expect(page.locator('.shelf-entry')).toContainText('SCHOOL');
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.locator('.shelf-entry')).toHaveCount(2);
  await expect(page.locator('.shelf-name').first()).toHaveValue('Copy of School');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.shelf-entry').first().getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.shelf-entry')).toHaveCount(1);
});

test('switching calibres keeps the previous build on the shelf', async ({ page }) => {
  await regulateTo(page, 0);
  await page.waitForTimeout(900);
  await page.getByRole('combobox', { name: /Case/i }).selectOption('marine');
  await openShelf(page);
  const school = page.locator('.shelf-entry').filter({ hasText: 'School' });
  await expect(school).toHaveCount(1);
  await school.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByRole('combobox', { name: /Case/i })).toHaveValue('school');
  await expect(page.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(page.locator('.rail-rate')).toContainText('0.0 s/d');
});

test('copies a share link that restores the build and theme', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await regulateTo(page, 2);
  await page.getByRole('button', { name: 'Switch to the night bench' }).click();
  await page.getByRole('button', { name: 'Link' }).click();
  await expect(page.getByText('Build link copied.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#build=');
  const shared = await page.context().newPage();
  await shared.goto(link);
  await expect(shared.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(shared.getByRole('combobox', { name: /Case/i })).toHaveValue('school');
  await expect(shared.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
    'aria-valuenow',
    '2',
  );
  await expect(shared.locator('.rail-rate')).toContainText('+8.0 s/d');
  await shared.close();
});

test('keyboard shortcuts open help and the shelf, and stop the movement', async ({ page }) => {
  await page.keyboard.press('l');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.keyboard.press('l');
  await page.keyboard.press('e');
  await expect(page.getByRole('button', { name: 'Explode' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('?');
  await expect(page.locator('.help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.help-dialog')).not.toBeVisible();
  await page.keyboard.press('s');
  await expect(page.locator('.shelf-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press(' ');
  await expect(page.locator('.rail-status')).toContainText('Stopped');
});

test('still mode freezes the movement without snapping back', async ({ page }) => {
  const minute = page.locator('.hands g').nth(1);
  const angle = (value: string | null) => Number(/rotate\(([-\d.]+)/.exec(value ?? '')?.[1] ?? NaN);
  await page.waitForTimeout(400);
  const running = await minute.getAttribute('transform');
  await page.getByRole('button', { name: 'Toggle still mode' }).click();
  const frozen = await minute.getAttribute('transform');
  expect(Math.abs(angle(frozen) - angle(running))).toBeLessThan(1);
  await page.waitForTimeout(700);
  expect(await minute.getAttribute('transform')).toBe(frozen);
  await page.getByRole('button', { name: 'Toggle still mode' }).click();
  await page.waitForTimeout(500);
  expect(await minute.getAttribute('transform')).not.toBe(frozen);
});

test('reduced motion starts the bench still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Toggle still mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const minute = page.locator('.hands g').nth(1);
  const before = await minute.getAttribute('transform');
  await page.waitForTimeout(600);
  expect(await minute.getAttribute('transform')).toBe(before);
});

test('disables the crown at full reserve and closes the new menu', async ({ page }) => {
  await expect(page.locator('.crown')).toBeDisabled();
  await page.locator('.new-menu summary').click();
  await page.getByRole('button', { name: 'Clean build', exact: true }).click();
  await expect(page.locator('.new-menu')).not.toHaveAttribute('open', '');
  await expect(page.locator('.crown')).toBeEnabled();
});

test('keeps axe clean on day, night, help, shelf, and the Pocket', async ({ page }) => {
  await scanAxe(page);
  await page.getByRole('button', { name: 'Switch to the night bench' }).click();
  await scanAxe(page);
  await page.getByRole('button', { name: 'Open bench help' }).click();
  await scanAxe(page);
  await page.keyboard.press('Escape');
  await openShelf(page);
  await scanAxe(page);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: /Case/i }).selectOption('pocket');
  await scanAxe(page);
});

test('avoids horizontal overflow from 390 to 1920 and at 200 percent zoom', async ({ page }) => {
  for (const width of [390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(metrics.scrollWidth, `width ${width}`).toBeLessThanOrEqual(metrics.innerWidth);
  }
  await page.setViewportSize({ width: 720, height: 900 });
  await page.waitForTimeout(150);
  await expect(page.locator('.calibre-card')).toBeVisible();
  await expect(page.getByRole('button', { name: /Open the calibre shelf/ })).toBeVisible();
  const zoomMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(zoomMetrics.scrollWidth).toBeLessThanOrEqual(zoomMetrics.innerWidth);
});

test('exports JSON and an escaped SVG', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Calibre name' }).fill('Bench <script>');
  await page.getByRole('textbox', { name: 'Calibre name' }).press('Enter');
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON' }).click();
  const json = await jsonDownload;
  const jsonText = readFileSync(await json.path(), 'utf8');
  expect(JSON.parse(jsonText).calibre.name).toBe('Bench <script>');
  const svgDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG' }).click();
  const svg = await svgDownload;
  const svgText = readFileSync(await svg.path(), 'utf8');
  expect(svgText).toContain('CALIBRE PASSPORT');
  expect(svgText).not.toContain('<script>');
  expect(svgText).toContain('&lt;script&gt;');
});

test('runs with no console errors and no external requests', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => requests.push(request.url()));
  await page.reload();
  await page.getByRole('button', { name: 'Switch to the night bench' }).click();
  await page.getByRole('button', { name: 'Open bench help' }).click();
  await page.keyboard.press('Escape');
  await openShelf(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
  const external = requests.filter(
    (url) =>
      !url.startsWith('http://127.0.0.1:4391') &&
      !url.startsWith('data:') &&
      !url.startsWith('blob:'),
  );
  expect(external).toEqual([]);
});
