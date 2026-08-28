import { expect, test } from '@playwright/test';

/** Locator strategy: accessible role and label for the toggle, data-testid for the counter. */
test('marks a task as complete and updates the counter', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('checkbox', { name: 'Toggle Write the reproduction guide' }).check();

  await expect(page.getByTestId('items-left')).toHaveText('1 item left');
  await expect(page.locator('.task-item').first()).toHaveClass(/is-completed/);
});
