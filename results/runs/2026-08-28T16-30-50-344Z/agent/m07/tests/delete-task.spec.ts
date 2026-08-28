import { expect, test } from '@playwright/test';

/** Locator strategy: accessible role and name for delete button, scoped to task row by text. */
test('deletes the task whose delete control was clicked', async ({ page }) => {
  await page.goto('/');

  const row = page.getByRole('listitem').filter({ hasText: 'Record the demo video' });
  await row.getByRole('button', { name: 'Remove' }).click();

  await expect(page.getByTestId('task-list')).not.toContainText('Record the demo video');
  await expect(page.getByTestId('task-item')).toHaveCount(2);
});
