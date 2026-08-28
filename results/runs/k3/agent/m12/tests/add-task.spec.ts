import { expect, test } from '@playwright/test';

/** Locator strategy: placeholder text + id. */
test('adds a task to the list', async ({ page }) => {
  await page.goto('/');

  await page.getByText('New task', { exact: true }).click();
  await page.getByPlaceholder('What needs doing?').fill('Buy milk');
  await page.locator('#add-task').click();

  await expect(page.getByTestId('task-list')).toContainText('Buy milk');
  await expect(page.getByTestId('task-item')).toHaveCount(4);
});
