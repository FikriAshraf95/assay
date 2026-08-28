import { expect, test } from '@playwright/test';

/** Locator strategy: id + exact text assertion. */
test('the counter reports how many tasks remain', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#items-left')).toHaveText('2 items left');

  await page.getByTestId('task-toggle').first().check();

  await expect(page.locator('#items-left')).toHaveText('1 item left');
});
