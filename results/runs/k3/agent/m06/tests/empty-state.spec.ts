import { expect, test } from '@playwright/test';

/** Locator strategy: role + accessible name, since the delete control changed from a <button>
 *  to an <a role="button">. The loop is bounded so a dead delete control fails the assertion
 *  rather than hanging. */
test('shows the empty state once every task is deleted', async ({ page }) => {
  await page.goto('/');

  const deleteButtons = page.getByRole('button', { name: 'Delete' });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await deleteButtons.count()) === 0) break;
    await deleteButtons.first().click();
  }

  await expect(page.getByTestId('task-item')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
