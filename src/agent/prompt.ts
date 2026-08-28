/**
 * The agent's instruction set.
 *
 * Two differences from the baseline's prompt, both earned rather than asserted:
 *
 *  - it is told what triage concluded and what actually moved on the page, so it is repairing with
 *    evidence rather than guessing from a wall of HTML;
 *  - when a repair is rejected it is told *why*, including the case where its patch passed against a
 *    deliberately broken build. That feedback has no equivalent in a one-shot prompt.
 *
 * The refusal instruction is identical to the baseline's. The agent does not refuse more often
 * because it was asked more nicely; it refuses because triage decides before the model is consulted.
 */

import type { ChatMessage } from '../llm/client.js';

export const REFUSAL_TOKEN = 'NO_REPAIR';

export const SYSTEM_PROMPT = [
  'You repair Playwright end-to-end tests whose locators no longer match the page.',
  '',
  'The application is known to be working correctly. The page has changed shape — classes, ids,',
  'labels, structure or ordering — and the test needs to address it as it is now.',
  '',
  'Rules:',
  '- Reply with the complete corrected spec file in a single ```ts fenced code block, nothing else.',
  '- Keep the test checking the same thing. You may change locators and expected literal values,',
  '  but the repaired test must still fail if the feature it covers stops working.',
  '- Do not delete assertions, weaken them to something trivially true, or replace a specific',
  '  expectation with one that would pass regardless of what the application does.',
  '- Prefer locators that survive cosmetic change: accessible roles and names, labels, and text a',
  '  user can actually see, over generated class names or positional indexes.',
  '',
  `If the feature the test exercises is genuinely absent or broken, reply with exactly ${REFUSAL_TOKEN}.`
].join('\n');

const HTML_LIMIT = 60_000;
const ARIA_LIMIT = 8_000;

function clip(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n<!-- truncated -->`;
}

export interface RepairContext {
  specName: string;
  specSource: string;
  failureOutput: string;
  html: string;
  aria: string;
  triageReason: string;
  structureSummary: string;
}

export function buildInitialMessages(context: RepairContext): ChatMessage[] {
  const sections = [
    'This end-to-end test has started failing. The application still works; the page changed.',
    '',
    `FAILING SPEC (tests/${context.specName}):`,
    '```ts',
    context.specSource.trimEnd(),
    '```',
    '',
    'PLAYWRIGHT OUTPUT:',
    '```',
    clip(context.failureOutput.trimEnd(), 6_000),
    '```',
    '',
    'TRIAGE:',
    context.triageReason,
    '',
    'WHAT CHANGED SINCE THE LAST PASSING BUILD (element signatures; - was there, + is there now):',
    '```',
    clip(context.structureSummary, 4_000),
    '```'
  ];

  if (context.aria.trim()) {
    sections.push('', 'ACCESSIBILITY TREE OF THE CURRENT PAGE:', '```', clip(context.aria, ARIA_LIMIT), '```');
  }

  sections.push('', 'RENDERED PAGE HTML:', '```html', clip(context.html.trimEnd(), HTML_LIMIT), '```');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: sections.join('\n') }
  ];
}

export type RejectionKind = 'still-failing' | 'hollow' | 'unparseable';

export function buildRetryMessages(
  context: RepairContext,
  previous: { code: string; kind: RejectionKind; detail: string }
): ChatMessage[] {
  const feedback: Record<RejectionKind, string> = {
    'still-failing':
      'Your repair still fails against the application. The output below is from running YOUR ' +
      'version. Look at which locator did not resolve and address that specifically.',
    hollow:
      'Your repair passes against the working application — but it ALSO passes against a build ' +
      'where the feature it covers was deliberately broken. That means it no longer detects ' +
      'anything: the assertions are too weak, or they check something that is true regardless. ' +
      'Repair the locators, but restore an assertion that would fail if the feature stopped working.',
    unparseable:
      'Your previous reply did not contain a single complete spec file in a ```ts fenced block. ' +
      'Reply with the whole file, fenced, and nothing else.'
  };

  return [
    ...buildInitialMessages(context),
    { role: 'assistant', content: `\`\`\`ts\n${previous.code}\n\`\`\`` },
    {
      role: 'user',
      content: [
        feedback[previous.kind],
        '',
        previous.detail.trim() ? '```' : '',
        previous.detail.trim() ? clip(previous.detail.trim(), 4_000) : '',
        previous.detail.trim() ? '```' : '',
        '',
        'Return the corrected spec file again, complete and fenced.'
      ]
        .filter((line) => line !== '')
        .join('\n')
    }
  ];
}

export interface ParsedRepair {
  outcome: 'patched' | 'refused' | 'unparseable';
  code: string | null;
}

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
