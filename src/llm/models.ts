/**
 * Lists the model ids the configured endpoint advertises.
 *
 * Useful for getting an exact id right before a run, and for the reproduction guide — a judge
 * pointing this at their own provider needs to know what to put in ASSAY_PRIMARY_MODEL.
 *
 *   npm run llm:models
 */

import OpenAI from 'openai';
import { loadEnv } from './client.js';

loadEnv();

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

const baseURL = env('ASSAY_PRIMARY_BASE_URL', 'AI_EXPLAIN_BASE_URL');
const apiKey = env('ASSAY_PRIMARY_API_KEY', 'AI_EXPLAIN_API_KEY');

if (!baseURL || !apiKey) {
  console.error('no endpoint configured — see .env.example');
  process.exit(1);
}

console.log(`endpoint: ${baseURL}\n`);

try {
  const client = new OpenAI({ apiKey, baseURL });
  const models = await client.models.list();
  const ids = models.data.map((model) => model.id).sort();
  for (const id of ids) console.log(`  ${id}`);
  console.log(`\n${ids.length} model(s)`);
} catch (error) {
  console.error(
    'could not list models — the endpoint may not implement /v1/models.\n' +
      (error instanceof Error ? error.message : String(error))
  );
  process.exit(1);
}
