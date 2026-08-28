/* Behaviour defect injected by the fixture builder. The DOM is identical to the
   sibling variant; only what the app does has changed. */
window.Taskly.addTask = function (title) {
  this.tasks.push({ id: this.nextId++, title: String(title), done: false });
  return true;
};
