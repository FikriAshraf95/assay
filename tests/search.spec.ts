import { expect, test } from '@playwright/test';

/** Locator strategy: test id. */
test('search narrows the list to matching tasks', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('search').fill('demo');

  await expect(page.getByTestId('task-item')).toHaveCount(1);
  await expect(page.getByTestId('task-list')).toContainText('Record the demo video');
});
