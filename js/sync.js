// Sincronización con la nube de Nutrifit (un pequeño programa en tu Google Drive: nube/Code.gs).
// - Todo se guarda primero en el aparato: si no hay internet, se envía después.
// - Cada aparato lee lo de la nube, lo une con lo suyo (js/merge.js) y guarda el resultado.
// - Las fotos de platos quedan en la nube hasta que el PC (server.mjs) las revisa con Claude.
// Cada aparato se conecta una sola vez con el código de conexión; después queda conectado.
(function () {
  const S = window.Store, M = window.NutriMerge;
  const NUBE = window.NUBE || {};
  const K_CLAVE = 'nutrifit.clave', K_REV = 'nutrifit.rev', K_SUCIO = 'nutrifit.sucio', K_FOTOS = 'nutrifit.fotos', K_ULT = 'nutrifit.ultimo';
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };
  const state = { status: 'idle', last: Number(ls.get(K_ULT)) || null, error: null, pc: 0, pcVisto: 0, fotos: 0 };
  const subs = [];
  const emit = () => subs.forEach((fn) => { try { fn(state); } catch (e) { console.warn(e); } });

  const normal = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bonita = (t) => normal(t).replace(/(.{4})(?=.)/g, '$1-');
  const url = () => NUBE.url || '';
  const clave = () => ls.get(K_CLAVE) || NUBE.clave || '';
  const conectado = () => !!(url() && clave());

  // El código puede llegar en el link: …/nutrifit/#clave=XXXX-XXXX-XXXX
  (function leerLink() {
    const m = /[#&?]clave=([A-Za-z0-9-]+)/.exec(location.hash + location.search);
    if (!m) return;
    ls.set(K_CLAVE, bonita(m[1]));
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* */ }
  })();

  async function llamar(op, extra = {}, ms = 30000, k = clave()) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), ms);
    try {
      // text/plain evita la consulta previa del navegador; Google responde con permiso para cualquier página.
      const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ k, op, ...extra }), redirect: 'follow', signal: ctrl.signal });
      if (!r.ok) throw new Error('La nube respondió con error ' + r.status);
      const j = await r.json();
      if (j.error === 'clave') { const e = new Error('El código de conexión no es correcto'); e.clave = true; throw e; }
      if (j.ok === false && !j.conflicto) throw new Error('La nube no pudo hacerlo (' + (j.mensaje || j.error) + ')');
      return j;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('La nube no respondió a tiempo');
      if (e instanceof TypeError) throw new Error('Sin internet');
      throw e;
    } finally { clearTimeout(to); }
  }

  let ediciones = 0;
  let sucio = ls.get(K_SUCIO) === '1';
  const marcar = (v) => { sucio = v; ls.set(K_SUCIO, v ? '1' : '0'); };
  S.onChange(() => { ediciones++; marcar(true); clearTimeout(timer); timer = setTimeout(sync, 1500); });

  let timer = null, running = false, again = false;
  function anotarPC(r) {
    if (r && typeof r.pc === 'number') { state.pc = r.pc; state.pcVisto = Date.now(); }
    if (r && typeof r.fotos === 'number') state.fotos = r.fotos;
  }

  async function sync() {
    if (!conectado()) { state.status = url() ? 'sinclave' : 'local'; emit(); return false; }
    if (running) { again = true; return false; }
    running = true;
    if (sucio || state.status !== 'ok') { state.status = 'syncing'; emit(); }
    try {
      await subirFotos();
      const conocida = Number(ls.get(K_REV));
      let r = await llamar('leer', { rev: sucio || !ls.get(K_REV) ? -1 : conocida });
      anotarPC(r);
      let cambio = false;
      if (r.datos !== undefined) {
        const inicio = ediciones;
        let rev = r.rev, remoto = r.datos;
        let unido = M.merge(remoto, S.snapshot());
        for (let intento = 0; !M.iguales(unido, remoto || {}) && intento < 5; intento++) {
          const g = await llamar('guardar', { base: rev, datos: unido });
          if (g.ok) { rev = g.rev; break; }
          // Otro aparato guardó justo antes: se vuelve a leer y a unir.
          r = await llamar('leer', { rev: -1 });
          rev = r.rev; remoto = r.datos;
          unido = M.merge(remoto, unido);
        }
        // Si se anotó algo mientras tanto, se conserva y se envía en la próxima vuelta.
        if (ediciones !== inicio) { unido = M.merge(unido, S.snapshot()); again = true; } else marcar(false);
        cambio = S.replaceAll(unido);
        ls.set(K_REV, String(rev));
      } else marcar(false);
      state.status = 'ok'; state.last = Date.now(); state.error = null;
      ls.set(K_ULT, String(state.last));
      emit();
      if (cambio) window.dispatchEvent(new Event('store-synced'));
      return true;
    } catch (e) {
      state.status = e.clave ? 'clave' : 'offline'; state.error = e.message; emit();
      return false;
    } finally {
      running = false;
      if (again) { again = false; setTimeout(sync, 300); }
    }
  }

  // Prueba un código antes de guardarlo
  async function connect(code) {
    const k = bonita(code);
    if (normal(k).length < 8) throw new Error('El código tiene 12 letras y números, por ejemplo ABCD-EFGH-JKLM');
    if (!url()) throw new Error('La nube todavía no está configurada en esta versión de la app');
    await llamar('leer', { rev: -2 }, 30000, k);
    ls.set(K_CLAVE, k);
    ls.del(K_REV);
    await sync();
    return true;
  }
  function disconnect() { ls.del(K_CLAVE); ls.del(K_REV); state.status = 'sinclave'; emit(); }

  // ---------- Fotos de platos ----------
  // La foto se guarda en el aparato hasta que llega a la nube; el PC la revisa con Claude cuando está encendido.
  const colaFotos = () => { try { return JSON.parse(ls.get(K_FOTOS) || '[]'); } catch (e) { return []; } };
  function guardarCola(c) {
    try { localStorage.setItem(K_FOTOS, JSON.stringify(c)); }
    catch (e) { while (c.length > 1) { c.shift(); try { localStorage.setItem(K_FOTOS, JSON.stringify(c)); return; } catch (er) { /* */ } } }
  }
  function encolarFoto(f) { const c = colaFotos(); c.push(f); guardarCola(c); }
  async function subirFotos() {
    let c = colaFotos();
    while (c.length) {
      const f = c[0];
      await llamar('foto', { id: f.id, b64: f.b64, tipo: f.tipo || 'image/jpeg', meta: f.meta }, 60000);
      c = colaFotos().filter((x) => x.id !== f.id);
      guardarCola(c);
    }
  }
  const fotosSinSubir = () => colaFotos().length;
  // El PC avisa a la nube cada 20 segundos mientras está encendido.
  function pcEncendido() {
    if (!state.pc || !state.pcVisto) return false;
    return state.pcVisto - state.pc < 90000;
  }

  // Mientras se espera una foto, se revisa más seguido.
  let vigilando = 0, vigiaTimer = null;
  function vigilar(on) {
    vigilando = Math.max(0, vigilando + (on ? 1 : -1));
    clearInterval(vigiaTimer);
    if (vigilando) vigiaTimer = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 6000);
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  window.addEventListener('online', () => sync());
  setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 30000);

  window.Sync = {
    sync, connect, disconnect, state, native, conectado, clave: () => bonita(clave()), configurada: () => !!url(),
    encolarFoto, fotosSinSubir, pcEncendido, vigilar,
    onStatus: (fn) => subs.push(fn),
  };
  sync();
})();
