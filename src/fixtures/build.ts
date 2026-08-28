/**
 * Generates every fixture build from one base application plus the declarative case definitions.
 *
 *   fixtures/build/v0/            the original app — the whole suite is green here
 *   fixtures/build/<caseId>/      what the engineer actually finds red one morning
 *   fixtures/build/<caseId>.defect/  heal cases only: same DOM, feature genuinely broken
 *
 * The defect builds are the scorer's instrument. A repaired spec that passes on <caseId> *and*
 * still fails on <caseId>.defect has kept its ability to detect failure. One that passes on both
 * has been hollowed out, however green it looks.
 *
 * Output is deterministic and checked in, so a judge can diff any two variants by eye.
 */

import * as cheerio from 'cheerio';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE_BINDINGS,
  BASE_STRINGS,
  CASES,
  DEFECTS,
  type Bindings,
  type EvalCase,
  type MutationContext,
  type Strings
} from './cases.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const APP_DIR = join(ROOT, 'src', 'fixtures', 'app');
const OUT_DIR = join(ROOT, 'fixtures', 'build');

const BASE_HTML = readFileSync(join(APP_DIR, 'index.html'), 'utf8');
const BASE_JS = readFileSync(join(APP_DIR, 'app.js'), 'utf8');
const BASE_CSS = readFileSync(join(APP_DIR, 'styles.css'), 'utf8');

const BINDINGS_BLOCK = /\/\* --- BINDINGS:START --- \*\/[\s\S]*?\/\* --- BINDINGS:END --- \*\//;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderBindings(bindings: Bindings, strings: Strings): string {
  return [
    '/* --- BINDINGS:START --- */',
    `const SEL = ${JSON.stringify(bindings, null, 2)};`,
    '',
    `const STRINGS = ${JSON.stringify(strings, null, 2)};`,
    '/* --- BINDINGS:END --- */'
  ].join('\n');
}

interface BuiltVariant {
  html: string;
  js: string;
  css: string;
}

function buildVariant(evalCase: EvalCase | null): BuiltVariant {
  const $ = cheerio.load(BASE_HTML);
  const bindings: Bindings = { ...BASE_BINDINGS };
  const strings: Strings = { ...BASE_STRINGS };
  const extraCss: string[] = [];
  const classMap: Record<string, string> = {};

  const ctx: MutationContext = {
    $,
    bindings,
    strings,
    appendCss(css) {
      extraCss.push(css);
    },
    renameClasses(map) {
      Object.assign(classMap, map);

      $('[class]').each((_, el) => {
        const node = $(el);
        const next = (node.attr('class') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((name) => map[name] ?? name)
          .join(' ');
        node.attr('class', next);
      });

      // Keep the app's own wiring pointing at whatever the classes are now called.
      for (const [key, value] of Object.entries(bindings) as [keyof Bindings, string][]) {
        for (const [from, to] of Object.entries(map)) {
          if (value === `.${from}`) bindings[key] = `.${to}`;
          else if (value === from) bindings[key] = to;
        }
      }
    }
  };

  evalCase?.mutate?.(ctx);

  let css = [BASE_CSS, ...extraCss].join('\n\n');
  for (const [from, to] of Object.entries(classMap)) {
    css = css.replace(new RegExp(`\\.${escapeRegExp(from)}(?![\\w-])`, 'g'), `.${to}`);
  }

  const js = BASE_JS.replace(BINDINGS_BLOCK, renderBindings(bindings, strings));
  return { html: $.html(), js, css };
}

function withDefect(html: string): string {
  return html.replace(
    '<script src="./app.js"></script>',
    '<script src="./app.js"></script>\n    <script src="./defect.js"></script>'
  );
}

function writeVariant(name: string, variant: BuiltVariant, defectSource?: string): void {
  const dir = join(OUT_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), defectSource ? withDefect(variant.html) : variant.html);
  writeFileSync(join(dir, 'app.js'), variant.js);
  writeFileSync(join(dir, 'styles.css'), variant.css);
  if (defectSource) {
    writeFileSync(
      join(dir, 'defect.js'),
      `/* Behaviour defect injected by the fixture builder. The DOM is identical to the\n` +
        `   sibling variant; only what the app does has changed. */\n${defectSource}\n`
    );
  }
}

interface ManifestCase {
  id: string;
  kind: EvalCase['kind'];
  title: string;
  defeats: string;
  primarySpec: string;
  variant: string;
  defectVariant: string | null;
  defectLabel: string | null;
  refusalReason: string | null;
}

function main(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const base = buildVariant(null);
  writeVariant('v0', base);

  // The unmutated app with one behaviour broken. Nothing is scored against these; they exist so
  // validate.ts can prove every defect is actually load-bearing before any result is believed.
  for (const [feature, defect] of Object.entries(DEFECTS)) {
    writeVariant(`v0.${feature}`, base, defect.source);
  }

  const manifest: ManifestCase[] = [];

  for (const evalCase of CASES) {
    const variant = buildVariant(evalCase);

    if (evalCase.kind === 'heal') {
      if (!evalCase.feature) throw new Error(`heal case ${evalCase.id} has no feature`);
      const defect = DEFECTS[evalCase.feature];

      writeVariant(evalCase.id, variant);
      writeVariant(`${evalCase.id}.defect`, variant, defect.source);

      manifest.push({
        id: evalCase.id,
        kind: evalCase.kind,
        title: evalCase.title,
        defeats: evalCase.defeats,
        primarySpec: evalCase.primarySpec,
        variant: evalCase.id,
        defectVariant: `${evalCase.id}.defect`,
        defectLabel: defect.label,
        refusalReason: null
      });
      continue;
    }

    // No-heal: the regression ships in the variant the healer is pointed at. There is no separate
    // guard build, because there is no repair that should pass.
    const regression = evalCase.regression ? DEFECTS[evalCase.regression] : undefined;
    writeVariant(evalCase.id, variant, regression?.source);

    manifest.push({
      id: evalCase.id,
      kind: evalCase.kind,
      title: evalCase.title,
      defeats: evalCase.defeats,
      primarySpec: evalCase.primarySpec,
      variant: evalCase.id,
      defectVariant: null,
      defectLabel: regression?.label ?? 'the control was removed from the product',
      refusalReason: evalCase.refusalReason ?? null
    });
  }

  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ baseVariant: 'v0', cases: manifest }, null, 2)}\n`
  );

  const heal = manifest.filter((c) => c.kind === 'heal').length;
  const noHeal = manifest.length - heal;
  const variants = manifest.reduce((n, c) => n + (c.defectVariant ? 2 : 1), 1);
  console.log(`built ${variants} variants — ${heal} heal cases, ${noHeal} no-heal cases`);
  console.log(`output: ${OUT_DIR}`);
}

main();
