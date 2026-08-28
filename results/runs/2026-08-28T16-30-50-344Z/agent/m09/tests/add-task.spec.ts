import { expect, test } from '@playwright/test';

/** Locator strategy: accessible role and name for input and button. */
test('adds a task to the list', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'What needs doing?' }).first().fill('Buy milk');
  await page.getByRole('button', { name: 'Add' }).first().click();

  await expect(page.getByTestId('task-list')).toContainText('Buy milk');
  await expect(page.getByTestId('task-item')).toHaveCount(4);
});
