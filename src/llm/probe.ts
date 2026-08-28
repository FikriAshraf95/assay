/**
 * Capability probe for whatever model is configured.
 *
 * Assay's design makes three assumptions about the model, and all three are cheaper to test now
 * than to discover on the last day:
 *
 *   - it can emit a complete spec file inside a fenced code block (the healer's output format)
 *   - it can hold a page of real HTML in context and answer about it
 *   - it can *decline* to act when told to (the no-heal cases depend entirely on this; a model that
 *     always produces a patch scores zero correct refusals no matter how the workflow is built)
 *
 * Run: npm run llm:probe
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LlmClient, MissingCredentialsError, providerName, type ChatMessage } from './client.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

interface ProbeResult {
  name: string;
  asks: string;
  passed: boolean;
  /** True when the call itself failed. A probe that never ran is not a probe that found something. */
  errored: boolean;
  detail: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

function fenced(text: string): string | null {
  const match = text.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
  return match?.[1] ?? null;
}

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), 'utf8');
}

async function main(): Promise<void> {
  let client: LlmClient;
  try {
    client = new LlmClient({
      traceDir: join(ROOT, 'results', 'traces', `probe-${providerName()}`),
      actor: 'probe'
    });
  } catch (error) {
    if (error instanceof MissingCredentialsError) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  const config = client.describe();
  console.log('provider configuration');
  for (const [key, value] of Object.entries(config)) console.log(`  ${key}: ${value}`);
  console.log('');

  const results: ProbeResult[] = [];

  async function probe(
    name: string,
    asks: string,
    messages: ChatMessage[],
    check: (text: string) => { passed: boolean; detail: string }
  ): Promise<string> {
    process.stdout.write(`${name.padEnd(28)} `);
    try {
      const response = await client.complete(messages, name);
      const verdict = check(response.text);
      results.push({
        name,
        asks,
        passed: verdict.passed,
        errored: false,
        detail: verdict.detail,
        latencyMs: response.latencyMs,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        model: response.model
      });
      console.log(
        `${verdict.passed ? 'ok  ' : 'FAIL'}  ${verdict.detail}  ` +
          `(${response.latencyMs}ms, ${response.promptTokens}+${response.completionTokens} tok)`
      );
      return response.text;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({
        name,
        asks,
        passed: false,
        errored: true,
        detail,
        latencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        model: 'none'
      });
      console.log(`FAIL  ${detail}`);
      return '';
    }
  }

  // 1 — reachability and exact instruction following
  await probe(
    'reachability',
    'endpoint responds and follows an exact-output instruction',
    [{ role: 'user', content: 'Reply with exactly the word READY and nothing else.' }],
    (text) => {
      const clean = text.trim();
      return { passed: /^READY[.!]?$/i.test(clean), detail: `replied ${JSON.stringify(clean.slice(0, 40))}` };
    }
  );

  // 2 — determinism at temperature 0
  const deterministicPrompt: ChatMessage[] = [
    { role: 'user', content: 'Name three primary colours as a comma-separated list. No other text.' }
  ];
  const first = await probe('determinism (run 1)', 'temperature 0 is honoured', deterministicPrompt, (text) => ({
    passed: text.trim().length > 0,
    detail: JSON.stringify(text.trim().slice(0, 40))
  }));
  await probe('determinism (run 2)', 'identical output for identical input', deterministicPrompt, (text) => ({
    passed: text.trim() === first.trim(),
    detail: text.trim() === first.trim() ? 'identical to run 1' : 'DIFFERS from run 1'
  }));

  // 3 — the healer's actual output format, on real project inputs
  const spec = read('tests', 'add-task.spec.ts');
  const html = read('fixtures', 'build', 'm08', 'index.html');
  await probe(
    'code-fence repair',
    'returns a complete spec file in a fenced block',
    [
      {
        role: 'system',
        content:
          'You repair Playwright tests whose locators no longer match the page. ' +
          'Reply with the complete corrected spec file inside a single ```ts fenced code block. No commentary.'
      },
      {
        role: 'user',
        content:
          `This spec fails against the page below because a locator no longer matches.\n\n` +
          `SPEC (tests/add-task.spec.ts):\n\`\`\`ts\n${spec}\`\`\`\n\n` +
          `PAGE HTML:\n\`\`\`html\n${html}\`\`\`\n\nReturn the corrected spec file.`
      }
    ],
    (text) => {
      const code = fenced(text);
      if (!code) return { passed: false, detail: 'no fenced block in reply' };
      const complete = code.includes('import') && code.includes('test(') && code.includes('expect');
      return {
        passed: complete,
        detail: complete ? `${code.split('\n').length}-line file returned` : 'fenced block is not a complete spec'
      };
    }
  );

  // 4 — long context: a real page dump plus a question about it
  await probe(
    'html comprehension',
    'can answer about a page held in context',
    [
      {
        role: 'user',
        content:
          `${html}\n\nIn the HTML above, what is the exact value of the placeholder attribute on the ` +
          `text input used to create a task? Reply with the value only, no quotes, no other text.`
      }
    ],
    (text) => {
      const clean = text.trim().replace(/^["']|["']$/g, '');
      return { passed: clean === 'Add an item', detail: `answered ${JSON.stringify(clean.slice(0, 40))}` };
    }
  );

  // 5 — the one that decides whether no-heal cases are measurable at all
  const removedHtml = read('fixtures', 'build', 'n01', 'index.html');
  const clearSpec = read('tests', 'clear-completed.spec.ts');
  await probe(
    'refusal capability',
    'will decline to patch when the feature is absent',
    [
      {
        role: 'system',
        content:
          'You repair Playwright tests whose locators no longer match the page. ' +
          'If, and only if, the feature the test exercises is genuinely absent from the page, ' +
          'reply with exactly NO_REPAIR and nothing else. Otherwise reply with the corrected spec ' +
          'file in a single ```ts fenced code block.'
      },
      {
        role: 'user',
        content:
          `This spec fails against the page below.\n\nSPEC (tests/clear-completed.spec.ts):\n` +
          `\`\`\`ts\n${clearSpec}\`\`\`\n\nPAGE HTML:\n\`\`\`html\n${removedHtml}\`\`\`\n\n` +
          `Repair it, or reply NO_REPAIR.`
      }
    ],
    (text) => {
      const refused = /^NO_REPAIR[.!]?$/i.test(text.trim());
      return {
        passed: refused,
        detail: refused ? 'correctly refused' : `attempted a repair instead: ${JSON.stringify(text.trim().slice(0, 60))}`
      };
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const errored = results.filter((r) => r.errored).length;
  const tokens = client.totalPromptTokens + client.totalCompletionTokens;

  console.log(
    `\n${passed}/${results.length} probes passed` +
      (errored > 0 ? ` — ${errored} could not run` : '') +
      ` — ${tokens.toLocaleString()} tokens used`
  );
  console.log(`models served: ${[...client.modelsSeen].join(', ') || 'none'}`);

  if (errored === results.length) {
    console.log(
      '\nEvery call failed, so nothing was measured about the model itself. Fix the configuration\n' +
        'and re-run before drawing any conclusion from this.'
    );
  }

  // One file per provider, so probing a second model never overwrites the first one's evidence.
  mkdirSync(join(ROOT, 'results'), { recursive: true });
  const probeFile = `probe-${providerName()}.json`;
  writeFileSync(
    join(ROOT, 'results', probeFile),
    `${JSON.stringify({ at: new Date().toISOString(), config, results }, null, 2)}\n`
  );
  console.log(`wrote results/${probeFile}`);

  const refusal = results.find((r) => r.name === 'refusal capability');
  if (refusal && !refusal.errored && !refusal.passed) {
    console.log(
      '\nNOTE: the model did not refuse when the feature was absent. That is a finding, not a\n' +
        'blocker — it is exactly the failure the no-heal cases exist to measure, and the agent\n' +
        'workflow has to earn refusals structurally rather than by asking politely.'
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
