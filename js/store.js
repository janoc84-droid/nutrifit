// Persistencia local (localStorage). Cada cambio guarda la hora (updatedAt / t) para poder
// sincronizar con la nube (js/sync.js) sin perder avances de ningún aparato.
(function () {
  const KEY = 'calistenia.v1';
  const DRAFT_KEY = 'calistenia.draft';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); d.deleted = d.deleted || {}; d.foods = d.foods || {}; return d; }
    } catch (e) { /* almacenamiento no disponible */ }
    return { profiles: [], deleted: {}, foods: {} };
  }

  let db = load();
  const listeners = [];

  function save(notify = true) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sin almacenamiento */ }
    if (notify) listeners.forEach((fn) => fn());
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  window.Store = {
    profiles: () => db.profiles,
    get: (id) => db.profiles.find((p) => p.id === id),
    create(answers, plan) {
      const now = Date.now();
      const p = { id: uid(), createdAt: now, updatedAt: now, answers, plan, log: {}, weights: [{ date: now, kg: answers.weight }] };
      db.profiles.unshift(p);
      save();
      return p;
    },
    // touch = false: el cambio no cuenta como edición del perfil (por ejemplo, anotar una comida, que
    // se une registro por registro). Así otro aparato no pierde sus cambios de plan o de respuestas.
    update(id, fn, touch = true) {
      const p = this.get(id);
      if (p) { fn(p); if (touch) p.updatedAt = Date.now(); save(); }
      return p;
    },
    // Alimentos agregados (por Claude o a mano), por 100 g o 100 ml
    foods: () => db.foods || {},
    setFood(k, f) { db.foods = db.foods || {}; db.foods[k] = f; save(); },
    remove(id) {
      db.profiles = db.profiles.filter((p) => p.id !== id);
      db.deleted[id] = Date.now();
      save();
    },
    // Datos para la nube y reemplazo con la versión unida
    snapshot: () => JSON.parse(JSON.stringify({ profiles: db.profiles, deleted: db.deleted, foods: db.foods || {} })),
    replaceAll(data) {
      const before = JSON.stringify([db.profiles, db.foods]);
      db = { profiles: data.profiles || [], deleted: data.deleted || {}, foods: data.foods || {} };
      save(false);
      return before !== JSON.stringify([db.profiles, db.foods]);
    },
    onChange: (fn) => listeners.push(fn),
    exportJSON: () => JSON.stringify({ app: 'calistenia', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2),
    importJSON(text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data.profiles)) throw new Error('Archivo no válido');
      const ids = new Set(db.profiles.map((p) => p.id));
      let added = 0;
      for (const p of data.profiles) if (!ids.has(p.id)) { db.profiles.push({ ...p, updatedAt: Date.now() }); added++; }
      save();
      return added;
    },
    saveDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* */ } },
    loadDraft() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch (e) { return null; } },
    clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* */ } },
  };
})();
