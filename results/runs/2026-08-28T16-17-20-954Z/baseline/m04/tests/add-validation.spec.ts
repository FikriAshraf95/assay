import { expect, test } from '@playwright/test';

/** Locator strategy: id + accessible name. */
test('does not add a task when the input is blank', async ({ page }) => {
  await page.goto('/');

  await page.locator('#new-task').fill('   ');
  await page.getByTestId('add-task').click();

  await expect(page.getByTestId('task-item')).toHaveCount(3);
});
