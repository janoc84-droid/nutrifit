// Une los datos de dos aparatos sin perder nada. Lo usan la app (js/sync.js) y el PC (server.mjs).
// - Perfiles: los campos generales los decide el cambio más reciente; las sesiones, pesos y comidas
//   se juntan registro por registro.
// - Alimentos agregados (por Claude o a mano): por cada alimento gana el cambio más reciente.
(function (root) {
  function mergeProfile(a, b) {
    const [newer, older] = (a.updatedAt || a.createdAt) >= (b.updatedAt || b.createdAt) ? [a, b] : [b, a];
    const log = { ...older.log };
    for (const [k, l] of Object.entries(newer.log || {})) {
      const o = log[k];
      if (!o) { log[k] = l; continue; }
      // Series: se suman las marcadas en cualquiera de los dos. Sesión completada: decide el cambio más reciente.
      const sets = { ...o.sets };
      for (const [i, arr] of Object.entries(l.sets || {})) {
        const prev = sets[i] || [];
        sets[i] = Array.from({ length: Math.max(prev.length, (arr || []).length) }, (_, s) => !!(prev[s] || arr?.[s]));
      }
      const last = (l.date || 0) >= (o.date || 0) ? l : o;
      log[k] = { ...o, ...l, sets, done: !!last.done, date: last.date, note: l.note || o.note };
    }
    const seen = new Set();
    const weights = [...(older.weights || []), ...(newer.weights || [])]
      .filter((w) => { const k = w.date + ':' + w.kg; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((x, y) => x.date - y.date);
    // Comidas: se juntan las de ambos aparatos; por cada registro gana el cambio más reciente (también los borrados)
    const food = {};
    for (const src of [older.food || {}, newer.food || {}]) {
      for (const [day, list] of Object.entries(src)) {
        const byId = new Map((food[day] || []).map((e) => [e.id, e]));
        for (const e of list) { const o = byId.get(e.id); if (!o || (e.t || 0) >= (o.t || 0)) byId.set(e.id, e); }
        food[day] = [...byId.values()].sort((x, y) => (x.at || 0) - (y.at || 0) || String(x.id).localeCompare(String(y.id)));
      }
    }
    return { ...newer, log, weights, food };
  }

  function mergeFoods(a, b) {
    const out = { ...(a || {}) };
    for (const [k, f] of Object.entries(b || {})) { const o = out[k]; if (!o || (f.t || 0) >= (o.t || 0)) out[k] = f; }
    return out;
  }

  function merge(server, client) {
    server = server || {}; client = client || {};
    const deleted = { ...server.deleted };
    for (const [id, ts] of Object.entries(client.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, ts);
    const byId = new Map();
    for (const p of [...(server.profiles || []), ...(client.profiles || [])]) {
      const cur = byId.get(p.id);
      byId.set(p.id, cur ? mergeProfile(cur, p) : p);
    }
    const profiles = [...byId.values()]
      .filter((p) => !(deleted[p.id] >= (p.updatedAt || p.createdAt)))
      .sort((x, y) => y.createdAt - x.createdAt);
    return { profiles, deleted, foods: mergeFoods(server.foods, client.foods) };
  }

  // Texto con las claves ordenadas: sirve para saber si dos versiones son iguales.
  function canon(x) {
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (x && typeof x === 'object') return '{' + Object.keys(x).filter((k) => x[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  const iguales = (a, b) => canon(a) === canon(b);

  // Nombre de alimento para comparar: sin tildes, mayúsculas ni espacios de más.
  const normNombre = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  root.NutriMerge = { merge, mergeProfile, mergeFoods, canon, iguales, normNombre };
})(typeof window !== 'undefined' ? window : globalThis);
