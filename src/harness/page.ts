/**
 * Captures what a repairer gets to look at: the rendered page.
 *
 * The static index.html is not a fair representation of the app — task rows are cloned from a
 * template that the app removes at mount, so a repairer handed the raw file would be reasoning about
 * markup the user never sees. Both the baseline and the agent are given the *rendered* DOM.
 *
 * The ARIA snapshot is captured alongside it for the agent, which uses the accessibility tree to
 * find controls that no longer match by class or text.
 */

import { chromium } from '@playwright/test';
import { startVariantServer } from '../fixtures/server.js';

export interface PageCapture {
  html: string;
  aria: string;
}

export async function capturePage(variant: string): Promise<PageCapture> {
  const server = await startVariantServer(variant);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'load' });
    // The app renders on DOMContentLoaded; give it a beat to populate the list.
    await page.waitForTimeout(150);

    const html = await page.content();

    let aria = '';
    try {
      aria = await page.locator('body').ariaSnapshot();
    } catch {
      // Older Playwright builds lack ariaSnapshot; the HTML alone is still usable.
      aria = '';
    }

    return { html, aria };
  } finally {
    await browser.close();
    await server.close();
  }
}
