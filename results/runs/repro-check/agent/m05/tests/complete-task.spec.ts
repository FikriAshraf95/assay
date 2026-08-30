import { expect, test } from '@playwright/test';

test('marks a task as complete and updates the counter', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('checkbox', { name: 'Toggle Write the reproduction guide' }).check();

  await expect(page.getByTestId('items-left')).toHaveText('1 item left');
  await expect(page.getByRole('checkbox', { name: 'Toggle Write the reproduction guide' })).toBeChecked();
});
