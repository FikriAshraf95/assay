import { expect, test } from '@playwright/test';

test('the completed filter shows only finished tasks', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('filter-completed').click();

  await expect(page.getByTestId('task-item')).toHaveCount(1);
  await expect(page.getByTestId('task-list')).toContainText('Pin the evaluation set');
});
