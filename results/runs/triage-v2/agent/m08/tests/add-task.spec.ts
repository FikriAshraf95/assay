import { expect, test } from '@playwright/test';

/** Locator strategy: accessible role and label. */
test('adds a task to the list', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('New task').fill('Buy milk');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByTestId('task-list')).toContainText('Buy milk');
  await expect(page.getByTestId('task-item')).toHaveCount(4);
});
