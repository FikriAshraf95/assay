/**
 * TRIAGE — decide whether a red spec is worth repairing at all, before spending a model call.
 *
 * One deterministic question: does the page's structure differ from the last known-good build?
 *
 *   differs   -> something the test addresses moved, was renamed, or was reordered. Repair it.
 *   identical -> every control is where it was and named what it was, so nothing the test addresses
 *                has changed. The application's behaviour is wrong, not the test. Refuse and report
 *                a regression, because repairing here deletes a real bug detection.
 *
 * "Structure" means element signatures — tag, addressing attributes, sibling position — plus the
 * text of *label-bearing* elements only.
 *
 * That last distinction is the whole trick, and it was learned the hard way (see deviations/D010).
 * A button relabelled from "Add" to "Create task" is a structural change: a control's accessible
 * name is part of how the page is addressed, and every locator that used it is now wrong. A counter
 * rendering "3 items left" instead of "2 items left" is *not* — that is data the test asserts about,
 * and it is precisely where a behavioural bug shows up. Treating all text alike misclassifies one or
 * the other, whichever way you choose.
 *
 * An earlier version asked Playwright's failure output whether a locator had resolved. It read
 * plausibly and was very nearly inverted in practice; D010 has the measurements.
 */

import * as cheerio from 'cheerio';

export type TriageVerdict = 'repair' | 'refuse';

export interface TriageResult {
  verdict: TriageVerdict;
  structureChanged: boolean;
  reason: string;
  /** Human-readable structural delta, for the repair prompt and the report. */
  structureSummary: string;
}

/** Elements whose visible text names a control, and which a locator may therefore address by. */
const LABEL_BEARING_TAGS = new Set(['button', 'a', 'label', 'summary', 'option', 'legend']);
const LABEL_BEARING_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'option']);

const ADDRESSING_ATTRS = [
  'id',
  'class',
  'role',
  'type',
  'name',
  'href',
  'placeholder',
  'hidden',
  'disabled',
  'checked'
];

function isLabelBearing(tag: string, attrs: Record<string, string>): boolean {
  if (LABEL_BEARING_TAGS.has(tag)) return true;
  const role = attrs['role'];
  return role !== undefined && LABEL_BEARING_ROLES.has(role);
}

function signatures(html: string): string[] {
  const $ = cheerio.load(html);
  $('script').remove();

  const out: string[] = [];
  $('body *').each((_, node) => {
    const el = $(node);
    const tag = (node as unknown as { tagName?: string }).tagName?.toLowerCase() ?? 'node';
    const attrs = (el.attr() ?? {}) as Record<string, string>;

    const parts: string[] = [];
    for (const key of Object.keys(attrs).sort()) {
      if (ADDRESSING_ATTRS.includes(key) || key.startsWith('data-') || key.startsWith('aria-')) {
        parts.push(`${key}=${attrs[key] ?? ''}`);
      }
    }

    if (isLabelBearing(tag, attrs)) {
      const label = el.text().replace(/\s+/g, ' ').trim();
      parts.push(`text=${label}`);
    }

    const index = el.parent().children().index(el);
    out.push(`${tag}[${index}]{${parts.join(' ')}}`);
  });

  return out;
}

function multisetDelta(before: string[], after: string[]): { removed: string[]; added: string[] } {
  const counts = new Map<string, number>();
  for (const item of before) counts.set(item, (counts.get(item) ?? 0) + 1);

  const added: string[] = [];
  for (const item of after) {
    const seen = counts.get(item) ?? 0;
    if (seen > 0) counts.set(item, seen - 1);
    else added.push(item);
  }

  const removed: string[] = [];
  for (const [item, remaining] of counts) {
    for (let i = 0; i < remaining; i += 1) removed.push(item);
  }

  return { removed, added };
}

export function compareStructure(
  knownGoodHtml: string,
  currentHtml: string
): { changed: boolean; summary: string } {
  const { removed, added } = multisetDelta(signatures(knownGoodHtml), signatures(currentHtml));

  if (removed.length === 0 && added.length === 0) {
    return { changed: false, summary: 'No structural difference from the last known-good build.' };
  }

  const cap = 25;
  const lines = [
    ...removed.slice(0, cap).map((s) => `- ${s}`),
    ...added.slice(0, cap).map((s) => `+ ${s}`)
  ];
  const hidden = Math.max(0, removed.length - cap) + Math.max(0, added.length - cap);
  if (hidden > 0) lines.push(`… ${hidden} more`);

  return { changed: true, summary: lines.join('\n') };
}

export function triage(input: { knownGoodHtml: string; currentHtml: string }): TriageResult {
  const structure = compareStructure(input.knownGoodHtml, input.currentHtml);

  if (structure.changed) {
    return {
      verdict: 'repair',
      structureChanged: true,
      reason:
        'The page structure differs from the last known-good build, so something the test ' +
        'addresses has moved, been renamed or been reordered.',
      structureSummary: structure.summary
    };
  }

  return {
    verdict: 'refuse',
    structureChanged: false,
    reason:
      'Every control is still present, still named the same and still in the same place as the ' +
      'last known-good build. Nothing the test addresses has changed, so the test is not broken — ' +
      'the application is. Repairing it here would delete a real bug detection.',
    structureSummary: structure.summary
  };
}
