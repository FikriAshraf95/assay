/*
 * Taskly — the fixture application under test.
 *
 * The BINDINGS block below is rewritten per variant by src/fixtures/build.ts, so a mutation that
 * renames every class in the DOM leaves the application itself working. Mutations change how the
 * app *looks*; they never change what it *does*. Behaviour is broken only by the defect patches in
 * src/fixtures/cases.ts, which load as a separate script after this file.
 */

/* --- BINDINGS:START --- */
const SEL = {
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

const STRINGS = {
  itemsLeft: '{n} items left',
  itemsLeftOne: '1 item left'
};
/* --- BINDINGS:END --- */

const SEED = [
  { id: 1, title: 'Write the reproduction guide', done: false },
  { id: 2, title: 'Record the demo video', done: false },
  { id: 3, title: 'Pin the evaluation set', done: true }
];

let rowHtml = '';

const Taskly = {
  tasks: SEED.map((task) => ({ ...task })),
  filter: 'all',
  query: '',
  nextId: 4,

  addTask(title) {
    const trimmed = String(title).trim();
    if (!trimmed) return false;
    this.tasks.push({ id: this.nextId++, title: trimmed, done: false });
    return true;
  },

  toggleTask(id) {
    const task = this.tasks.find((candidate) => candidate.id === id);
    if (task) task.done = !task.done;
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  },

  clearCompleted() {
    this.tasks = this.tasks.filter((task) => !task.done);
  },

  activeCount() {
    return this.tasks.filter((task) => !task.done).length;
  },

  visibleTasks() {
    const query = this.query.trim().toLowerCase();
    return this.tasks.filter((task) => {
      if (this.filter === 'active' && task.done) return false;
      if (this.filter === 'completed' && !task.done) return false;
      if (query && !task.title.toLowerCase().includes(query)) return false;
      return true;
    });
  },

  buildRow(task) {
    const wrapper = document.createElement('ul');
    wrapper.innerHTML = rowHtml;
    const row = wrapper.firstElementChild;
    if (!row) return null;

    row.dataset.taskId = String(task.id);

    const title = row.querySelector(SEL.rowTitle);
    if (title) title.textContent = task.title;

    const toggle = row.querySelector(SEL.rowToggle);
    if (toggle) {
      toggle.checked = task.done;
      toggle.setAttribute('aria-label', `Toggle ${task.title}`);
      toggle.addEventListener('change', () => {
        Taskly.toggleTask(task.id);
        Taskly.render();
      });
    }

    const remove = row.querySelector(SEL.rowDelete);
    if (remove) {
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        Taskly.deleteTask(task.id);
        Taskly.render();
      });
    }

    if (task.done) row.classList.add(SEL.completedRowClass);
    return row;
  },

  render() {
    const list = document.querySelector(SEL.taskList);
    if (!list) return;

    list.textContent = '';
    const visible = Taskly.visibleTasks();
    for (const task of visible) {
      const row = Taskly.buildRow(task);
      if (row) list.append(row);
    }

    const empty = document.querySelector(SEL.emptyState);
    if (empty) empty.hidden = visible.length > 0;

    const counter = document.querySelector(SEL.itemsLeft);
    if (counter) {
      const n = Taskly.activeCount();
      counter.textContent =
        n === 1 ? STRINGS.itemsLeftOne : STRINGS.itemsLeft.replace('{n}', String(n));
    }
  },

  mount() {
    const template = document.querySelector(SEL.rowTemplate);
    if (template) {
      rowHtml = template.innerHTML.trim();
      template.remove();
    }

    document.querySelector(SEL.composer)?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.querySelector(SEL.newTaskInput);
      if (!input) return;
      if (Taskly.addTask(input.value)) input.value = '';
      Taskly.render();
    });

    document.querySelector(SEL.searchInput)?.addEventListener('input', (event) => {
      Taskly.query = event.target.value;
      Taskly.render();
    });

    for (const button of document.querySelectorAll(SEL.filterButton)) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        Taskly.filter = button.dataset.filter ?? 'all';
        for (const other of document.querySelectorAll(SEL.filterButton)) {
          other.classList.toggle(SEL.activeFilterClass, other === button);
        }
        Taskly.render();
      });
    }

    document.querySelector(SEL.clearCompleted)?.addEventListener('click', () => {
      Taskly.clearCompleted();
      Taskly.render();
    });

    Taskly.render();
  }
};

window.Taskly = Taskly;
window.addEventListener('DOMContentLoaded', () => Taskly.mount());
