/**
 * The baseline's entire instruction set.
 *
 * This is "one direct prompt with basic instructions" from the brief's list of fair baselines — the
 * honest version of what most people do today, and of what a one-shot "just ask the model" tool
 * does. It is given everything a competent single-shot attempt would have: the failing spec, the
 * real Playwright output, and the rendered page.
 *
 * It is also given the *same permission to refuse* that the agent has. That matters for fairness:
 * the difference measured between the two systems must be the workflow, not one of them being
 * denied an option. The agent does not out-refuse the baseline because it was told it may refuse —
 * both are — but because refusing is produced structurally rather than requested politely.
 */

import type { ChatMessage } from '../llm/client.js';

export const REFUSAL_TOKEN = 'NO_REPAIR';

export const SYSTEM_PROMPT = [
  'You repair Playwright end-to-end tests that have started failing.',
  '',
  'Reply with the complete corrected spec file inside a single ```ts fenced code block, and nothing',
  'else — no commentary before or after.',
  '',
  `If the feature the test exercises is genuinely absent or broken in the application, so that no`,
  `repair to the test would be correct, reply with exactly ${REFUSAL_TOKEN} and nothing else.`
].join('\n');

const HTML_LIMIT = 60_000;

function clip(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n<!-- truncated -->`;
}

export function buildBaselineMessages(input: {
  specName: string;
  specSource: string;
  failureOutput: string;
  html: string;
}): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        'This end-to-end test has started failing against the application. Repair it.',
        '',
        `FAILING SPEC (tests/${input.specName}):`,
        '```ts',
        input.specSource.trimEnd(),
        '```',
        '',
        'PLAYWRIGHT OUTPUT:',
        '```',
        clip(input.failureOutput.trimEnd(), 6_000),
        '```',
        '',
        'RENDERED PAGE HTML:',
        '```html',
        clip(input.html.trimEnd(), HTML_LIMIT),
        '```'
      ].join('\n')
    }
  ];
}

export interface ParsedRepair {
  outcome: 'patched' | 'refused' | 'unparseable';
  code: string | null;
}

/**
 * Accepts a fenced block, or a bare file that starts with an import — some models drop the fence.
 * Being lenient here is deliberate: the baseline should fail because its repairs are hollow, not
 * because of output formatting.
 */
export function parseRepair(reply: string): ParsedRepair {
  const trimmed = reply.trim();

  if (new RegExp(`^${REFUSAL_TOKEN}[.!]?$`, 'i').test(trimmed)) {
    return { outcome: 'refused', code: null };
  }

  const fenced = trimmed.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
  if (fenced?.[1]?.trim()) {
    return { outcome: 'patched', code: fenced[1].trimEnd() };
  }

  if (/^import\s/m.test(trimmed) && /\btest\s*\(/.test(trimmed)) {
    return { outcome: 'patched', code: trimmed };
  }

  return { outcome: 'unparseable', code: null };
}
