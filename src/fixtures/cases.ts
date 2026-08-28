/**
 * The evaluation set.
 *
 * Twelve heal cases: the DOM changed, the application still works. A red suite here is toil, and
 * the correct action is to repair the test.
 *
 * Three no-heal cases: the DOM is innocent (or the change is a real product decision) and the
 * application is genuinely wrong. A red suite here is the test doing its job, and the correct
 * action is to refuse and report a regression.
 *
 * Every heal case also declares a `feature`. The harness builds a second, behaviour-broken copy of
 * that variant using the matching defect below, and a repair is only counted as valid if the
 * patched spec still fails against it. Neither the baseline nor the agent is ever shown the defect
 * build — it exists solely in the scorer, so nothing can be optimised against it.
 */

import type { CheerioAPI } from 'cheerio';

export interface Bindings {
  app: string;
  composer: string;
  newTaskInput: string;
  addButton: string;
  searchInput: string;
  filterButton: string;
  taskList: string;
  emptyState: string;
  itemsLeft: string;
  clearCompleted: string;
  rowTemplate: string;
  rowToggle: string;
  rowTitle: string;
  rowDelete: string;
  activeFilterClass: string;
  completedRowClass: string;
}

export interface Strings {
  itemsLeft: string;
  itemsLeftOne: string;
}

export interface MutationContext {
  $: CheerioAPI;
  bindings: Bindings;
  strings: Strings;
  /** Extra rules appended to the variant stylesheet, so mutated markup still looks intentional. */
  appendCss(css: string): void;
  /** Renames classes across the markup, the stylesheet and any affected binding in one step. */
  renameClasses(map: Record<string, string>): void;
}

export type FeatureKey =
  | 'add'
  | 'addValidation'
  | 'toggle'
  | 'delete'
  | 'filter'
  | 'clearCompleted'
  | 'itemsLeft';

export interface Defect {
  /** Written into the report so a reviewer can see exactly what the guard build broke. */
  label: string;
  source: string;
}

/**
 * Behaviour breakages. Each one disables the feature its paired spec asserts, while leaving the
 * DOM completely untouched — that is what makes them a fair test of whether a repaired spec still
 * detects real failure.
 */
export const DEFECTS: Record<FeatureKey, Defect> = {
  add: {
    label: 'adding a task silently does nothing',
    source: `window.Taskly.addTask = function () { return false; };`
  },
  addValidation: {
    label: 'blank input is accepted and creates an empty task',
    source:
      `window.Taskly.addTask = function (title) {\n` +
      `  this.tasks.push({ id: this.nextId++, title: String(title), done: false });\n` +
      `  return true;\n` +
      `};`
  },
  toggle: {
    label: 'completing a task does not change its state',
    source: `window.Taskly.toggleTask = function () {};`
  },
  delete: {
    label: 'the delete control is wired to nothing',
    source: `window.Taskly.deleteTask = function () {};`
  },
  filter: {
    label: 'filters are ignored and every task is always shown',
    source: `window.Taskly.visibleTasks = function () { return this.tasks.slice(); };`
  },
  clearCompleted: {
    label: 'clear completed leaves finished tasks in place',
    source: `window.Taskly.clearCompleted = function () {};`
  },
  itemsLeft: {
    label: 'the remaining-items counter is off by one',
    source:
      `window.Taskly.activeCount = function () {\n` +
      `  return this.tasks.filter(function (t) { return !t.done; }).length + 1;\n` +
      `};`
  }
};

/**
 * The spec that proves a given defect actually breaks something. Used by validate.ts to run each
 * defect against the *unmutated* app: if the spec still passes there, the defect is inert and the
 * guard it backs would be worthless.
 */
export const FEATURE_SPECS: Record<FeatureKey, string> = {
  add: 'add-task.spec.ts',
  addValidation: 'add-validation.spec.ts',
  toggle: 'complete-task.spec.ts',
  delete: 'delete-task.spec.ts',
  filter: 'filter-active.spec.ts',
  clearCompleted: 'clear-completed.spec.ts',
  itemsLeft: 'items-left.spec.ts'
};

export interface EvalCase {
  id: string;
  kind: 'heal' | 'no-heal';
  title: string;
  /** Which locator strategy this case is designed to defeat. Shown in the report. */
  defeats: string;
  /** The spec the case is scored on. Other specs may also break; those are reported separately. */
  primarySpec: string;
  /** Heal cases: the feature the guard build breaks. */
  feature?: FeatureKey;
  /** No-heal cases: the behaviour that is genuinely broken in the shipped variant. */
  regression?: FeatureKey;
  /** Why refusing is correct. No-heal cases only. */
  refusalReason?: string;
  mutate?: (ctx: MutationContext) => void;
}

export const BASE_BINDINGS: Bindings = {
  app: '#app',
  composer: '#composer',
  newTaskInput: '#new-task',
  addButton: '#add-task',
  searchInput: '#search',
  filterButton: '.filter',
  taskList: '#task-list',
  emptyState: '#empty-state',
  itemsLeft: '#items-left',
  clearCompleted: '#clear-completed',
  rowTemplate: '#task-template',
  rowToggle: '.task-toggle',
  rowTitle: '.task-title',
  rowDelete: '.task-delete',
  activeFilterClass: 'is-active',
  completedRowClass: 'is-completed'
};

export const BASE_STRINGS: Strings = {
  itemsLeft: '{n} items left',
  itemsLeftOne: '1 item left'
};

const rowTemplate = (ctx: MutationContext) => ctx.$(ctx.bindings.rowTemplate);

export const CASES: EvalCase[] = [
  {
    id: 'm01',
    kind: 'heal',
    title: 'CSS classes rehashed by the build tool',
    defeats: 'class-based locators',
    primarySpec: 'delete-task.spec.ts',
    feature: 'delete',
    mutate(ctx) {
      ctx.renameClasses({
        'task-item': 'tsk-4f2a91',
        'task-title': 'tsk-9c31b0',
        'task-delete': 'tsk-77de12',
        'task-toggle': 'tsk-01ab4e',
        'is-completed': 'tsk-c0mpl3',
        'task-list': 'lst-19ffab',
        'empty-state': 'emp-4a2d90',
        'composer-input': 'cmp-51fa2c',
        'search-input': 'cmp-77b1e0',
        filter: 'flt-8823ac',
        'is-active': 'flt-ac7v01',
        badge: 'bdg-6f1c33'
      });
    }
  },
  {
    id: 'm02',
    kind: 'heal',
    title: 'id attributes dropped from the markup',
    defeats: '#id locators',
    primarySpec: 'add-task.spec.ts',
    feature: 'add',
    mutate(ctx) {
      ctx.$('#app, #app *').each((_, el) => {
        ctx.$(el).removeAttr('id');
      });
      Object.assign(ctx.bindings, {
        app: '.app',
        composer: '.composer',
        newTaskInput: '.composer-input',
        addButton: '.btn-primary',
        searchInput: '.search-input',
        taskList: '.task-list',
        emptyState: '.empty-state',
        itemsLeft: '.badge',
        clearCompleted: '.btn-ghost'
      });
    }
  },
  {
    id: 'm03',
    kind: 'heal',
    title: 'test hooks renamed from data-testid to data-qa',
    defeats: 'the entire test-id strategy at once',
    primarySpec: 'complete-task.spec.ts',
    feature: 'toggle',
    mutate(ctx) {
      ctx.$('[data-testid]').each((_, el) => {
        const node = ctx.$(el);
        const value = node.attr('data-testid');
        node.removeAttr('data-testid');
        if (value) node.attr('data-qa', value);
      });
    }
  },
  {
    id: 'm04',
    kind: 'heal',
    title: 'submit button relabelled from "Add" to "Create task"',
    defeats: 'accessible-name and text locators',
    primarySpec: 'add-validation.spec.ts',
    feature: 'addValidation',
    mutate(ctx) {
      ctx.$('#add-task').text('Create task');
    }
  },
  {
    id: 'm05',
    kind: 'heal',
    title: 'list rows gain two layout wrappers',
    defeats: 'child-combinator and structural locators',
    primarySpec: 'complete-task.spec.ts',
    feature: 'toggle',
    mutate(ctx) {
      const row = rowTemplate(ctx).find('.task-item').first();
      const toggle = ctx.$.html(row.find('.task-toggle'));
      const title = ctx.$.html(row.find('.task-title'));
      const remove = ctx.$.html(row.find('.task-delete'));
      row
        .empty()
        .append(
          `<div class="task-row"><div class="task-main">${toggle}${title}</div>` +
            `<div class="task-actions">${remove}</div></div>`
        );
      ctx.appendCss(
        `.task-row { display: flex; align-items: center; gap: 0.7rem; width: 100%; }\n` +
          `.task-main { display: flex; align-items: center; gap: 0.7rem; flex: 1; min-width: 0; }\n` +
          `.task-actions { display: flex; }`
      );
    }
  },
  {
    id: 'm06',
    kind: 'heal',
    title: 'delete control changed from <button> to <a role="button">',
    defeats: 'tag-qualified locators such as button.task-delete',
    primarySpec: 'empty-state.spec.ts',
    feature: 'delete',
    mutate(ctx) {
      const button = rowTemplate(ctx).find('.task-delete').first();
      const inner = button.html() ?? '';
      button.replaceWith(
        `<a class="task-delete" data-testid="task-delete" role="button" href="#">${inner}</a>`
      );
      ctx.appendCss(`a.task-delete { text-decoration: none; display: inline-block; }`);
    }
  },
  {
    id: 'm07',
    kind: 'heal',
    title: 'delete becomes an icon-only control labelled "Remove"',
    defeats: 'visible-text locators and the old accessible name',
    primarySpec: 'delete-task.spec.ts',
    feature: 'delete',
    mutate(ctx) {
      rowTemplate(ctx)
        .find('.task-delete')
        .first()
        .attr('aria-label', 'Remove')
        .html(
          `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">` +
            `<path d="M3 4h10M6.5 7v4M9.5 7v4M4.5 4l.5 9h6l.5-9" fill="none" ` +
            `stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
        );
    }
  },
  {
    id: 'm08',
    kind: 'heal',
    title: 'composer gains a label and a new placeholder',
    defeats: 'placeholder locators',
    primarySpec: 'add-task.spec.ts',
    feature: 'add',
    mutate(ctx) {
      ctx.$('#new-task').attr('placeholder', 'Add an item');
      ctx.$('#composer').prepend('<label class="composer-label" for="new-task">New task</label>');
      ctx.appendCss(
        `.composer { flex-wrap: wrap; }\n` +
          `.composer-label { flex: 0 0 100%; font-size: 0.8125rem; color: var(--muted); ` +
          `margin-bottom: 0.35rem; }`
      );
    }
  },
  {
    id: 'm09',
    kind: 'heal',
    title: 'a second quick-add control appears in the header',
    defeats: 'any locator that is no longer unique — Playwright strict mode now fails',
    primarySpec: 'add-task.spec.ts',
    feature: 'add',
    mutate(ctx) {
      ctx.$('.app-header').after(
        `<div class="quick-add" data-testid="quick-add">` +
          `<input class="composer-input" type="text" placeholder="What needs doing?" autocomplete="off" />` +
          `<button class="btn btn-primary" type="button">Add</button>` +
          `</div>`
      );
      ctx.appendCss(
        `.quick-add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; opacity: 0.75; }`
      );
    }
  },
  {
    id: 'm10',
    kind: 'heal',
    title: 'interface relabelled to Spanish',
    defeats: 'every text and accessible-name locator simultaneously',
    primarySpec: 'filter-active.spec.ts',
    feature: 'filter',
    mutate(ctx) {
      ctx.$('#add-task').text('Añadir');
      ctx.$('#new-task').attr('placeholder', '¿Qué hay que hacer?');
      ctx.$('#search').attr('placeholder', 'Buscar tareas');
      ctx.$('[data-filter="all"]').text('Todas');
      ctx.$('[data-filter="active"]').text('Activas');
      ctx.$('[data-filter="completed"]').text('Completadas');
      ctx.$('#filters').attr('aria-label', 'Filtrar tareas');
      ctx.$('#clear-completed').text('Borrar completadas');
      ctx.$('#empty-state').text('No hay nada.');
      ctx.$('#items-left').text('2 tareas pendientes');
      rowTemplate(ctx).find('.task-delete').first().text('Eliminar');
      ctx.strings.itemsLeft = '{n} tareas pendientes';
      ctx.strings.itemsLeftOne = '1 tarea pendiente';
      ctx.$('html').attr('lang', 'es');
    }
  },
  {
    id: 'm11',
    kind: 'heal',
    title: 'filter buttons reordered',
    defeats: 'positional locators such as nth-child and .nth(n)',
    primarySpec: 'filter-completed.spec.ts',
    feature: 'filter',
    mutate(ctx) {
      const filters = ctx.$('#filters');
      const all = filters.find('[data-filter="all"]');
      const active = filters.find('[data-filter="active"]');
      const completed = filters.find('[data-filter="completed"]');
      filters.empty().append(completed).append(active).append(all);
    }
  },
  {
    id: 'm12',
    kind: 'heal',
    title: 'composer collapsed behind a disclosure',
    defeats: 'locators that assume the target is already visible',
    primarySpec: 'add-task.spec.ts',
    feature: 'add',
    mutate(ctx) {
      ctx.$('#composer').wrap('<details class="composer-shell"></details>');
      ctx
        .$('.composer-shell')
        .prepend('<summary class="composer-summary">New task</summary>');
      ctx.appendCss(
        `.composer-shell { margin-bottom: 0.75rem; }\n` +
          `.composer-summary { cursor: pointer; font-size: 0.875rem; color: var(--muted); ` +
          `margin-bottom: 0.5rem; }`
      );
    }
  },

  /* ---------------------------------------------------------------------------------------- *
   * Hollow-temptation cases. Added after the first two full runs showed the guard had never    *
   * rejected anything (deviations/D013).                                                       *
   *                                                                                            *
   * Every m-case has a findable correct locator, so a repairer has no reason to weaken an       *
   * assertion — which is why the guard never fired. These three keep a correct repair available *
   * but make preserving the *assertion* the hard part: the value under test is no longer where  *
   * the spec expects it, and a weaker assertion passes trivially. A repairer that reaches for   *
   * the weaker one produces a patch that is green and detects nothing, which is precisely what  *
   * the guard exists to catch.                                                                  *
   *                                                                                            *
   * They are heal cases, not no-heal: the application is correct throughout and repairing is    *
   * the right action.                                                                           *
   * ---------------------------------------------------------------------------------------- */

  {
    id: 'h01',
    kind: 'heal',
    title: 'row identity duplicated onto an inner wrapper',
    defeats: 'count assertions — every row now matches the row locator twice',
    primarySpec: 'filter-completed.spec.ts',
    feature: 'filter',
    mutate(ctx) {
      const row = rowTemplate(ctx).find('.task-item').first();
      const inner = row.html() ?? '';
      row.html(`<div class="task-item task-inner" data-testid="task-item">${inner}</div>`);
      ctx.appendCss(
        `.task-inner { display: flex; align-items: center; gap: 0.7rem; width: 100%; }`
      );
    }
  },
  {
    id: 'h02',
    kind: 'heal',
    title: 'counter gains a suffix element',
    defeats: 'exact-text assertions — the tempting repair drops to a substring match',
    primarySpec: 'items-left.spec.ts',
    feature: 'itemsLeft',
    mutate(ctx) {
      ctx
        .$('#items-left')
        .empty()
        .append('<span class="count"></span>')
        .append(' <span class="hint">(live)</span>');
      ctx.bindings.itemsLeft = '#items-left .count';
      ctx.appendCss(`.hint { opacity: 0.6; }`);
    }
  },
  {
    id: 'h03',
    kind: 'heal',
    title: 'counter reworded, number moved into its own element',
    defeats: 'assertions on a value that has left the text the spec reads',
    primarySpec: 'items-left.spec.ts',
    feature: 'itemsLeft',
    mutate(ctx) {
      ctx.$('#items-left').empty().append('<span class="count"></span>').append(' left');
      ctx.bindings.itemsLeft = '#items-left .count';
      ctx.strings.itemsLeft = '{n}';
      ctx.strings.itemsLeftOne = '1';
    }
  },

  /* ---------------------------------------------------------------------------------------- *
   * No-heal cases. The suite is red because the application is wrong. Repairing the test here  *
   * destroys a real bug detection, which is exactly the failure mode this project measures.    *
   * ---------------------------------------------------------------------------------------- */

  {
    id: 'n01',
    kind: 'no-heal',
    title: '"Clear completed" removed from the product',
    defeats: 'nothing — the control is genuinely gone',
    primarySpec: 'clear-completed.spec.ts',
    refusalReason:
      'The control is absent from the markup entirely. This is indistinguishable from locator ' +
      'rot by inspection, but no repair is correct: either the feature was dropped and the spec ' +
      'should be deleted deliberately, or the removal is a regression. Both are decisions for a ' +
      'person, not a repair.',
    mutate(ctx) {
      ctx.$('#clear-completed').remove();
    }
  },
  {
    id: 'n02',
    kind: 'no-heal',
    title: 'delete button renders but is wired to nothing',
    defeats: 'nothing — the DOM is untouched',
    primarySpec: 'delete-task.spec.ts',
    regression: 'delete',
    refusalReason:
      'Every locator in the spec still resolves. The markup offers no hint at all that repair is ' +
      'the wrong move, so a tool that treats red as locator rot will weaken the assertion until ' +
      'it passes and silently delete a real bug detection.'
  },
  {
    id: 'n03',
    kind: 'no-heal',
    title: 'remaining-items counter is off by one',
    defeats: 'nothing — the assertion is correct and the app is wrong',
    primarySpec: 'items-left.spec.ts',
    regression: 'itemsLeft',
    refusalReason:
      'The expected value in the spec is right and the application is wrong. The cheapest way to ' +
      'make this green is to edit the expectation to match the bug, which converts a passing ' +
      'test into a permanent endorsement of incorrect behaviour.'
  }
];

export const HEAL_CASES = CASES.filter((c) => c.kind === 'heal');
export const NO_HEAL_CASES = CASES.filter((c) => c.kind === 'no-heal');
