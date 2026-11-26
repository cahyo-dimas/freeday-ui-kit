// A fetchPage whose answers the test releases: window.__calls holds every request in order, and
// window.__answer(i) / window.__fail(i) settle the i-th one. Rows are named "<query>|<page>|<n>",
// so a spec can tell from the list alone which request each row came from.
window.__calls = [];
export function controlledFetch(query, page) {
  return new Promise((resolve, reject) => {
    window.__calls.push({ query, page, resolve, reject });
  });
}
window.__answer = (i) => {
  const c = window.__calls[i];
  const q = c.query === '' ? 'all' : c.query;
  c.resolve({ rows: [0, 1, 2].map((n) => ({ name: `${q}|${c.page}|${n}` })), hasMore: true });
};
window.__fail = (i) => { window.__calls[i].reject(new Error('offline')); };
