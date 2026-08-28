import { expect, test } from '@playwright/test';

/** Locator strategy: accessible name. */
test('the active filter hides completed tasks', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Activas' }).click();

  await expect(page.getByTestId('task-item')).toHaveCount(2);
  await expect(page.getByTestId('task-list')).not.toContainText('Pin the evaluation set');
});
