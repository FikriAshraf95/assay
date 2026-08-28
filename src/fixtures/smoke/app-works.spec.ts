import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    Taskly: {
      tasks: { id: number; title: string; done: boolean }[];
      addTask(title: string): boolean;
      deleteTask(id: number): void;
      render(): void;
    };
  }
}

/**
 * Variant-agnostic proof that a mutated build is still a working application.
 *
 * This drives state through the app's own API and counts <li> elements — the one thing no mutation
 * changes — so it holds regardless of how classes, ids, test hooks or labels were rewritten. It is
 * deliberately not part of tests/: it is never healed and never scored. It exists so that a heal
 * case can only ever be red because of locator rot, never because the fixture builder broke the app.
 */
test('the mutated build still renders and updates state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('li')).toHaveCount(3);

  await page.evaluate(() => {
    window.Taskly.addTask('smoke test task');
    window.Taskly.render();
  });
  await expect(page.locator('li')).toHaveCount(4);

  await page.evaluate(() => {
    const first = window.Taskly.tasks[0];
    if (first) window.Taskly.deleteTask(first.id);
    window.Taskly.render();
  });
  await expect(page.locator('li')).toHaveCount(3);
});
