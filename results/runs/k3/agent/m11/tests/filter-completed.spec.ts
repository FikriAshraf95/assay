import { expect, test } from '@playwright/test';

/** Locator strategy: the "Completed" filter button by its exact accessible name. */
test('the completed filter shows only finished tasks', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Completed', exact: true }).click();

  await expect(page.getByTestId('task-item')).toHaveCount(1);
  await expect(page.getByTestId('task-list')).toContainText('Pin the evaluation set');
});
