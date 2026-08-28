/**
 * CLI wrapper around the variant server. Playwright's `webServer` launches this; which variant is
 * served is chosen by ASSAY_VARIANT, so the same specs can be pointed at v0, a mutated build or a
 * defect build without edits.
 */

import { startVariantServer } from './server.js';

const variant = process.env.ASSAY_VARIANT ?? 'v0';
const port = Number(process.env.ASSAY_PORT ?? 4321);

try {
  const server = await startVariantServer(variant, port);
  console.log(`serving ${variant} on ${server.url}/`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
