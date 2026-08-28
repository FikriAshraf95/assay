/**
 * GUARD — the agent builds its own broken copy of the app to check its repair still detects failure.
 *
 * A repaired spec that passes proves nothing. The only question worth asking is whether it would
 * still go red if the feature it covers actually broke. So the agent sabotages the application and
 * re-runs its own patch against that: if the patch still passes, it no longer tests anything and is
 * rejected.
 *
 * The sabotage is deliberately app-agnostic. It does not know what Taskly is, or which feature the
 * spec covers — it simply prevents the page's own interaction handlers from ever being registered,
 * so every user action becomes inert while the DOM stays byte-identical. Nothing here is derived
 * from the scorer's defect builds, which the agent never sees.
 *
 * Its blind spot is stated rather than patched around: a spec that asserts *nothing happens* still
 * passes against an inert app. The agent detects that case instead of guessing — see the
 * diagnosticity check in run.ts.
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { variantDir } from '../fixtures/server.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export const SABOTAGE_LABEL = 'every interaction handler is prevented from registering';

const SABOTAGE_SOURCE = `/*
 * Guard sabotage. The DOM is untouched; only the application's ability to respond to interaction is
 * removed. Any test that asserts a user action changed something must fail here — and if it passes,
 * it was not asserting anything.
 */
(function () {
  var realAdd = EventTarget.prototype.addEventListener;
  var swallowed = { click: 1, change: 1, input: 1, submit: 1, keydown: 1, keyup: 1 };

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (swallowed[type]) return;
    return realAdd.call(this, type, listener, options);
  };

  // Without the app's own submit handler the browser would navigate away; keep the page put so the
  // failure is a clean assertion failure rather than a page load.
  realAdd.call(document, 'submit', function (event) { event.preventDefault(); }, true);
  realAdd.call(document, 'click', function (event) {
    var anchor = event.target && event.target.closest && event.target.closest('a[href="#"]');
    if (anchor) event.preventDefault();
  }, true);
})();
`;

/**
 * Copies a build and injects the sabotage script ahead of the application, returning the new
 * directory. Output lives under results/scratch/, which is gitignored.
 */
export function materializeMutant(variant: string, label = 'guard'): string {
  const source = variantDir(variant);
  const target = join(ROOT, 'results', 'scratch', 'mutants', `${variant}.${label}`);

  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });

  writeFileSync(join(target, 'sabotage.js'), SABOTAGE_SOURCE);

  const indexPath = join(target, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  if (!html.includes('<script src="./app.js"></script>')) {
    throw new Error(`cannot inject sabotage into ${indexPath}: app.js script tag not found`);
  }
  writeFileSync(
    indexPath,
    html.replace(
      '<script src="./app.js"></script>',
      '<script src="./sabotage.js"></script>\n    <script src="./app.js"></script>'
    )
  );

  return target;
}
