// IA en la nube (Gemini, desde tu Google Drive): revisa fotos de platos, etiquetas nutricionales y alimentos escritos
// aunque el PC esté apagado. Cada pedido se guarda en el aparato hasta que se resuelve:
//   - sin internet → se reintenta solo cuando vuelve la conexión;
//   - si Gemini falla (o se acaba su límite gratis) → pasa a Claude en el PC (cola de fotos de la nube / server.mjs).
// El resultado se anota igual que lo hacía el PC: los alimentos del día con id "<pedido>-<n>", el pedido queda "hecho"
// y los alimentos nuevos se agregan a tu base.
(function () {
  const S = window.Store, M = window.NutriMerge;
  const K_COLA = 'nutrifit.ia';
  const cola = () => { try { return JSON.parse(localStorage.getItem(K_COLA) || '[]'); } catch (e) { return []; } };
  function guardar(c) {
    try { localStorage.setItem(K_COLA, JSON.stringify(c)); }
    catch (e) { while (c.length > 1) { c.shift(); try { localStorage.setItem(K_COLA, JSON.stringify(c)); return; } catch (er) { /* */ } } }
  }
  const r1 = (x) => Math.round(x * 10) / 10;
  const n1 = (x) => (x === null || x === undefined || x === '' || isNaN(+x) ? null : r1(+x));

  function conocidos() {
    return [...new Set([...window.FOODS.map((f) => f.n), ...Object.values(S.foods()).map((f) => f && f.n).filter(Boolean)])].join('; ');
  }

  // Mismo formato que devuelve Claude en el PC
  function normalizar(r) {
    r = r || {};
    r.items = (r.items || []).map((x) => ({
      nombre: String(x.nombre || 'Alimento'), gramos: x.gramos ?? null, ml: x.ml ?? null,
      kcal: Math.round(+x.kcal || 0), proteina: Math.round(+x.proteina || 0), carbohidratos: Math.round(+x.carbohidratos || 0), grasa: Math.round(+x.grasa || 0), fibra: r1(+x.fibra || 0),
      extra: x.extra,
    }));
    r.total_kcal = r.items.reduce((t, x) => t + x.kcal, 0);
    return r;
  }

  // Anota en el día lo encontrado (igual que anotarResultado en server.mjs) y agrega los alimentos nuevos.
  function anotar(job, res, src) {
    const { perfil, dia, meal, at } = job.meta;
    let quedo = 'ok';
    S.update(perfil, (p) => {
      p.food = p.food || {};
      const lista = p.food[dia] = p.food[dia] || [];
      const ph = lista.find((e) => e.id === job.id);
      if (ph && ph.deleted && !ph.hecho) { quedo = 'cancelada'; return; }
      if (ph && ph.hecho) { quedo = 'ya'; return; }
      const ahora = Date.now();
      const poner = (e) => { const i = lista.findIndex((x) => x.id === e.id); if (i >= 0) lista[i] = e; else lista.push(e); };
      const base = { ...(ph || {}), id: job.id, at: ph?.at || at || ahora, meal: ph?.meal || meal || 'almuerzo', src, name: ph?.name || 'Foto del plato', kcal: 0 };
      delete base.aviso;
      if (!res.items.length) { poner({ ...base, pend: false, err: res.nota || (src === 'foto' ? 'No se reconoció comida en la foto' : 'No se pudo calcular'), t: ahora }); quedo = 'sin-comida'; return; }
      res.items.forEach((x, i) => poner({
        id: `${job.id}-${i}`, at: base.at + i, t: ahora, meal: base.meal, src, foto: job.id,
        name: x.nombre, gr: x.gramos || null, ml: x.ml || null, kcal: x.kcal, p: x.proteina, c: x.carbohidratos, g: x.grasa, fb: x.fibra || 0, ...(x.extra || {}),
      }));
      poner({ ...base, pend: false, hecho: true, deleted: true, t: ahora, plato: res.plato || '', confianza: res.confianza || 'media', nota: res.nota || '', total: res.total_kcal, ia: 'gemini' });
    }, false);
    if (quedo !== 'ok') return quedo;
    // Alimentos que no estaban en la base (por 100 g o 100 ml)
    const ya = new Set([...window.FOODS.map((f) => M.normNombre(f.n)), ...Object.keys(S.foods())]);
    for (const x of res.items) {
      const cant = x.ml || x.gramos;
      const nombre = String(x.nombre).replace(/\s*\((?:\d|una?\b|medi|porci|unidad)[^)]*\)\s*$/i, '').trim() || x.nombre;
      const k = M.normNombre(nombre);
      if (!cant || cant <= 0 || !x.kcal || ya.has(k)) continue;
      const f = 100 / cant;
      S.setFood(k, { n: nombre, kcal: Math.round(x.kcal * f), p: r1(x.proteina * f), c: r1(x.carbohidratos * f), g: r1(x.grasa * f), fb: r1((x.fibra || 0) * f), ml: !!x.ml, porcion: Math.round(cant), u: 'agregado por la IA', src: 'claude', t: Date.now() });
      ya.add(k);
    }
    return quedo;
  }

  // Etiqueta → alimento completo en tu base (igual que alimentoDeEtiqueta en server.mjs)
  function alimentoDeEtiqueta(r, nombre) {
    const c = r.por100 || {};
    const f = {
      n: nombre || r.nombre, kcal: Math.round(+c.kcal || 0), p: n1(c.proteina) ?? 0, c: n1(c.carbohidratos) ?? 0, g: n1(c.grasa_total) ?? 0, fb: n1(c.fibra) ?? 0,
      sat: n1(c.grasa_saturada), mono: n1(c.grasa_mono), poli: n1(c.grasa_poli), trans: n1(c.grasa_trans), col: n1(c.colesterol_mg), azu: n1(c.azucares), sod: n1(c.sodio_mg),
      ml: !!r.liquido, porcion: n1(r.porcion?.cantidad) || 100, u: r.porcion?.texto ? 'porción: ' + r.porcion.texto : 'de la etiqueta',
      sellos: Array.isArray(r.sellos) ? r.sellos.filter(Boolean).slice(0, 4) : [], src: 'etiqueta', t: Date.now(),
    };
    const otros = {};
    for (const o of Array.isArray(r.otros) ? r.otros : []) {
      const v = n1(o?.por100), nd = String(o?.nombre || '').trim().slice(0, 40);
      if (nd && v !== null) otros[nd] = [v, String(o.unidad || '').trim().slice(0, 8)];
    }
    if (Object.keys(otros).length) f.otros = otros;
    for (const k of Object.keys(f)) if (f[k] === null) delete f[k];
    return f;
  }

  function aplicar(job, r) {
    if (job.tipo === 'etiqueta') {
      if (!r.por100 || !(+r.por100.kcal >= 0)) {
        S.update(job.meta.perfil, (p) => { const ph = p.food?.[job.meta.dia]?.find((x) => x.id === job.id); if (ph) Object.assign(ph, { pend: false, err: 'No se pudo leer la etiqueta: ' + (r.nota || 'foto poco clara'), t: Date.now() }); }, false);
        return { ok: false, nota: r.nota };
      }
      const ali = alimentoDeEtiqueta(r, job.meta.nombre);
      S.setFood(M.normNombre(ali.n), ali);
      const cant = r.consumo && (r.consumo.gramos || r.consumo.ml);
      if (job.meta.cant && cant) {
        const k = cant / 100, extra = {};
        for (const x of ['sat', 'mono', 'poli', 'trans', 'col', 'azu', 'sod']) if (ali[x] !== undefined) extra[x] = r1(ali[x] * k);
        if (ali.otros) extra.otros = Object.fromEntries(Object.entries(ali.otros).map(([n, [v, u]]) => [n, [Math.round(v * k * 100) / 100, u]]));
        anotar(job, normalizar({
          plato: ali.n, confianza: r.confianza || 'alta', nota: r.porcion?.texto ? 'Según la etiqueta (porción: ' + r.porcion.texto + ').' : 'Según la etiqueta.',
          items: [{ nombre: ali.n, gramos: ali.ml ? null : cant, ml: ali.ml ? cant : null, kcal: Math.round(ali.kcal * k), proteina: ali.p * k, carbohidratos: ali.c * k, grasa: ali.g * k, fibra: ali.fb * k, extra }],
        }), 'etiqueta');
      }
      return { ok: true, alimento: ali };
    }
    return { ok: true, quedo: anotar(job, normalizar(r), job.tipo === 'plato' ? 'foto' : 'claude') };
  }

  // Si la IA de la nube no puede, el pedido pasa a Claude en el PC (como antes).
  const K_PC = 'nutrifit.iaPC';
  const alPCids = () => { try { return JSON.parse(localStorage.getItem(K_PC) || '[]'); } catch (e) { return []; } };
  function alPC(job) {
    try { localStorage.setItem(K_PC, JSON.stringify(alPCids().concat(job.id).slice(-100))); } catch (e) { /* */ }
    if (job.tipo === 'texto') return; // el PC revisa los "La IA calcula…" que llevan rato esperando
    window.Sync.encolarFoto({ id: job.id, b64: job.b64, tipo: 'image/jpeg', meta: job.tipo === 'etiqueta' ? { tipo: 'etiqueta', ...job.meta } : job.meta });
  }

  const trabajando = new Set();
  async function resolver(job) {
    if (trabajando.has(job.id)) return;
    trabajando.add(job.id);
    try {
      const texto = job.tipo === 'texto' ? `Alimento: ${job.consulta}\nCantidad que comí: ${job.cant || 'no la sé (usa una porción normal)'}`
        : job.tipo === 'etiqueta' ? `Producto: ${job.meta.nombre || '(sin nombre)'}\nCuánto comí: ${job.meta.cant || 'nada todavía, solo quiero guardar el producto'}`
        : 'Analiza esta comida.';
      const r = await window.Sync.ia(job.tipo, { b64: job.b64, texto, conocidos: job.tipo === 'etiqueta' ? '' : conocidos() });
      const out = aplicar(job, r.resultado || {});
      quitar(job.id);
      window.dispatchEvent(new CustomEvent('ia-lista', { detail: { id: job.id, tipo: job.tipo, ...out } }));
      window.Sync.sync();
    } catch (e) {
      if (e.codigo === 'red' || e.clave) return; // sin internet: se reintenta después
      job.fallos = (job.fallos || 0) + 1;
      // Sin clave de Gemini, límite gratis alcanzado o errores repetidos → Claude en el PC
      if (e.codigo === 'sin_ia' || e.codigo === 'limite' || job.fallos >= 2) {
        alPC(job);
        quitar(job.id);
        window.dispatchEvent(new CustomEvent('ia-lista', { detail: { id: job.id, tipo: job.tipo, alPC: true, motivo: e.message } }));
        window.Sync.sync();
      } else actualizar(job);
    } finally { trabajando.delete(job.id); }
  }
  function quitar(id) { guardar(cola().filter((j) => j.id !== id)); }
  function actualizar(job) { guardar(cola().map((j) => (j.id === job.id ? job : j))); }

  let corriendo = false;
  async function procesar() {
    if (corriendo || !window.Sync.conectado()) return;
    corriendo = true;
    try { for (const job of cola()) await resolver(job); } finally { corriendo = false; }
  }

  // Los "Claude calcula…" que quedaron esperando (por ejemplo, anotados sin internet o en otro aparato) también se resuelven aquí
  function pendientesEscritos() {
    const ya = new Set([...cola().map((j) => j.id), ...alPCids()]);
    for (const p of S.profiles()) for (const [dia, lista] of Object.entries(p.food || {})) for (const e of lista) {
      if (e.pend && e.consulta && !e.etiqueta && !e.deleted && !ya.has(e.id)) {
        const c = cola(); c.push({ id: e.id, tipo: 'texto', consulta: e.consulta, cant: e.cant || '', meta: { perfil: p.id, dia, meal: e.meal, at: e.at } }); guardar(c);
      }
    }
  }

  function pedir(job) { const c = cola(); c.push(job); guardar(c); procesar(); }

  window.IA = {
    pedir, procesar, enCola: (id) => cola().some((j) => j.id === id), trabajando: (id) => trabajando.has(id),
  };
  // Se reintenta al volver internet, al volver a la app y cada vez que se sincroniza
  window.addEventListener('online', () => procesar());
  window.Sync.onStatus((st) => { if (st.status === 'ok') { pendientesEscritos(); procesar(); } });
  setTimeout(procesar, 1500);
})();
