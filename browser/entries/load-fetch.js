// A fetcher the TEST settles: window.__loads holds every request with its filter and AbortSignal,
// and window.__answer(i) / window.__fail(i) settle the i-th one.
window.__loads = [];
export function controlledLoad(filter, signal) {
  return new Promise((resolve, reject) => {
    window.__loads.push({ filter, signal, resolve, reject });
  });
}
window.__answer = (i) => { const l = window.__loads[i]; l.resolve(`rows for ${l.filter}`); };
window.__fail = (i) => { window.__loads[i].reject(new Error('offline')); };
