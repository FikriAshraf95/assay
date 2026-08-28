/* Behaviour defect injected by the fixture builder. The DOM is identical to the
   sibling variant; only what the app does has changed. */
window.Taskly.activeCount = function () {
  return this.tasks.filter(function (t) { return !t.done; }).length + 1;
};
