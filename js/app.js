// Interfaz: enrutado por hash, cuestionario, vista del plan, sesión de entrenamiento y temporizador.
(function () {
  const C = window.APP_CONFIG;
  const P = window.Planner;
  const S = window.Store;
  const $app = document.getElementById('app');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const val = (v, a) => (typeof v === 'function' ? v(a) : v);
  const fmtDate = (d) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = (d) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const $ = (sel) => $app.querySelector(sel);
  const $$ = (sel) => [...$app.querySelectorAll(sel)];

  document.title = C.name;

  // Apariencia: automático (según el dispositivo), claro u oscuro. Los colores están en css/styles.css.
  function themePref() { try { return localStorage.getItem('nutrifit.tema') || 'auto'; } catch (e) { return 'auto'; } }
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  function applyTheme() {
    const t = themePref();
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark !== isDark()) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', dark ? '#0F1115' : '#16181D');
      return true;
    }
    return false;
  }
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themePref() === 'auto' && applyTheme()) location.reload(); });
  function themeSelect() {
    const t = themePref();
    return `<select id="themesel">
      <option value="auto" ${t === 'auto' ? 'selected' : ''}>🌓 Automático</option>
      <option value="light" ${t === 'light' ? 'selected' : ''}>☀️ Claro</option>
      <option value="dark" ${t === 'dark' ? 'selected' : ''}>🌙 Oscuro</option>
    </select>`;
  }
  function bindThemeSelect() {
    const sel = document.getElementById('themesel');
    if (sel) sel.onchange = () => { try { localStorage.setItem('nutrifit.tema', sel.value); } catch (e) { /* */ } location.reload(); };
  }

  const GOAL_LABELS = { muscle: 'Ganar músculo', lose: 'Perder peso', recomp: 'Recomposición', skills: 'Habilidades', fitness: 'Forma física' };
  const EVENT_LABELS = { vacation: 'tus vacaciones', wedding: 'la boda', birthday: 'tu cumpleaños', competition: 'tu competencia', other: 'tu evento' };
  const LOGO = `<svg viewBox="0 0 512 512" aria-hidden="true"><defs> <linearGradient id="nfbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20242D"/><stop offset="1" stop-color="#0E1014"/></linearGradient> <linearGradient id="nfleaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#138A5A"/><stop offset="1" stop-color="#46D891"/></linearGradient> <linearGradient id="nfflame" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F0461A"/><stop offset="1" stop-color="#FFB25B"/></linearGradient> <clipPath id="nfdisc"><circle cx="256" cy="256" r="152"/></clipPath> </defs> <rect width="512" height="512" rx="114" fill="url(#nfbg)"/> <g transform="rotate(-40 256 256)"> <path d="M256 104 A152 152 0 0 0 256 408 A76 76 0 0 1 256 256 A76 76 0 0 0 256 104 Z" fill="url(#nfleaf)"/> <path d="M256 104 A152 152 0 0 1 256 408 A76 76 0 0 1 256 256 A76 76 0 0 0 256 104 Z" fill="url(#nfflame)"/> <path clip-path="url(#nfdisc)" d="M256 90 L256 104 A76 76 0 0 1 256 256 A76 76 0 0 0 256 408 L256 422" fill="none" stroke="#12151B" stroke-width="12" stroke-linecap="butt"/> <path d="M232 214 C 238 186 254 166 280 154 C 284 180 270 204 232 214 Z" fill="#E9FFF3" fill-opacity=".9"/> <path d="M256 372 C 236 362 232 340 246 322 C 248 336 258 340 262 330 C 270 312 262 298 266 288 C 286 304 292 330 282 350 C 276 362 266 370 256 372 Z" fill="#FFF1DE" fill-opacity=".92"/> </g></svg>`;
  const WORDMARK = `<span class="wordmark">Nutri<b>fit</b></span>`;

  let quiz = S.loadDraft();
  const ui = { week: {} };

  const go = (hash) => { location.hash = hash; };

  // ---------- Router ----------
  function route() {
    if (typeof stopGuideTimer === 'function' && !/^#\/(guide|routine)/.test(location.hash)) stopGuideTimer();
    if (!modal.classList.contains('hidden')) closeModal();
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/');
    const params = new URLSearchParams(qs || '');
    switch (parts[0]) {
      case 'quiz': return quiz ? renderQuiz(+parts[1] || 0) : location.replace('#/');
      case 'plan': return renderPlan(parts[1], params.get('tab') || 'plan');
      case 'session': return renderSession(parts[1], +parts[2], +parts[3]);
      case 'guide': return renderGuide(parts[1], +parts[2], +parts[3]);
      case 'rutinas': return renderRoutines(params.get('t') || 'trx');
      case 'routine': return renderRoutineGuide(parts[1]);
      case 'ver': return renderRoutinePreview(parts[1]);
      case 'ejercicios': return renderLibrary(params.get('g'));
      default: return renderHome();
    }
  }
  window.addEventListener('hashchange', () => { route(); paintNav(); window.scrollTo(0, 0); });

  // ---------- Menú fijo abajo ----------
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  document.body.appendChild(nav);
  function paintNav() {
    const h = location.hash || '#/';
    const hide = /^#\/(quiz|guide|routine\/)/.test(h) || (!S.profiles().length && (h === '#/' || h === '#'));
    nav.hidden = hide;
    document.body.classList.toggle('has-nav', !hide);
    if (hide) return;
    const profs = S.profiles();
    const cur = profs.length ? activeProfile(profs) : null;
    const tab = (h.match(/[?&]tab=(\w+)/) || [])[1];
    const isPlan = /^#\/plan\//.test(h);
    const pl = (t) => (cur ? `#/plan/${cur.id}?tab=${t}` : '#/');
    const items = [
      ['#/', '🏋️', 'Entrenamiento', h === '#/' || h === '#' || (isPlan && (!tab || tab === 'plan')) || /^#\/(session|rutinas|ver|ejercicios)/.test(h)],
      [pl('nutri'), '🍽️', 'Nutrición', isPlan && tab === 'nutri'],
      [pl('progress'), '📈', 'Progreso', isPlan && tab === 'progress'],
      [pl('profile'), '👤', 'Perfil', isPlan && tab === 'profile'],
    ];
    nav.innerHTML = items.map(([href, ico, label, on]) => `<a href="${href}" class="${on ? 'on' : ''}"><span>${ico}</span>${label}</a>`).join('');
  }

  // ---------- Inicio ----------
  function profileProgress(p) {
    const total = p.plan.weeks.reduce((t, w) => t + w.days.length, 0);
    const done = Object.keys(p.log).filter((k) => k.startsWith(p.plan.block + '-') && p.log[k].done).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }

  // Próxima sesión pendiente del bloque actual
  function nextSession(p) {
    for (const wk of p.plan.weeks) {
      const i = wk.days.findIndex((_, d) => !p.log[`${p.plan.block}-${wk.week}-${d}`]?.done);
      if (i >= 0) return { w: wk.week, d: i, day: wk.days[i] };
    }
    return null;
  }

  function weekKey(ts) {
    const d = new Date(ts); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes de esa semana
    return d.getTime();
  }

  function stats(p) {
    const done = Object.entries(p.log).filter(([, l]) => l.done);
    let minutes = 0;
    for (const [k, l] of done) {
      const [b, w, d] = k.split('-').map(Number);
      minutes += l.min || (b === p.plan.block && p.plan.weeks[w - 1]?.days[d]?.minutes) || 30;
    }
    const weeks = new Set(done.map(([, l]) => weekKey(l.date || Date.now())));
    let streak = 0, wk = weekKey(Date.now());
    if (!weeks.has(wk)) wk -= 7 * 86400000;
    while (weeks.has(wk)) { streak++; wk -= 7 * 86400000; }
    const fullWeek = p.plan.weeks.some((w) => w.days.every((_, d) => p.log[`${p.plan.block}-${w.week}-${d}`]?.done));
    const n = done.length;
    const badges = [
      { e: '🌱', t: 'Primera sesión', ok: n >= 1 }, { e: '💪', t: '5 sesiones', ok: n >= 5 },
      { e: '🔥', t: '10 sesiones', ok: n >= 10 }, { e: '🏅', t: 'Semana completa', ok: fullWeek },
      { e: '🚀', t: 'Bloque 2', ok: p.plan.block >= 2 }, { e: '🏆', t: '25 sesiones', ok: n >= 25 },
    ];
    return { sessions: n, minutes, streak, badges };
  }

  function activeProfile(profs) {
    let chosen = null;
    try { chosen = profs.find((x) => x.id === localStorage.getItem('calistenia.activo')); } catch (e) { /* */ }
    if (chosen) return chosen;
    const last = (p) => Math.max(p.createdAt, ...Object.values(p.log).map((l) => l.date || 0));
    return profs.slice().sort((a, b) => last(b) - last(a))[0];
  }

  // Encabezado de cada área (con el estado de sincronización) y pestañas de Entrenamiento
  function areaHead(title, sub) {
    return `<header class="plan-head compact area-head"><div><span class="brand-mini">${LOGO}${WORDMARK}</span><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><button class="sync-chip" id="syncchip"></button></header>`;
  }
  function trainHead(active, cur) {
    const items = [
      ['hoy', 'Hoy', '#/'],
      ['plan', 'Mi plan', cur ? `#/plan/${cur.id}?tab=plan` : '#/'],
      ['rutinas', 'Rutinas', cur && (cur.answers.equipment || []).includes('gym') ? '#/rutinas?t=gym' : '#/rutinas'],
      ['ejercicios', 'Ejercicios', '#/ejercicios'],
    ];
    return areaHead('🏋️ Entrenamiento', cur ? `${esc(cur.answers.name)} · Bloque ${cur.plan.block} · ${cur.plan.levelName}` : 'Ejercicios y rutinas')
      + `<nav class="tabs area-tabs">${items.map(([k, l, h]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
  }
  function bindHead() {
    const chip = document.getElementById('syncchip');
    if (chip) { chip.onclick = openSync; paintSync(); }
  }
  const ageCardsHTML = () => `
      <div class="age-grid">
        ${window.AGE_RANGES.map((r) => `
          <button class="age-card" data-age="${r.v}">
            <span class="age-emoji">${r.emoji}</span>
            <span class="age-label">Edad: ${r.label}</span>
            <span class="age-go">›</span>
          </button>`).join('')}
      </div>`;

  // ---------- Entrenamiento › Hoy (o bienvenida si aún no hay plan) ----------
  function renderHome() {
    const profs = S.profiles();
    const cur = profs.length ? activeProfile(profs) : null;
    if (!cur) {
      $app.innerHTML = `
        <div class="screen home">
          <header class="brand">${LOGO}${WORDMARK}<button class="sync-chip" id="syncchip"></button></header>
          <section class="hero">
            <p class="eyebrow">Cuestionario de 3 minutos</p>
            <h1>Entrena y come <span>a tu medida</span></h1>
            <p class="sub">Calistenia, TRX y máquina · nutrición con foto del plato · tu progreso</p>
            ${Sync.conectado() && !Sync.state.last ? '<div class="note center">⟳ Trayendo tus datos de la nube…</div>' : ''}
            ${Sync.configurada() && !Sync.conectado() ? '<button class="btn primary wide" id="homecon">🔗 ¿Ya usas Nutrifit en otro aparato? Conéctalo aquí</button>' : ''}
            <p class="sub">Elige tu rango de edad para empezar</p>
            ${ageCardsHTML()}
            <p class="legal">Las recomendaciones son orientativas y no sustituyen a un profesional de la salud.</p>
          </section>
          <section class="tools">
            <a class="btn ghost small" href="#/ejercicios">🤸 Ver ejercicios</a>
            <label class="btn ghost small">Importar datos<input type="file" id="import" accept="application/json,.json" hidden></label>
            <label class="btn ghost small theme-sel">${themeSelect()}</label>
          </section>
        </div>`;
      $$('.age-card').forEach((b) => b.onclick = () => startQuiz({ ageRange: b.dataset.age }));
      $('#import').onchange = (e) => importFile(e);
      const hc = $('#homecon'); if (hc) hc.onclick = openSync;
      bindThemeSelect();
      bindHead();
      return;
    }
    if (diaSel() !== dayKey()) return renderPastDay(cur, diaSel());
    const nx = nextSession(cur);
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const goal = P.nutrition(cur.answers, P.metrics(cur.answers)).kcal;
    const eaten = dayTotals(cur).kcal;
    $app.innerHTML = `
      <div class="screen home">
        ${trainHead('hoy', cur)}
        <section class="today">
          ${dayNavHTML(dayKey())}
          <p class="hello">${hello}, <strong>${esc(cur.answers.name)}</strong> 👋</p>
          ${nx ? `
            <div class="today-card">
              <div class="today-txt">
                <span class="today-eyebrow">Hoy toca · Semana ${nx.w}</span>
                <h2>${esc(nx.day.name)}</h2>
                <p>${nx.day.exercises.length} ejercicios · ~${nx.day.minutes} min${nx.day.finisher ? ' · cardio' : ''}</p>
                <a class="btn primary" href="#/session/${cur.id}/${nx.w}/${nx.d}">👀 Ver ejercicios y empezar</a>
              </div>
              ${animBox(nx.day.exercises[0]?.id, 'dark today-anim live')}
            </div>` : `
            <div class="today-card done">
              <div class="today-txt">
                <span class="today-eyebrow">Bloque ${cur.plan.block} completado</span>
                <h2>¡Listo para subir de nivel!</h2>
                <a class="btn primary" href="#/plan/${cur.id}?tab=progress">Generar el siguiente bloque</a>
              </div>
            </div>`}
          ${(cur.answers.equipment || []).includes('gym') ? gymCard() : ''}
          ${trxCard()}
          <a class="kcal-today" href="#/plan/${cur.id}?tab=nutri"><span>🍽️ Comido hoy</span><strong>${Math.round(eaten)} / ${goal} kcal</strong><div class="bar ${eaten > goal ? 'over' : ''}"><i style="width:${Math.min(100, Math.round((eaten / goal) * 100))}%"></i></div><small>📷 Toca para anotar o sacar una foto del plato</small></a>
        </section>
      </div>`;
    bindHead();
    bindDayNav(renderHome);
    mountAnims();
  }

  // Un día anterior: qué se entrenó y qué se comió; se puede marcar lo que faltó anotar.
  function renderPastDay(cur, k) {
    const hechos = entrenosDelDia(cur, k);
    const pendientes = [];
    for (const wk of cur.plan.weeks) wk.days.forEach((d, i) => { if (!cur.log[`${cur.plan.block}-${wk.week}-${i}`]?.done) pendientes.push({ w: wk.week, d: i, day: d }); });
    const goal = P.nutrition(cur.answers, P.metrics(cur.answers)).kcal;
    const eaten = dayTotals(cur, k).kcal;
    $app.innerHTML = `
      <div class="screen home">
        ${trainHead('hoy', cur)}
        <section class="today">
          ${dayNavHTML(k, 'Puedes revisarlo o anotar lo que te faltó.')}
          <div class="card">
            <h3>🏋️ Entrenamiento de ese día</h3>
            ${hechos.length ? `<ul class="list compact">${hechos.map((h) => `<li><span>✓ ${esc(h.name)}</span><strong>${h.min ? '~' + h.min + ' min' : ''}</strong><button class="food-del" data-undo="${esc(h.key)}" aria-label="Quitar">×</button></li>`).join('')}</ul>`
              : '<p class="muted">No hay entrenamientos anotados ese día.</p>'}
          </div>
          <div class="card">
            <h3>¿Entrenaste y no lo marcaste?</h3>
            ${pendientes.length ? `<p class="muted small">Toca la sesión que hiciste y queda anotada en ese día.</p>
            <div class="stack">${pendientes.slice(0, 6).map((x) => `<button class="btn ghost mark-past" data-marcar="${x.w}-${x.d}">✓ ${esc(x.day.name)} <small class="muted">Semana ${x.w} · ~${x.day.minutes} min</small></button>`).join('')}</div>` : '<p class="muted small">Todas las sesiones de este bloque ya están hechas.</p>'}
            <details class="mf-custom"><summary>Otra actividad (rutina, caminata, deporte…)</summary>
              <input id="oname" type="text" placeholder="¿Qué hiciste? (ej: rutina TRX, caminata)">
              <div class="inline-form"><input id="omin" type="number" inputmode="numeric" min="1" placeholder="Minutos"><button class="btn primary small" id="osave">Guardar</button></div>
            </details>
          </div>
          <a class="kcal-today" href="#/plan/${cur.id}?tab=nutri"><span>🍽️ Comido ese día</span><strong>${Math.round(eaten)} / ${goal} kcal</strong><div class="bar ${eaten > goal ? 'over' : ''}"><i style="width:${Math.min(100, Math.round((eaten / goal) * 100))}%"></i></div><small>Toca para revisar o completar las comidas de ese día</small></a>
        </section>
      </div>`;
    const marcar = (key, fn) => { S.update(cur.id, (x) => { const l = x.log[key] || (x.log[key] = { sets: {} }); fn(l); l.t = Date.now(); }); renderHome(); };
    $$('[data-marcar]').forEach((b) => b.onclick = () => {
      const [w, d] = b.dataset.marcar.split('-').map(Number);
      const day = cur.plan.weeks[w - 1].days[d];
      marcar(`${cur.plan.block}-${w}-${d}`, (l) => { l.done = true; l.date = horaDelDia(k); l.min = day.minutes; });
      toast(`✅ ${day.name} quedó anotada (${diaNombre(k, true).toLowerCase()})`);
    });
    $$('[data-undo]').forEach((b) => b.onclick = () => marcar(b.dataset.undo, (l) => { l.done = false; }));
    $('#osave').onclick = () => {
      const name = $('#oname').value.trim(), min = Math.round(+$('#omin').value);
      if (!name || !(min > 0)) return toast('Escribe qué hiciste y cuántos minutos', 'warn');
      marcar(`X-${uidF()}`, (l) => { l.done = true; l.date = horaDelDia(k); l.min = min; l.routine = name; });
    };
    bindHead();
    bindDayNav(renderHome);
  }

  async function importFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const n = S.importJSON(await f.text());
      alert(n ? `Se importaron ${n} plan(es).` : 'No había planes nuevos en el archivo.');
      route();
    } catch (err) { alert('No se pudo importar: ' + err.message); }
  }

  // ---------- Personaje propio ----------
  function openCharacterHelp() {
    modal.innerHTML = `
      <div class="m-sheet sync-sheet" role="dialog" aria-modal="true" aria-label="Mi personaje">
        <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
        <h2>👤 Usa tu propio personaje</h2>
        <p class="m-cue">Puedes cambiar la persona que hace los ejercicios por cualquier personaje 3D <strong>con esqueleto</strong> (archivo <code>.glb</code>). Todos los ejercicios se adaptan solos.</p>
        <h3>Dónde conseguir uno gratis</h3>
        <ul class="list tips">
          <li><strong>Quaternius · Universal Base Characters</strong> (gratis, licencia CC0): hombres y mujeres. Descárgalo en <code>quaternius.com/packs/universalbasecharacters.html</code>, descomprime y elige el <code>.glb</code> del personaje que quieras.</li>
          <li><strong>Mixamo</strong> (gratis con cuenta de Adobe): elige un personaje, descárgalo en FBX y conviértelo a GLB (por ejemplo, con Blender).</li>
        </ul>
        <p class="muted small">El archivo se guarda solo en este dispositivo. En el celular, cárgalo también desde la app.</p>
        <button class="btn primary wide" id="pickchar">Elegir archivo .glb</button>
        <button class="btn link" id="clearchar">Quitar mi personaje y volver al hombre incluido</button>
      </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('.m-close').onclick = closeModal;
    modal.querySelector('#pickchar').onclick = () => { closeModal(); document.getElementById('charfile').click(); };
    modal.querySelector('#clearchar').onclick = async () => {
      try { await window.CharacterStore?.clear(); localStorage.setItem('calistenia.anim', 'man'); } catch (e) { /* */ }
      location.reload();
    };
  }

  // ---------- Foto del plato ----------
  // Achica la foto (máx. 1024 px) para enviarla rápido al PC
  function shrinkPhoto(file, max = 1024, calidad = 0.82) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => rej(new Error('No se pudo leer la foto'));
      img.src = URL.createObjectURL(file);
    });
  }

  // La foto va a la nube; Claude la revisa en el PC (con tu suscripción) y anota lo que encuentra en el día.
  // Si el PC está apagado, la foto espera y se anota sola cuando se enciende.
  async function analyzePhoto(p, file) {
    let dataUrl;
    try { dataUrl = await shrinkPhoto(file); } catch (e) { return alert(e.message); }
    if (!Sync.conectado()) {
      modal.innerHTML = `
        <div class="m-sheet food-sheet" role="dialog" aria-modal="true" aria-label="Foto del plato">
          <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
          <img class="food-photo" src="${dataUrl}" alt="Foto del plato">
          <p>Para que Claude revise tus fotos, primero conecta este aparato con tu nube (se hace una sola vez).</p>
          <button class="btn primary wide" id="fcon">🔗 Conectar este aparato</button>
          <button class="btn link" id="fmanual">Anotar a mano</button>
        </div>`;
      modal.classList.remove('hidden');
      modal.querySelector('.m-close').onclick = closeModal;
      modal.querySelector('#fcon').onclick = openSync;
      modal.querySelector('#fmanual').onclick = () => openManualFood(p);
      return;
    }
    const id = 'f' + uidF(), meal = mealByHour(), at = Date.now(), dia = diaSel();
    Sync.encolarFoto({ id, b64: dataUrl.split(',')[1], tipo: 'image/jpeg', meta: { perfil: p.id, dia, meal, at } });
    addFood(p.id, [{ id, pend: true, name: 'Foto del plato', kcal: 0, meal, src: 'foto', at }], dia);
    fotosEnEspera.add(id);
    Sync.sync();
    waitPhoto(p, id, dia, dataUrl);
  }

  function waitPhoto(p, id, dia, dataUrl) {
    modal.innerHTML = `
      <div class="m-sheet food-sheet" role="dialog" aria-modal="true" aria-label="Revisando el plato" data-foto="${id}">
        <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
        ${dataUrl ? `<img class="food-photo" src="${dataUrl}" alt="Foto del plato">` : ''}
        <div class="food-wait"><div class="spinner"></div><p id="fwtxt"></p></div>
        <p class="muted small center">Puedes cerrar esta ventana: el resultado se anota solo en tu día.</p>
        <button class="btn ghost wide" id="fclose">Cerrar</button>
      </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('.m-close').onclick = closeModal;
    modal.querySelector('#fclose').onclick = closeModal;
    Sync.vigilar(true);
    const stop = () => { clearInterval(t); Sync.vigilar(false); };
    const check = () => {
      if (modal.classList.contains('hidden') || !modal.querySelector(`[data-foto="${id}"]`)) return stop();
      const list = S.get(p.id)?.food?.[dia] || [];
      const ph = list.find((e) => e.id === id);
      const items = list.filter((e) => e.foto === id && !e.deleted);
      if (ph?.hecho && items.length) { stop(); fotosEnEspera.delete(id); return showFoodReview(p, id, dia, dataUrl); }
      if (ph?.err || (ph?.deleted && !ph?.hecho)) {
        stop();
        fotosEnEspera.delete(id);
        modal.querySelector('.food-wait').innerHTML = `<p class="bad">⚠️ ${esc(ph.err || 'Se quitó la foto.')}</p><button class="btn ghost wide" id="fmanual">✍️ Anotar a mano</button>`;
        modal.querySelector('#fmanual').onclick = () => openManualFood(p);
        return;
      }
      const txt = modal.querySelector('#fwtxt');
      if (!txt) return;
      const st = Sync.state;
      txt.innerHTML = Sync.fotosSinSubir()
        ? (st.status === 'offline' ? '<strong>Sin internet en este momento.</strong><br><span class="muted small">La foto quedó guardada aquí y se envía sola cuando vuelva la conexión.</span>' : '<strong>Enviando la foto…</strong>')
        : ph?.aviso ? `<strong>Claude está ocupado.</strong><br><span class="muted small">${esc(ph.aviso)}</span>`
        : Sync.pcEncendido() ? '<strong>Claude está mirando tu plato en tu PC…</strong><br><span class="muted small">Suele tardar menos de un minuto.</span>'
        : '<strong>Foto guardada. Tu PC está apagado.</strong><br><span class="muted small">Claude la revisa apenas enciendas el PC y se anota sola en tu día.</span>';
    };
    const t = setInterval(check, 1000);
    check();
  }

  // Revisión: Claude ya anotó el plato; aquí se puede cambiar la cantidad (las calorías se ajustan solas) o quitar algo.
  function showFoodReview(p, fotoId, dia, dataUrl) {
    const list = S.get(p.id)?.food?.[dia] || [];
    const r = list.find((e) => e.id === fotoId) || {};
    const items = list.filter((e) => e.foto === fotoId && !e.deleted).map((e) => ({
      eid: e.id, nombre: e.name, gramos: e.gr, ml: e.ml, kcal: e.kcal, proteina: e.p || 0, carbohidratos: e.c || 0, grasa: e.g || 0, fibra: e.fb || 0,
      base: e.ml || e.gr || 0, on: true,
    }));
    if (!items.length) return closeModal();
    const meal = items.length ? list.find((e) => e.id === items[0].eid).meal : mealByHour();
    const paint = () => {
      const total = items.filter((x) => x.on).reduce((t, x) => t + x.kcal, 0);
      modal.innerHTML = `
        <div class="m-sheet food-sheet" role="dialog" aria-modal="true" aria-label="Revisa tu plato">
          <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
          ${dataUrl ? `<img class="food-photo" src="${dataUrl}" alt="Foto del plato">` : ''}
          <h2>${esc(r.plato || 'Tu plato')}</h2>
          <p class="ok small">✅ Claude ya lo anotó en tu día. Revisa y corrige si hace falta.</p>
          <div class="food-total"><strong>${Math.round(total)}</strong> kcal aprox. <span class="pill ${r.confianza === 'alta' ? 'ok' : r.confianza === 'baja' ? 'bad' : 'warn'}">confianza ${esc(r.confianza || 'media')}</span></div>
          ${r.nota ? `<p class="muted small">💡 ${esc(r.nota)}</p>` : ''}
          <ul class="food-items">${items.map((x, i) => `
            <li class="${x.on ? '' : 'off'}">
              <label class="fi-check"><input type="checkbox" data-on="${i}" ${x.on ? 'checked' : ''}></label>
              <div class="fi-main"><strong>${esc(x.nombre)}</strong><span class="muted small">${x.kcal} kcal · Prot ${Math.round(x.proteina)} · Carb ${Math.round(x.carbohidratos)} · Grasa ${Math.round(x.grasa)} · Fibra ${Math.round(x.fibra || 0)} g</span></div>
              ${x.base ? `<div class="fi-qty"><input type="number" inputmode="decimal" min="0" data-q="${i}" value="${x.ml || x.gramos}"><span>${x.ml ? 'ml' : 'g'}</span></div>` : ''}
            </li>`).join('')}</ul>
          <label class="meal-sel">Comida: <select id="fmeal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === meal ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="btn primary wide" id="fsave">Listo</button>
        </div>`;
      modal.querySelector('.m-close').onclick = closeModal;
      modal.querySelectorAll('[data-on]').forEach((c) => c.onchange = () => { items[+c.dataset.on].on = c.checked; paint(); });
      modal.querySelectorAll('[data-q]').forEach((inp) => inp.onchange = () => {
        const x = items[+inp.dataset.q], v = Math.max(0, parseFloat(inp.value.replace(',', '.')) || 0);
        const k = x.base ? v / x.base : 1;
        // Las calorías y macros se escalan desde los valores que dio Claude
        x.kcal = Math.round(x.kcal0 * k);
        ['proteina', 'carbohidratos', 'grasa', 'fibra'].forEach((f) => { x[f] = Math.round(x[f + '0'] * k * 10) / 10; });
        if (x.ml) x.ml = v; else x.gramos = v;
        paint();
      });
      modal.querySelector('#fsave').onclick = () => {
        const mk = modal.querySelector('#fmeal').value, now = Date.now();
        S.update(p.id, (x) => {
          for (const it of items) {
            const e = (x.food?.[dia] || []).find((y) => y.id === it.eid);
            if (!e) continue;
            const nuevo = it.on
              ? { ...e, meal: mk, kcal: it.kcal, p: it.proteina, c: it.carbohidratos, g: it.grasa, fb: it.fibra, gr: it.ml ? null : it.gramos, ml: it.ml || null }
              : { ...e, deleted: true };
            if (JSON.stringify(nuevo) !== JSON.stringify(e)) Object.assign(e, nuevo, { t: now });
          }
        }, false);
        closeModal();
        renderPlan(p.id, 'nutri');
      };
    };
    items.forEach((x) => { x.kcal0 = x.kcal; ['proteina', 'carbohidratos', 'grasa', 'fibra'].forEach((f) => { x[f + '0'] = x[f] || 0; }); });
    paint();
    modal.classList.remove('hidden');
  }

  // Aviso cuando Claude termina una foto mientras usas la app
  const fotosEnEspera = new Set();
  function avisosFotos() {
    for (const k of [...etiquetasEnEspera]) {
      const f = S.foods()[k];
      if (f && f.src === 'etiqueta') { etiquetasEnEspera.delete(k); toast(`🏷️ Etiqueta guardada: ${f.n} · ${f.kcal} kcal por 100 ${f.ml ? 'ml' : 'g'}`); }
    }
    for (const id of [...fotosEnEspera]) {
      if (!modal.classList.contains('hidden') && modal.querySelector(`[data-foto="${id}"]`)) continue; // ya la está mirando
      for (const p of S.profiles()) {
        const e = Object.values(p.food || {}).flat().find((x) => x.id === id);
        if (!e) continue;
        if (e.hecho) { fotosEnEspera.delete(id); toast(`✅ Claude anotó ${e.consulta ? '' : 'tu foto: '}${e.plato || e.consulta || 'plato'} · ${Math.round(e.total || 0)} kcal`); }
        else if (e.err) { fotosEnEspera.delete(id); toast('⚠️ ' + e.err, 'warn'); }
      }
    }
  }
  function toast(text, kind = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 4500);
    setTimeout(() => el.remove(), 5200);
  }

  // ---------- Anotar a mano ----------
  // Busca en: alimentos comunes (js/foods.js + foods-mas.js), tus alimentos (agregados por ti o por Claude) y
  // ~2.300 productos de supermercados de Chile (Open Food Facts, js/alimentos-chile.json, se carga al abrir).
  // Si no está: Claude lo calcula (en tu PC) o lo escribes tú con la etiqueta, y queda guardado para la próxima vez.
  const EXTRAS = [['sat', 'Grasas saturadas', 'g'], ['mono', 'Grasas monoinsaturadas', 'g'], ['poli', 'Grasas poliinsaturadas', 'g'], ['trans', 'Grasas trans', 'g'], ['col', 'Colesterol', 'mg'], ['azu', 'Azúcares totales', 'g'], ['sod', 'Sodio', 'mg']];
  const extrasDe = (f, k = 1) => {
    const o = {};
    for (const [x] of EXTRAS) if (f[x] !== undefined && f[x] !== null && f[x] !== '') o[x] = Math.round(f[x] * k * 10) / 10;
    // Otros datos de la etiqueta (vitaminas, minerales…): los que Claude encuentre, con su unidad
    if (f.otros) o.otros = Object.fromEntries(Object.entries(f.otros).map(([n, [v, u]]) => [n, [Math.round(v * k * 100) / 100, u]]));
    return o;
  };
  const etiquetasEnEspera = new Set();
  let PRODUCTOS = null;
  function cargarProductos() {
    if (PRODUCTOS) return Promise.resolve(PRODUCTOS);
    return fetch('js/alimentos-chile.json').then((r) => r.json()).then((j) => {
      PRODUCTOS = j.productos.map((a) => ({ n: a[0], marca: a[1], kcal: a[2], p: a[3], c: a[4], g: a[5], fb: a[6], ml: !!a[7], porcion: a[8] || 100, src: 'off' }));
      return PRODUCTOS;
    }).catch(() => (PRODUCTOS = []));
  }
  const normTxt = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ');
  function buscarAlimentos(q) {
    const mios = Object.values(S.foods()).filter((f) => f && f.n);
    const comunes = window.FOODS.map((f) => ({ ...f, src: f.src || 'base' }));
    const t = normTxt(q).trim();
    if (!t) return [...mios.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 5), ...comunes.slice(0, 6)];
    // Cada palabra debe aparecer (sin importar tildes ni plurales simples)
    const palabras = t.split(/\s+/).filter((w) => w.length > 1 && !['de', 'del', 'la', 'el', 'con', 'en', 'y'].includes(w)).map((w) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w));
    const vistos = new Set();
    const res = [];
    [[mios, 0], [comunes, 1], [PRODUCTOS || [], 2]].forEach(([lista, grupo]) => {
      for (const f of lista) {
        const h = normTxt(f.n + ' ' + (f.marca || ''));
        if (!palabras.every((w) => h.includes(w))) continue;
        const k = normTxt(f.n) + '|' + normTxt(f.marca);
        if (vistos.has(k)) continue;
        vistos.add(k);
        const empieza = normTxt(f.n).startsWith(palabras[0] || '') ? 0 : 1;
        res.push({ f, s: grupo * 10 + empieza * 3 + Math.min(3, f.n.length / 25) });
      }
    });
    return res.sort((a, b) => a.s - b.s).slice(0, 25).map((x) => x.f);
  }

  function openManualFood(p) {
    const meal = mealByHour(), dia = diaSel();
    modal.innerHTML = `
      <div class="m-sheet food-sheet" role="dialog" aria-modal="true" aria-label="Anotar comida">
        <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
        <h2>✍️ Anotar comida${dia === dayKey() ? '' : ` <span class="muted small">· ${esc(diaNombre(dia, true))}</span>`}</h2>
        <input id="mfq" type="search" placeholder="🔍 Alimento o producto (ej: galletas de arroz, leche Colun)" autocomplete="off">
        <ul class="food-search" id="mfres"></ul>
        <div id="mfnone" class="mf-none" hidden>
          <p id="mfnonetxt"></p>
          <div class="stack">
            <button class="btn primary" id="mfai">🤖 Que Claude lo calcule</button>
            <button class="btn ghost" id="mflabel">📸 Foto de la etiqueta nutricional</button>
            <button class="btn ghost" id="mfown">✍️ Escribir los datos yo</button>
          </div>
        </div>
        <div id="mfform" hidden>
          <p class="mf-name"><strong id="mfname"></strong> <span class="muted small" id="mfhint"></span></p>
          <div class="inline-form"><input id="mfqty" type="number" inputmode="decimal" min="0"><span id="mfunit" class="mf-unit"></span></div>
          <p class="food-total"><strong id="mfkcal">0</strong> kcal</p>
          <div id="mfextra" class="mf-extra"></div>
        </div>
        <div id="mflabelform" hidden>
          <p class="muted small">Saca una foto a la tabla <strong>"Información nutricional"</strong> del envase. Claude lee todos los datos (calorías, proteínas, grasas saturadas, mono y poliinsaturadas, trans, colesterol, carbohidratos, azúcares, fibra, sodio, porción y sellos) y guarda el producto en tus alimentos.</p>
          <label class="mf-lbl">Nombre del producto<input id="lname" type="text" placeholder="Ej: Galletas de arroz Líder"></label>
          <label class="btn ghost wide">📸 Sacar o elegir la foto<input type="file" id="lfoto" accept="image/*" hidden></label>
          <img id="lprev" class="food-photo" alt="Foto de la etiqueta" hidden>
          <label class="mf-lbl">¿Cuánto comiste? (opcional)<input id="lcant" type="text" placeholder="Ej: 3 galletas, 1 paquete, 30 g · vacío = solo guardar"></label>
          <p class="small" id="lpc"></p>
        </div>
        <div id="mfaiform" hidden>
          <p class="muted small">Claude busca los valores de ese producto (también de marcas chilenas) y lo anota solo en tu día. Lo nuevo queda guardado en tus alimentos.</p>
          <label class="mf-lbl">¿Qué comiste?<input id="aiq" type="text" placeholder="Ej: galletas de arroz Líder"></label>
          <label class="mf-lbl">¿Cuánto?<input id="aicant" type="text" placeholder="Ej: 3 galletas, 1 taza, 150 g"></label>
          <p class="small" id="aipc"></p>
        </div>
        <div id="mfownform" hidden>
          <label class="mf-lbl">Nombre<input id="oname" type="text" placeholder="Ej: Galletas de arroz Líder"></label>
          <div class="mf-grid">
            <label class="mf-lbl"><span>Calorías por 100 <span class="ou">g</span></span><input id="okcal" type="number" inputmode="decimal" min="0"></label>
            <label class="mf-lbl">Cantidad que comiste<span class="mf-qty"><input id="oqty" type="number" inputmode="decimal" min="0"><select id="ounit"><option value="g">g</option><option value="ml">ml</option></select></span></label>
            <label class="mf-lbl"><span>Proteínas /100 <span class="ou">g</span></span><input id="op" type="number" inputmode="decimal" min="0" placeholder="opcional"></label>
            <label class="mf-lbl"><span>Carbohidratos /100 <span class="ou">g</span></span><input id="oc" type="number" inputmode="decimal" min="0" placeholder="opcional"></label>
            <label class="mf-lbl"><span>Grasas /100 <span class="ou">g</span></span><input id="og" type="number" inputmode="decimal" min="0" placeholder="opcional"></label>
            <label class="mf-lbl"><span>Fibra /100 <span class="ou">g</span></span><input id="ofb" type="number" inputmode="decimal" min="0" placeholder="opcional"></label>
          </div>
          <details class="mf-custom"><summary>Más datos de la etiqueta (opcional)</summary>
            <div class="mf-grid">${EXTRAS.map(([k, l, u]) => `<label class="mf-lbl"><span>${l} /100 <span class="ou">g</span>${u === 'mg' ? ' (mg)' : ''}</span><input id="ox-${k}" type="number" inputmode="decimal" min="0"></label>`).join('')}</div>
          </details>
          <label class="mf-lbl">¿Solo sabes las calorías totales?<input id="ototal" type="number" inputmode="decimal" min="0" placeholder="Calorías de lo que comiste (opcional)"></label>
          <label class="chk"><input type="checkbox" id="okeep" checked> Guardar en mis alimentos para la próxima vez</label>
          <p class="food-total"><strong id="okc">0</strong> kcal</p>
        </div>
        <label class="meal-sel">Comida: <select id="mfmeal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === meal ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <button class="btn primary wide" id="mfsave" disabled>Guardar en mi día</button>
        <p class="muted tiny center">Productos de Chile: Open Food Facts (base abierta, ODbL).</p>
      </div>`;
    modal.classList.remove('hidden');
    const $m = (s) => modal.querySelector(s);
    const q = $m('#mfq'), res = $m('#mfres'), save = $m('#mfsave');
    const num = (s) => { const v = parseFloat(String($m(s).value).replace(',', '.')); return v >= 0 ? v : NaN; };
    let sel = null, modo = 'buscar', fotoEtiqueta = null;
    const mostrar = (m) => {
      modo = m;
      $m('#mfform').hidden = m !== 'sel';
      $m('#mfaiform').hidden = m !== 'ai';
      $m('#mfownform').hidden = m !== 'own';
      $m('#mflabelform').hidden = m !== 'label';
      save.textContent = m === 'ai' ? '🤖 Enviar a Claude' : m === 'label' ? '🏷️ Enviar la etiqueta a Claude' : 'Guardar en mi día';
      calc();
    };
    // Lo escrito por la persona: total o por 100 g × cantidad
    const propio = () => {
      const k100 = num('#okcal'), qty = num('#oqty'), tot = num('#ototal');
      const f = qty > 0 ? qty / 100 : NaN;
      const kcal = tot >= 0 && $m('#ototal').value !== '' ? tot : k100 * f;
      const m = (s) => (num(s) >= 0 && f > 0 ? Math.round(num(s) * f * 10) / 10 : 0);
      return { kcal: Math.round(kcal), k100, qty, f, p: m('#op'), c: m('#oc'), g: m('#og'), fb: m('#ofb') };
    };
    const calc = () => {
      if (modo === 'sel' && sel) {
        const v = Math.max(0, num('#mfqty') || 0);
        $m('#mfkcal').textContent = Math.round(sel.kcal * v / 100);
        save.disabled = !(v > 0);
      } else if (modo === 'ai') {
        save.disabled = !$m('#aiq').value.trim();
        $m('#aipc').innerHTML = !Sync.conectado() ? '⚠️ Para usar a Claude, conecta este aparato a tu nube (Perfil → Nube).'
          : Sync.pcEncendido() ? '🟢 Tu PC está encendido: queda anotado en menos de un minuto.' : '⚪ Tu PC está apagado: queda en espera y se anota solo al encenderlo.';
        if (!Sync.conectado()) save.disabled = true;
      } else if (modo === 'label') {
        $m('#lpc').innerHTML = !Sync.conectado() ? '⚠️ Para usar a Claude, conecta este aparato a tu nube (Perfil → Nube).'
          : Sync.pcEncendido() ? '🟢 Tu PC está encendido: queda guardado en menos de un minuto.' : '⚪ Tu PC está apagado: la foto queda en espera y se lee al encenderlo.';
        save.disabled = !(Sync.conectado() && $m('#lname').value.trim() && fotoEtiqueta);
      } else if (modo === 'own') {
        const o = propio();
        $m('#okc').textContent = o.kcal >= 0 ? o.kcal : 0;
        modal.querySelectorAll('.ou').forEach((x) => { x.textContent = $m('#ounit').value; });
        save.disabled = !($m('#oname').value.trim() && o.kcal >= 0 && (o.qty > 0 || $m('#ototal').value !== ''));
      } else save.disabled = true;
    };
    const list = () => {
      const texto = q.value.trim();
      const found = buscarAlimentos(texto);
      res.innerHTML = found.map((f, i) => `<li><button data-f="${i}"><span>${esc(f.n)}${f.marca ? ` <span class="muted small">· ${esc(f.marca)}</span>` : ''}${f.src === 'claude' ? ' ✨' : f.src === 'mio' ? ' 📝' : f.src === 'etiqueta' ? ' 🏷️' : ''}</span> <span class="muted small">${f.kcal} kcal / 100 ${f.ml ? 'ml' : 'g'}</span></button></li>`).join('');
      res.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => {
        sel = found[+b.dataset.f];
        $m('#mfname').textContent = sel.n + (sel.marca ? ' · ' + sel.marca : '');
        $m('#mfhint').textContent = sel.u || (sel.src === 'off' ? 'tabla nutricional del envase' : '');
        $m('#mfunit').textContent = sel.ml ? 'ml' : 'g';
        $m('#mfqty').value = sel.porcion || 100;
        const ex = EXTRAS.filter(([x]) => sel[x] !== undefined);
        $m('#mfextra').innerHTML = (sel.sellos || []).map((t) => `<span class="sello">${esc(t)}</span>`).join('')
          + (ex.length || sel.otros ? `<p class="muted small">Por 100 ${sel.ml ? 'ml' : 'g'}: ${[...ex.map(([x, l, u]) => `${l.toLowerCase()} ${sel[x]} ${u}`), ...Object.entries(sel.otros || {}).map(([n, [v, u]]) => `${esc(n.toLowerCase())} ${v} ${esc(u)}`)].join(' · ')}</p>` : '');
        res.innerHTML = '';
        $m('#mfnone').hidden = true;
        q.value = sel.n;
        mostrar('sel');
      });
      const largo = texto.length >= 3;
      $m('#mfnone').hidden = !largo || modo === 'ai' || modo === 'own' || modo === 'label';
      $m('#mfnonetxt').innerHTML = found.length ? '¿No es ninguno de estos?' : `No encontré <strong>${esc(texto)}</strong> en la base.`;
    };
    q.oninput = () => { sel = null; if (modo === 'sel') mostrar('buscar'); list(); };
    $m('#mfai').onclick = () => { $m('#aiq').value = q.value.trim(); $m('#mfnone').hidden = true; res.innerHTML = ''; mostrar('ai'); $m('#aicant').focus(); };
    $m('#mflabel').onclick = () => { $m('#lname').value = q.value.trim(); $m('#mfnone').hidden = true; res.innerHTML = ''; mostrar('label'); };
    $m('#lfoto').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { fotoEtiqueta = await shrinkPhoto(f, 1600, 0.86); } catch (er) { return toast(er.message, 'warn'); }
      $m('#lprev').src = fotoEtiqueta; $m('#lprev').hidden = false;
      calc();
    };
    $m('#lname').oninput = calc;
    $m('#mfown').onclick = () => { $m('#oname').value = q.value.trim(); $m('#mfnone').hidden = true; res.innerHTML = ''; mostrar('own'); $m('#okcal').focus(); };
    modal.querySelectorAll('#mfqty, #aiq, #aicant, #mfownform input').forEach((x) => { x.oninput = calc; });
    $m('#ounit').onchange = calc;
    $m('.m-close').onclick = closeModal;
    save.onclick = () => {
      const mk = $m('#mfmeal').value;
      if (modo === 'sel' && sel) {
        const v = Math.max(0, num('#mfqty') || 0), k = v / 100;
        addFood(p.id, [{ name: sel.n + (sel.marca ? ' · ' + sel.marca : ''), gr: sel.ml ? null : v, ml: sel.ml ? v : null, kcal: Math.round(sel.kcal * k), p: Math.round(sel.p * k), c: Math.round(sel.c * k), g: Math.round(sel.g * k), fb: Math.round((sel.fb || 0) * k * 10) / 10, ...extrasDe(sel, k), meal: mk, src: 'manual' }], dia);
      } else if (modo === 'ai') {
        const id = 'c' + uidF(), consulta = $m('#aiq').value.trim(), cant = $m('#aicant').value.trim();
        addFood(p.id, [{ id, pend: true, consulta, cant, name: consulta, kcal: 0, meal: mk, src: 'claude' }], dia);
        fotosEnEspera.add(id);
        Sync.sync();
        toast(Sync.pcEncendido() ? '🤖 Claude lo está calculando…' : '🤖 Quedó en espera: Claude lo calcula al encender el PC');
      } else if (modo === 'label') {
        const id = 'e' + uidF(), nombre = $m('#lname').value.trim(), cant = $m('#lcant').value.trim();
        Sync.encolarFoto({ id, b64: fotoEtiqueta.split(',')[1], tipo: 'image/jpeg', meta: { tipo: 'etiqueta', nombre, cant, perfil: p.id, dia, meal: mk, at: Date.now() } });
        if (cant) { addFood(p.id, [{ id, pend: true, etiqueta: true, consulta: nombre, cant, name: nombre, kcal: 0, meal: mk, src: 'etiqueta' }], dia); fotosEnEspera.add(id); }
        etiquetasEnEspera.add(NutriMerge.normNombre(nombre));
        Sync.sync();
        toast(Sync.pcEncendido() ? '🏷️ Claude está leyendo la etiqueta…' : '🏷️ Quedó en espera: Claude la lee al encender el PC');
      } else if (modo === 'own') {
        const o = propio(), ml = $m('#ounit').value === 'ml', name = $m('#oname').value.trim();
        const ex100 = {};
        for (const [x] of EXTRAS) { const v = num('#ox-' + x); if (v >= 0 && $m('#ox-' + x).value !== '') ex100[x] = v; }
        addFood(p.id, [{ name, gr: !ml && o.qty > 0 ? o.qty : null, ml: ml && o.qty > 0 ? o.qty : null, kcal: o.kcal, p: Math.round(o.p), c: Math.round(o.c), g: Math.round(o.g), fb: o.fb, ...(o.f > 0 ? extrasDe(ex100, o.f) : {}), meal: mk, src: 'manual' }], dia);
        if ($m('#okeep').checked && o.k100 >= 0 && $m('#okcal').value !== '') {
          const v = (s) => (num(s) >= 0 ? num(s) : 0);
          S.setFood(NutriMerge.normNombre(name), { n: name, kcal: Math.round(o.k100), p: v('#op'), c: v('#oc'), g: v('#og'), fb: v('#ofb'), ml, porcion: o.qty > 0 ? Math.round(o.qty) : 100, u: 'agregado por ti', src: 'mio', ...ex100, t: Date.now() });
        }
      }
      closeModal();
      renderPlan(p.id, 'nutri');
    };
    list();
    cargarProductos().then(() => { if (!modal.classList.contains('hidden') && modo === 'buscar') list(); });
    q.focus();
  }

  // ---------- Nube (sincronización entre aparatos) ----------
  const hora = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  function paintSync() {
    const chip = document.getElementById('syncchip');
    if (!chip) return;
    const st = Sync.state;
    const [cls, txt] = {
      ok: ['ok', '☁ Al día' + (st.last ? ' · ' + hora(st.last) : '')],
      syncing: ['busy', '⟳ Guardando…'],
      offline: ['warn', '⚠ Sin internet · guardado aquí'],
      clave: ['warn', '⚠ Revisa el código'],
      sinclave: ['warn', '🔗 Conectar este aparato'],
      local: ['local', Sync.native ? '📱 Solo en este teléfono' : '💾 Solo en este navegador'],
    }[st.status] || ['busy', '⟳ Conectando…'];
    chip.className = 'sync-chip ' + cls;
    chip.textContent = txt;
  }
  Sync.onStatus(() => {
    paintSync();
    const m = document.getElementById('syncinfo'); if (m) m.innerHTML = syncInfo();
    const pc = document.getElementById('pcinfo'); if (pc) pc.innerHTML = pcInfo();
  });

  function syncInfo() {
    const st = Sync.state;
    const sinSubir = Sync.fotosSinSubir();
    const fotos = sinSubir ? `<br>📷 ${sinSubir} foto(s) esperando internet para enviarse.` : '';
    if (st.status === 'ok') return `✅ Al día: este aparato tiene lo mismo que la nube (revisado a las ${hora(st.last)}).${fotos}`;
    if (st.status === 'syncing') return '⟳ Guardando en la nube…' + fotos;
    if (st.status === 'offline') return `⚠️ No hay conexión con la nube (${esc(st.error || 'sin respuesta')}). Lo que anotes queda guardado en este aparato y se envía solo cuando vuelva internet.${st.last ? ` Última vez al día: ${fmtShort(st.last)} ${hora(st.last)}.` : ''}${fotos}`;
    if (st.status === 'clave') return '⚠️ El código de conexión no es correcto. Escríbelo de nuevo abajo.';
    if (st.status === 'sinclave') return 'Este aparato todavía no está conectado. Escribe tu código de conexión una sola vez y tus datos se cargan solos.';
    if (st.status === 'local') return 'Esta versión de la app no tiene la nube configurada: tus datos se guardan solo aquí.';
    return '⟳ Conectando…';
  }
  function pcInfo() {
    if (!Sync.conectado() || !Sync.state.pcVisto) return '';
    return Sync.pcEncendido()
      ? '🟢 <strong>Tu PC está encendido</strong>: Claude revisa las fotos de platos al momento y todo se copia a OneDrive.'
      : `⚪ <strong>Tu PC está apagado</strong>${Sync.state.pc ? ` (última vez ${fmtShort(Sync.state.pc)} ${hora(Sync.state.pc)})` : ''}: las fotos de platos esperan y se anotan solas cuando lo enciendas.`;
  }

  function openSync() {
    const con = Sync.conectado();
    const web = (window.NUBE && window.NUBE.web) || '';
    modal.innerHTML = `
      <div class="m-sheet sync-sheet" role="dialog" aria-modal="true" aria-label="Nube">
        <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
        <h2>☁ Tus datos en todos tus aparatos</h2>
        <p class="m-cue">Todo se guarda al instante en este aparato y en tu Google Drive. Lo que anotes aquí aparece solo en el PC, la tablet y el celular, aunque el PC esté apagado.</p>
        <div class="note" id="syncinfo">${syncInfo()}</div>
        <p class="small" id="pcinfo">${pcInfo()}</p>
        ${con ? `
          <button class="btn ghost wide" id="syncnow">⟳ Revisar ahora</button>
          <details class="mf-custom"><summary>📱 Conectar otro aparato</summary>
            <p class="small">En el otro aparato abre <strong>${esc(web)}</strong> y escribe este código una sola vez:</p>
            <p class="code-big">${esc(Sync.clave())}</p>
            <p class="muted small">En el PC, la página <strong>localhost:8080/conectar</strong> muestra un código QR para la cámara del iPhone.</p>
          </details>
          <button class="btn link" id="srvoff">Desconectar este aparato</button>` : `
          <h3>Código de conexión</h3>
          <p class="muted small">Son 12 letras y números (ej: ABCD-EFGH-JKLM). Lo ves en el PC: Nutrifit → Perfil → Nube → "Conectar otro aparato".</p>
          <div class="inline-form"><input id="ncode" type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD-EFGH-JKLM"><button class="btn primary small" id="ncok">Conectar</button></div>
          <p class="err" id="ncerr"></p>`}
      </div>`;
    modal.classList.remove('hidden');
    modal.querySelector('.m-close').onclick = closeModal;
    if (con) {
      modal.querySelector('#syncnow').onclick = () => Sync.sync();
      modal.querySelector('#srvoff').onclick = () => {
        const b = modal.querySelector('#srvoff');
        if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'Toca otra vez para desconectar (tus datos quedan en la nube)'; return; }
        Sync.disconnect(); closeModal(); route();
      };
      return;
    }
    const go2 = async () => {
      const err = modal.querySelector('#ncerr'), btn = modal.querySelector('#ncok');
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Conectando…';
      try {
        await Sync.connect(modal.querySelector('#ncode').value);
        closeModal(); toast('✅ Aparato conectado: tus datos ya están aquí'); route(); paintNav();
      } catch (e) { err.style.color = ''; err.textContent = 'No se pudo conectar: ' + e.message; btn.disabled = false; btn.textContent = 'Conectar'; }
    };
    modal.querySelector('#ncok').onclick = go2;
    modal.querySelector('#ncode').onkeydown = (e) => { if (e.key === 'Enter') go2(); };
    modal.querySelector('#ncode').focus();
  }

  // Si llegan datos nuevos desde otro aparato, se refresca la pantalla (salvo en mitad de un entrenamiento o cuestionario).
  window.addEventListener('store-synced', () => {
    avisosFotos();
    const h = location.hash;
    if (h.startsWith('#/guide') || h.startsWith('#/routine') || h.startsWith('#/quiz') || h.startsWith('#/session') || !modal.classList.contains('hidden')) return;
    route(); paintNav();
  });

  function animPref() {
    let v = 'man';
    try { v = localStorage.getItem('calistenia.anim') || 'man'; } catch (e) { /* */ }
    if (window.NUBE?.sinMixamo && (v === 'human' || v === 'mannequin')) return 'man';
    return v === '3d' ? 'man' : v;
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Equipo escrito a mano (cuestionario y perfil) ----------
  function tagsHTML(items) {
    const chips = items.map((t, i) => {
      const v = window.recognizeEquipment(t);
      return `<span class="eq-tag ${v ? 'ok' : ''}">${v ? '✓' : '📝'} ${esc(t)}<small>${v ? 'se usa en tu plan' : 'anotado'}</small><button data-rm="${i}" aria-label="Quitar">×</button></span>`;
    }).join('');
    return `
      <div class="tags-box">
        <div class="tag-list">${chips || '<span class="muted small">Todavía no agregaste nada.</span>'}</div>
        <div class="inline-form"><input class="tag-in" type="text" maxlength="60" placeholder="Ej: mancuernas de 5 kg, banco, step…"><button class="btn primary small tag-add">Agregar</button></div>
        <p class="muted small">Sugerencias:</p>
        <div class="sugg">${window.EQUIP_SUGGESTIONS.filter((x) => !items.some((t) => t.toLowerCase() === x.toLowerCase())).map((x) => `<button class="chip" data-sug="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div>
      </div>`;
  }

  // items: lista de textos; onChange(nuevaLista, equipoReconocido)
  function bindTags(box, items, onChange) {
    const add = (txt) => {
      txt = String(txt || '').trim();
      if (!txt || items.some((t) => t.toLowerCase() === txt.toLowerCase())) return;
      onChange([...items, txt], window.recognizeEquipment(txt));
    };
    const inp = box.querySelector('.tag-in');
    box.querySelector('.tag-add').onclick = () => add(inp.value);
    inp.onkeydown = (e) => { if (e.key === 'Enter') add(inp.value); };
    box.querySelectorAll('[data-sug]').forEach((b) => b.onclick = () => add(b.dataset.sug));
    box.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => onChange(items.filter((_, i) => i !== +b.dataset.rm), null));
  }

  // ---------- Cuestionario ----------
  function startQuiz(answers, editingId = null) {
    quiz = { answers, editingId };
    S.saveDraft(quiz);
    go('#/quiz/0');
  }
  const visibleSteps = () => window.QUIZ_STEPS.filter((s) => !s.showIf || s.showIf(quiz.answers));
  const saveAnswer = (id, v) => { quiz.answers[id] = v; S.saveDraft(quiz); };
  const nextStep = (idx) => go('#/quiz/' + (idx + 1));

  function quizHeader(list, idx, st) {
    const secs = window.QUIZ_SECTIONS;
    const inSec = list.filter((s) => s.section === st.section);
    const pos = inSec.indexOf(st) + 1;
    return `
      <header class="quiz-head">
        <div class="qh-row">
          <button class="icon-btn" id="back" aria-label="Atrás">‹</button>
          <span class="qh-sec">${esc(secs[st.section])}</span>
          <span></span>
        </div>
        <div class="segments">
          ${secs.map((_, i) => `<div class="seg"><i style="width:${i < st.section ? 100 : i > st.section ? 0 : Math.round((pos / inSec.length) * 100)}%"></i></div>`).join('')}
        </div>
      </header>`;
  }

  function renderQuiz(idx) {
    const list = visibleSteps();
    idx = Math.min(idx, list.length - 1);
    const st = list[idx];
    const a = quiz.answers;
    const title = val(st.title, a);
    const subtitle = val(st.subtitle, a);
    const head = `<h1 class="q-title">${esc(title)}</h1>${subtitle ? `<p class="q-sub">${esc(subtitle)}</p>` : ''}`;
    let body = '';

    if (st.type === 'single' || st.type === 'multi') {
      const cur = a[st.id];
      const isSel = (o) => (st.type === 'multi' ? (cur || []).includes(o.v) : cur === o.v);
      body = head + `
        <div class="options">
          ${st.options.map((o, i) => `
            <button class="opt ${isSel(o) ? 'sel' : ''} ${st.type === 'multi' ? 'multi' : ''}" data-i="${i}">
              ${o.emoji ? `<span class="opt-emoji">${o.emoji}</span>` : ''}
              <span class="opt-label">${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
              ${st.type === 'multi' ? '<span class="check"></span>' : ''}
            </button>`).join('')}
        </div>
        ${st.type === 'multi' ? `<div class="sticky-cta"><button class="btn primary" id="cont" ${(cur || []).length ? '' : 'disabled'}>Continuar</button></div>` : ''}`;
    } else if (st.type === 'input') {
      const ph = val(st.placeholder, a);
      body = head + `
        <div class="num-input">
          <input id="num" type="text" inputmode="decimal" autocomplete="off" value="${a[st.id] ?? ''}" placeholder="${esc(ph)}">
          <span>${esc(st.unit)}</span>
        </div>
        <p class="err" id="err"></p>
        <div class="sticky-cta"><button class="btn primary" id="cont">Continuar</button></div>`;
    } else if (st.type === 'tags') {
      body = head + `<div id="tagsbox">${tagsHTML(a.equipmentOther || [])}</div>
        <div class="sticky-cta"><button class="btn primary" id="cont">${(a.equipmentOther || []).length ? 'Continuar' : 'Omitir'}</button></div>`;
    } else if (st.type === 'info') {
      body = `
        <div class="info">
          <div class="info-emoji">${val(st.emoji, a) || '💡'}</div>
          <h1 class="q-title">${esc(title)}</h1>
          <p class="info-body">${esc(val(st.body, a))}</p>
        </div>
        <div class="sticky-cta"><button class="btn primary" id="cont">Continuar</button></div>`;
    } else if (st.type === 'bmi') {
      body = bmiScreen(a);
    } else if (st.type === 'date') {
      const min = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      body = head + `
        <div class="num-input"><input id="date" type="date" min="${min}" value="${a.eventDate || ''}"></div>
        <p class="err" id="err"></p>
        <div class="sticky-cta">
          <button class="btn primary" id="cont">Continuar</button>
          <button class="btn link" id="skip">Todavía no tengo fecha</button>
        </div>`;
    } else if (st.type === 'projection') {
      body = projectionScreen(a);
    } else if (st.type === 'name') {
      body = head + `
        <div class="num-input"><input id="name" type="text" maxlength="40" autocomplete="given-name" value="${esc(a.name || '')}" placeholder="Tu nombre"></div>
        <p class="err" id="err"></p>
        <div class="sticky-cta"><button class="btn primary" id="cont">Crear mi plan</button></div>`;
    } else if (st.type === 'loader') {
      body = loaderScreen();
    }

    $app.innerHTML = `<div class="screen quiz">${st.type === 'loader' ? '' : quizHeader(list, idx, st)}<main class="quiz-body step-${st.type}">${body}</main></div>`;
    const back = $('#back');
    if (back) back.onclick = () => history.back();
    bindStep(st, idx);
  }

  function bindStep(st, idx) {
    const a = quiz.answers;
    const cont = $('#cont');
    const err = (msg) => { $('#err').textContent = msg; };

    if (st.type === 'single') {
      $$('.opt').forEach((b) => b.onclick = () => {
        saveAnswer(st.id, st.options[+b.dataset.i].v);
        $$('.opt').forEach((x) => x.classList.toggle('sel', x === b));
        setTimeout(() => nextStep(idx), 180);
      });
    } else if (st.type === 'multi') {
      $$('.opt').forEach((b) => b.onclick = () => {
        const o = st.options[+b.dataset.i];
        let cur = (a[st.id] || []).slice();
        if (cur.includes(o.v)) cur = cur.filter((x) => x !== o.v);
        else if (o.none) cur = [o.v];
        else cur = cur.filter((x) => !st.options.find((op) => op.v === x)?.none).concat(o.v);
        saveAnswer(st.id, cur);
        $$('.opt').forEach((x) => x.classList.toggle('sel', cur.includes(st.options[+x.dataset.i].v)));
        cont.disabled = !cur.length;
      });
      cont.onclick = () => nextStep(idx);
    } else if (st.type === 'input') {
      const inp = $('#num');
      inp.focus();
      const submit = () => {
        const v = parseFloat(inp.value.replace(',', '.'));
        if (isNaN(v) || v < st.min || v > st.max) return err(`Introduce un valor entre ${st.min} y ${st.max} ${st.unit}.`);
        if (st.id === 'targetWeight' && a.height) {
          const tb = v / Math.pow(a.height / 100, 2);
          if (tb < 17) return err('Ese peso queda por debajo de un rango saludable para tu altura. Elige un objetivo más alto.');
        }
        saveAnswer(st.id, st.id === 'age' || st.id === 'height' ? Math.round(v) : Math.round(v * 10) / 10);
        nextStep(idx);
      };
      cont.onclick = submit;
      inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    } else if (st.type === 'date') {
      cont.onclick = () => {
        const v = $('#date').value;
        if (!v) return err('Elige una fecha o pulsa "Todavía no tengo fecha".');
        saveAnswer('eventDate', v);
        nextStep(idx);
      };
      $('#skip').onclick = () => { delete a.eventDate; S.saveDraft(quiz); nextStep(idx); };
    } else if (st.type === 'name') {
      const inp = $('#name');
      inp.focus();
      const submit = () => {
        const v = inp.value.trim();
        if (!v) return err('Escribe tu nombre.');
        saveAnswer('name', v);
        nextStep(idx);
      };
      cont.onclick = submit;
      inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    } else if (st.type === 'loader') {
      runLoader();
    } else if (st.type === 'tags') {
      bindTags($('#tagsbox'), a.equipmentOther || [], (list, v) => {
        saveAnswer('equipmentOther', list);
        if (v) saveAnswer('equipment', [...new Set([...(a.equipment || []).filter((x) => x !== 'none'), v])]);
        renderQuiz(idx);
        $('.tag-in').focus();
      });
      cont.onclick = () => nextStep(idx);
    } else if (cont) {
      cont.onclick = () => nextStep(idx);
    }
  }

  function bmiScreen(a) {
    const m = P.metrics(a);
    const lab = P.BMI_LABELS[m.bmiCat];
    const pos = Math.max(0, Math.min(1, (m.bmi - 15) / 25)) * 100;
    const msg = {
      under: 'Tu IMC indica bajo peso. Vamos a priorizar ganar fuerza y masa muscular con una alimentación suficiente.',
      normal: '¡Estás en un rango saludable! Nos enfocaremos en fuerza, músculo y composición corporal.',
      over: 'Tienes algo de sobrepeso. Combinar fuerza con un déficit moderado mejora tu composición corporal.',
      obese: 'Empezaremos con variantes de bajo impacto y subiremos la intensidad de forma segura. Si tienes alguna condición de salud, consulta a tu médico.',
    }[m.bmiCat];
    return `
      <h1 class="q-title">Tu perfil físico</h1>
      <div class="card bmi-card">
        <div class="bmi-top">
          <div><span class="muted">Índice de masa corporal</span><div class="bmi-val">${m.bmi}</div></div>
          <span class="pill ${lab.tone}">${lab.label}</span>
        </div>
        <div class="gauge"><i style="left:${pos}%"></i></div>
        <div class="gauge-labels"><span>Bajo</span><span>Normal</span><span>Sobrepeso</span><span>Obesidad</span></div>
        <p>${msg}</p>
        <p class="muted small">Rango saludable para ${a.height} cm: ${m.healthyMin}-${m.healthyMax} kg. El IMC no distingue entre músculo y grasa; tómalo solo como referencia.</p>
      </div>
      <div class="stat-row">
        <div class="stat"><span>Metabolismo basal</span><strong>${m.bmr} kcal</strong></div>
        <div class="stat"><span>Gasto diario estimado</span><strong>${m.tdee} kcal</strong></div>
      </div>
      <div class="sticky-cta"><button class="btn primary" id="cont">Continuar</button></div>`;
  }

  function chartSVG(points, opts = {}) {
    const W = 320, H = 170, pl = 8, pr = 8, pt = 28, pb = 26;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || 1;
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (y1 - y0 < 2) { y0 -= 1; y1 += 1; }
    const X = (x) => pl + ((x - x0) / (x1 - x0 || 1)) * (W - pl - pr);
    const Y = (y) => pt + (1 - (y - y0) / (y1 - y0)) * (H - pt - pb);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${d} L${X(x1)},${H - pb} L${X(x0)},${H - pb} Z`;
    const first = points[0], last = points[points.length - 1];
    let marker = '';
    if (opts.marker) {
      const mx = X(opts.marker.x);
      marker = `<line x1="${mx}" x2="${mx}" y1="${pt - 8}" y2="${H - pb}" class="ch-mark"/><text x="${Math.min(mx, W - 40)}" y="${pt - 12}" class="ch-mark-t">${esc(opts.marker.label)}</text>`;
    }
    return `
      <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opts.aria || 'Gráfica')}">
        <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        <line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" class="ch-axis"/>
        <path d="${area}" fill="url(#g1)"/>
        <path d="${d}" class="ch-line"/>
        ${marker}
        <circle cx="${X(first.x)}" cy="${Y(first.y)}" r="5" class="ch-dot0"/>
        <circle cx="${X(last.x)}" cy="${Y(last.y)}" r="6" class="ch-dot1"/>
        <text x="${X(first.x) + 2}" y="${Y(first.y) - 10}" class="ch-t">${esc(opts.firstLabel ?? first.y)}</text>
        <text x="${X(last.x) - 2}" y="${Y(last.y) - 12}" text-anchor="end" class="ch-t strong">${esc(opts.lastLabel ?? last.y)}</text>
        <text x="${pl}" y="${H - 6}" class="ch-x">${esc(opts.x0Label || '')}</text>
        <text x="${W - pr}" y="${H - 6}" text-anchor="end" class="ch-x">${esc(opts.x1Label || '')}</text>
      </svg>`;
  }

  function projectionScreen(a) {
    const pr = P.projection(a);
    if (pr.direction === 'keep') {
      return `
        <h1 class="q-title">Mantener tu peso y mejorar tu composición</h1>
        <div class="card"><p>Tu objetivo es parecido a tu peso actual, así que el plan se centra en ganar fuerza y músculo y en perder grasa sin cambiar mucho la báscula.</p></div>
        <div class="sticky-cta"><button class="btn primary" id="cont">Continuar</button></div>`;
    }
    const pts = pr.points.map((p) => ({ x: p.w, y: p.kg }));
    const marker = pr.event && !pr.event.reached ? { x: pr.event.weeks, label: fmtShort(pr.event.date) } : null;
    const evt = pr.event
      ? `<p class="evt">📅 Para ${EVENT_LABELS[a.event] || 'tu evento'} (${fmtDate(pr.event.date)}) podrías estar en <strong>~${pr.event.kg} kg</strong>${pr.event.reached ? ', ¡ya en tu objetivo!' : '.'}</p>`
      : '';
    return `
      <h1 class="q-title">Podrías llegar a <span class="accent">${a.targetWeight} kg</span> alrededor del ${fmtDate(pr.targetDate)}</h1>
      <div class="card">
        ${chartSVG(pts, { marker, firstLabel: a.weight + ' kg', lastLabel: a.targetWeight + ' kg', x0Label: 'Hoy', x1Label: fmtShort(pr.targetDate), aria: 'Proyección de peso' })}
        ${evt}
        <p class="muted small">Estimación a un ritmo sostenible (~${pr.rate} kg/semana). Es una proyección, no una garantía: depende de tu constancia, tu descanso y tu alimentación.</p>
      </div>
      <div class="sticky-cta"><button class="btn primary" id="cont">Continuar</button></div>`;
  }

  const LOADER_STEPS = ['Analizando tu nivel actual', 'Eligiendo tus progresiones', 'Ajustando la sesión a tu tiempo', 'Calculando tu nutrición'];
  function loaderScreen() {
    return `
      <div class="loader">
        <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="r-bg"/><circle cx="60" cy="60" r="52" class="r-fg" id="ringfg"/></svg><span id="pct">0%</span></div>
        <h1 class="q-title">Creando tu plan de calistenia</h1>
        <ul class="checks">${LOADER_STEPS.map((t, i) => `<li data-i="${i}">${t}</li>`).join('')}</ul>
      </div>`;
  }

  function runLoader() {
    const dur = 4200, t0 = performance.now(), C2 = 2 * Math.PI * 52;
    const fg = $('#ringfg');
    fg.style.strokeDasharray = C2;
    const step = (now) => {
      if (!$('#pct')) return; // el usuario salió de la pantalla
      const t = Math.min(1, (now - t0) / dur);
      const pct = Math.round(t * 100);
      $('#pct').textContent = pct + '%';
      fg.style.strokeDashoffset = C2 * (1 - t);
      $$('.checks li').forEach((li) => li.classList.toggle('done', pct >= (+li.dataset.i + 1) * 24));
      if (t < 1) requestAnimationFrame(step);
      else setTimeout(finishQuiz, 350);
    };
    requestAnimationFrame(step);
  }

  function finishQuiz() {
    const a = quiz.answers;
    const plan = P.generatePlan(a, 1);
    let id;
    if (quiz.editingId && S.get(quiz.editingId)) {
      id = quiz.editingId;
      S.update(id, (p) => { p.answers = a; p.plan = plan; });
    } else {
      id = S.create(a, plan).id;
    }
    quiz = null;
    S.clearDraft();
    location.replace('#/plan/' + id);
  }

  // ---------- Plan ----------
  function renderPlan(id, tab) {
    const p = S.get(id);
    if (!p) return location.replace('#/');
    const a = p.answers;
    const m = P.metrics(a);
    const pr = P.projection(a);
    const pg = profileProgress(p);
    let head, content;
    if (tab === 'nutri') {
      head = areaHead('🍽️ Nutrición', `Meta: ${P.nutrition(a, m).kcal} kcal al día`);
      content = nutriTab(p, m);
    } else if (tab === 'progress') {
      const st = stats(p);
      head = areaHead('📈 Progreso', `Bloque ${p.plan.block} · ${p.plan.levelName} · ${GOAL_LABELS[a.goal]}`);
      content = `
        <div class="stat-row">
          <div class="stat"><span>IMC</span><strong>${m.bmi}</strong></div>
          <div class="stat"><span>Sesiones del bloque</span><strong>${pg.done}/${pg.total}</strong></div>
          <div class="stat"><span>Objetivo</span><strong>${pr.direction === 'keep' ? 'Mantener' : fmtShort(pr.targetDate)}</strong></div>
        </div>
        <div class="stats3">
          <div><strong>${st.streak}</strong><span>🔥 semanas seguidas</span></div>
          <div><strong>${st.sessions}</strong><span>✅ sesiones</span></div>
          <div><strong>${st.minutes}</strong><span>⏱ minutos</span></div>
        </div>
        <h3 class="sec-title">Logros</h3>
        <div class="badges">${st.badges.map((b) => `<span class="badge ${b.ok ? 'ok' : ''}" title="${b.t}">${b.e}<small>${b.t}</small></span>`).join('')}</div>
        ${progressTab(p, pg)}`;
    } else if (tab === 'profile') {
      head = areaHead('👤 Perfil', `${esc(a.name)} · ${a.age} años · ${a.weight} kg · ${a.height} cm`);
      content = profileTab(p);
    } else {
      tab = 'plan';
      head = trainHead('plan', p);
      content = planTab(p);
    }
    $app.innerHTML = `
      <div class="screen plan">
        ${head}
        <main class="plan-body">${content}</main>
      </div>`;
    bindHead();
    bindPlanTab(p, tab);
    mountAnims();
  }

  function planTab(p) {
    const w = ui.week[p.id] || currentWeek(p);
    const week = p.plan.weeks[w - 1];
    return `
      <div class="week-chips">${p.plan.weeks.map((wk) => `<button class="chip ${wk.week === w ? 'on' : ''}" data-w="${wk.week}">Semana ${wk.week}</button>`).join('')}</div>
      <p class="week-title">${esc(week.title)}</p>
      <div class="days">
        ${week.days.map((d, i) => {
          const log = p.log[`${p.plan.block}-${w}-${i}`];
          return `
            <a class="day-card ${log?.done ? 'done' : ''}" href="#/session/${p.id}/${w}/${i}">
              <div class="day-badge">${log?.done ? '✓' : d.weekday.slice(0, 3)}</div>
              <div class="day-main">
                <strong>${esc(d.name)}</strong>
                <span>${d.weekday} · ${d.exercises.length} ejercicios · ~${d.minutes} min${d.finisher ? ' · + cardio' : ''}</span>
              </div>
              <span class="go">›</span>
              <div class="day-strip">${d.exercises.slice(0, 5).map((e) => animBox(e.id, 'strip', { static: 1 })).join('')}</div>
            </a>`;
        }).join('')}
      </div>
      <p class="muted small center">Descansa al menos un día entre sesiones de cuerpo completo. Camina en tus días libres.</p>
      <a class="btn ghost wide" href="#/ejercicios">🤸 Ver todos los ejercicios animados</a>`;
  }

  function currentWeek(p) {
    for (const wk of p.plan.weeks) {
      if (wk.days.some((_, i) => !p.log[`${p.plan.block}-${wk.week}-${i}`]?.done)) return wk.week;
    }
    return 4;
  }

  // ---------- Comidas del día ----------
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const MEALS = [['desayuno', '☕ Desayuno'], ['almuerzo', '🍽️ Almuerzo'], ['once', '🥪 Once'], ['cena', '🌙 Cena'], ['snack', '🍎 Snack']];
  function mealByHour(h = new Date().getHours()) { return h < 11 ? 'desayuno' : h < 16 ? 'almuerzo' : h < 19 ? 'once' : h < 23 ? 'cena' : 'snack'; }
  // Día que se está mirando en Nutrición (hoy, o uno anterior para revisar o completar)
  const fromKey = (k) => { const [y, mo, d] = k.split('-').map(Number); return new Date(y, mo - 1, d); };
  function diaSel() { const hoy = dayKey(); return ui.dia && ui.dia < hoy ? ui.dia : hoy; }
  function diaNombre(k, largo) {
    const hoy = dayKey(), ay = new Date(); ay.setDate(ay.getDate() - 1);
    if (k === hoy) return 'Hoy';
    if (k === dayKey(ay)) return largo ? 'Ayer, ' + fromKey(k).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : 'Ayer';
    const t = fromKey(k).toLocaleDateString('es', largo ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function moverDia(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return dayKey(d); }
  // Hora para lo que se anota en un día anterior (mediodía de ese día); hoy usa la hora real.
  const horaDelDia = (k) => (k === dayKey() ? Date.now() : fromKey(k).getTime() + 12 * 3600000);
  // Barra para ir a otro día (en Entrenamiento, Nutrición y Progreso). Al abrir la app siempre parte en hoy.
  function dayNavHTML(key, aviso = 'Lo que anotes queda guardado en ese día.') {
    const hoy = dayKey(), esHoy = key === hoy;
    return `
      <div class="day-nav">
        <button class="icon-btn" id="dprev" aria-label="Día anterior">‹</button>
        <label class="day-pick"><span>📅 ${esc(diaNombre(key, true))}</span><input type="date" id="dpick" value="${key}" max="${hoy}" aria-label="Elegir una fecha"></label>
        <button class="icon-btn" id="dnext" aria-label="Día siguiente" ${esHoy ? 'disabled' : ''}>›</button>
      </div>
      ${esHoy ? '' : `<div class="note day-past">🕓 Estás viendo un día anterior. ${esc(aviso)} <button class="btn link" id="dhoy">Volver a hoy</button></div>`}`;
  }
  function bindDayNav(redraw) {
    const k = diaSel();
    const ir = (d) => { ui.dia = d >= dayKey() ? null : d; redraw(); };
    const b = (sel, fn) => { const el = document.querySelector(sel); if (el) el.onclick = fn; };
    b('#dprev', () => ir(moverDia(k, -1)));
    b('#dnext', () => ir(moverDia(k, 1)));
    b('#dhoy', () => ir(dayKey()));
    const pick = document.getElementById('dpick');
    if (pick) pick.onchange = (e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) ir(e.target.value); };
    $$('[data-dia]').forEach((el) => el.onclick = () => ir(el.dataset.dia));
  }
  // Si la app queda en segundo plano más de 20 minutos, al volver se muestra hoy.
  let ocultoDesde = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { ocultoDesde = Date.now(); return; }
    if (ui.dia && ocultoDesde && Date.now() - ocultoDesde > 20 * 60000) {
      ui.dia = null;
      if (modal.classList.contains('hidden') && !/^#\/(guide|routine|quiz|session)/.test(location.hash)) route();
    }
  });
  // Entrenamientos marcados como hechos en un día (sesiones del plan, rutinas y otras actividades)
  function entrenosDelDia(p, k) {
    return Object.entries(p.log || {}).filter(([, l]) => l.done && l.date && dayKey(new Date(l.date)) === k).map(([key, l]) => {
      let name = l.routine, min = l.min;
      if (!name) {
        const [b, w, d] = key.split('-').map(Number);
        const day = b === p.plan.block ? p.plan.weeks[w - 1]?.days[d] : null;
        name = day ? `${day.name} · semana ${w}` : `Sesión del bloque ${b}, semana ${w}`;
        min = min || day?.minutes;
      }
      return { key, name, min };
    });
  }
  function dayEntries(p, key = dayKey()) { return ((p.food || {})[key] || []).filter((e) => !e.deleted); }
  function dayTotals(p, key) {
    return dayEntries(p, key).reduce((t, e) => ({ kcal: t.kcal + (e.kcal || 0), p: t.p + (e.p || 0), c: t.c + (e.c || 0), g: t.g + (e.g || 0), fb: t.fb + (e.fb || 0), azu: t.azu + (e.azu || 0), sod: t.sod + (e.sod || 0), sat: t.sat + (e.sat || 0) }), { kcal: 0, p: 0, c: 0, g: 0, fb: 0, azu: 0, sod: 0, sat: 0 });
  }
  const uidF = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function addFood(id, entries, key = diaSel()) {
    S.update(id, (x) => {
      x.food = x.food || {};
      x.food[key] = (x.food[key] || []).concat(entries.map((e) => ({ id: uidF(), at: Date.now(), t: Date.now(), ...e })));
    }, false);
  }
  function removeFood(id, key, fid) {
    S.update(id, (x) => { const e = (x.food?.[key] || []).find((y) => y.id === fid); if (e) { e.deleted = true; e.t = Date.now(); } }, false);
  }

  // Resumen del día: anillo con lo consumido frente a la meta
  function foodDayCard(p, goal, key = dayKey()) {
    const t = dayTotals(p, key), esHoy = key === dayKey();
    const pct = Math.min(1, t.kcal / goal), over = t.kcal > goal;
    const R = 52, C = 2 * Math.PI * R;
    return `
      <div class="card food-day ${over ? 'over' : ''}">
        <div class="fd-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" class="r-bg"/><circle cx="60" cy="60" r="${R}" class="r-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - pct)}"/></svg>
          <span><strong>${Math.round(t.kcal)}</strong><small>de ${goal} kcal</small></span></div>
        <div class="fd-info">
          <h3>${esc(diaNombre(key))}</h3>
          <p class="${over ? 'bad' : ''}">${over ? `⚠️ ${esHoy ? 'Te pasaste' : 'Te pasaste ese día'} por <strong>${Math.round(t.kcal - goal)} kcal</strong>` : esHoy ? `Te quedan <strong>${Math.round(goal - t.kcal)} kcal</strong>` : t.kcal ? `Quedaste <strong>${Math.round(goal - t.kcal)} kcal</strong> bajo la meta` : 'No hay nada anotado ese día'}</p>
          <span class="muted small">Proteína ${Math.round(t.p)} g · Carbos ${Math.round(t.c)} g · Grasa ${Math.round(t.g)} g · Fibra ${Math.round(t.fb)} g</span>
          ${t.azu || t.sod || t.sat ? `<span class="muted small">De lo anotado con etiqueta: azúcares ${Math.round(t.azu)} g · grasas sat. ${Math.round(t.sat)} g · sodio ${Math.round(t.sod)} mg</span>` : ''}
        </div>
      </div>`;
  }

  // Colores revisados para daltonismo (proteína, carbohidratos, grasas)
  const MACRO_COLORS = { p: '#E2572B', c: '#2E9E6B', g: '#6B6FD6' };
  function macroDonut(t, goals, titulo = '¿Qué comiste hoy?') {
    const parts = [
      { k: 'p', name: 'Proteína', gr: t.p, kcal: t.p * 4 },
      { k: 'c', name: 'Carbohidratos', gr: t.c, kcal: t.c * 4 },
      { k: 'g', name: 'Grasas', gr: t.g, kcal: t.g * 9 },
    ];
    const tot = parts.reduce((x, y) => x + y.kcal, 0);
    const R = 46, C = 2 * Math.PI * R, gap = tot ? 2.2 : 0;
    let off = 0;
    const segs = tot ? parts.map((q) => {
      const len = (q.kcal / tot) * C;
      const seg = len > gap ? `<circle cx="60" cy="60" r="${R}" class="dn-seg" stroke="${MACRO_COLORS[q.k]}" style="stroke-dasharray:${(len - gap).toFixed(2)} ${(C - len + gap).toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"><title>${q.name}: ${Math.round(q.gr)} g · ${Math.round((q.kcal / tot) * 100)}%</title></circle>` : '';
      off += len;
      return seg;
    }).join('') : '';
    const meter = (label, val, goal, color) => {
      const pct = Math.min(100, Math.round((val / goal) * 100));
      return `<div class="meter"><div class="meter-top"><span>${label}</span><strong>${Math.round(val)} <small>/ ${goal} g</small></strong></div>
        <div class="meter-track"><i style="width:${pct}%;background:${color}"></i></div></div>`;
    };
    return `
      <div class="card macros-card">
        <h3>${esc(titulo)}</h3>
        <div class="dn-row">
          <div class="dn"><svg viewBox="0 0 120 120" role="img" aria-label="Reparto de calorías por macronutriente">
            <circle cx="60" cy="60" r="${R}" class="dn-track"/>${segs}</svg>
            <span><strong>${Math.round(tot)}</strong><small>kcal de<br>macros</small></span></div>
          <ul class="dn-legend">${parts.map((q) => `
            <li><i style="background:${MACRO_COLORS[q.k]}"></i><span>${q.name}</span>
              <strong>${tot ? Math.round((q.kcal / tot) * 100) : 0}%</strong><small>${Math.round(q.gr)} g</small></li>`).join('')}</ul>
        </div>
        ${tot ? '' : '<p class="muted small">Anota lo que comes para ver el reparto.</p>'}
        ${meter('Proteína (meta del día)', t.p, goals.protein, MACRO_COLORS.p)}
        ${meter('Fibra (meta del día)', t.fb, goals.fiber, MACRO_COLORS.c)}
        <p class="muted small">La torta muestra de dónde vienen tus calorías. Lo ideal para tu objetivo: proteína ~${goals.pPct}% · carbohidratos ~${goals.cPct}% · grasas ~${goals.gPct}%.</p>
      </div>`;
  }

  function nutriTab(p, m) {
    const a = p.answers;
    const n = P.nutrition(a, m);
    const key = diaSel(), hoy = dayKey(), esHoy = key === hoy;
    const entries = dayEntries(p, key);
    // 7 días que terminan hoy (o en el día elegido, si es más antiguo)
    const fin = moverDia(key, 6) < hoy ? key : hoy;
    const week = Array.from({ length: 7 }, (_, i) => { const k = moverDia(fin, i - 6); return { k, d: fromKey(k), kcal: dayTotals(p, k).kcal, n: dayEntries(p, k).length }; });
    const inicioPlan = dayKey(new Date(p.createdAt));
    const sinAnotar = week.filter((w) => !w.n && w.k !== hoy && w.k >= inicioPlan);
    const maxK = Math.max(n.kcal * 1.2, ...week.map((w) => w.kcal));
    const tTot = dayTotals(p, key);
    const pK = n.protein * 4, cK = n.carbs * 4, gK = n.fat * 9, allK = pK + cK + gK;
    const goals = { protein: n.protein, fiber: Math.round((n.kcal / 1000) * 14), pPct: Math.round((pK / allK) * 100), cPct: Math.round((cK / allK) * 100), gPct: Math.round((gK / allK) * 100) };
    const foodBlock = `
      ${dayNavHTML(key)}
      ${foodDayCard(p, n.kcal, key)}
      ${macroDonut(tTot, goals, esHoy ? '¿Qué comiste hoy?' : '¿Qué comiste ese día?')}
      <div class="food-actions">
        <label class="btn primary">📷 ${esHoy ? 'Foto del plato' : 'Foto de ese día'}<input type="file" id="foodphoto" accept="image/*" ${esHoy ? 'capture="environment"' : ''} hidden></label>
        <button class="btn ghost" id="foodmanual">✍️ Anotar a mano</button>
      </div>
      ${esHoy ? '<label class="btn link small center-link">🖼️ O elige una foto de la galería<input type="file" id="foodgal" accept="image/*" hidden></label>' : ''}
      <p class="muted small center">Claude revisa la foto con tu suscripción, en tu PC, y la anota sola en tu día. Si el PC está apagado, la foto espera hasta que lo enciendas. Es un cálculo aproximado.</p>
      ${MEALS.map(([mk, ml]) => {
        const list = entries.filter((e) => e.meal === mk);
        if (!list.length) return '';
        const kc = list.reduce((t, e) => t + e.kcal, 0);
        return `<div class="card meal"><h3>${ml} <span class="muted small">${Math.round(kc)} kcal</span></h3>
          <ul class="list compact">${list.map((e) => e.pend || e.err ? `<li class="food-pend ${e.err ? 'bad' : ''}"><span>${e.etiqueta ? '🏷️' : e.consulta ? '🤖' : '📷'} ${e.err ? esc(e.err) : e.consulta ? `${e.etiqueta ? 'Claude lee la etiqueta' : 'Claude calcula'}: ${esc(e.consulta)}${e.cant ? ' · ' + esc(e.cant) : ''}` : 'Foto en espera de Claude…'}<small class="muted">${e.err ? '' : e.aviso ? ' · ' + esc(e.aviso) : Sync.pcEncendido() ? ' · se está revisando' : ' · se revisa al encender el PC'}</small></span><strong></strong><button class="food-del" data-del="${e.id}" aria-label="Quitar">×</button></li>`
            : `<li><span ${e.foto ? `class="food-rev" data-rev="${e.foto}" role="button" tabindex="0"` : ''}>${esc(e.name)}<small class="muted"> · ${e.ml ? e.ml + ' ml' : e.gr ? e.gr + ' g' : ''}${e.src === 'foto' ? ' · 📷' : ''}</small></span><strong>${Math.round(e.kcal)} kcal</strong><button class="food-del" data-del="${e.id}" aria-label="Quitar">×</button></li>`).join('')}</ul></div>`;
      }).join('')}
      ${entries.length ? '' : `<p class="muted center">${esHoy ? 'Todavía no anotas nada hoy.' : 'No anotaste nada este día. Puedes completarlo ahora.'}</p>`}
      <div class="card"><h3>${fin === hoy ? 'Últimos 7 días' : 'Esa semana'} <span class="muted small">toca un día para verlo</span></h3>
        <div class="week-bars">${week.map((w) => `<button class="wb ${w.k === key ? 'sel' : ''} ${w.n ? '' : 'empty'}" data-dia="${w.k}" aria-label="${esc(diaNombre(w.k, true))}: ${Math.round(w.kcal)} kcal"><i style="height:${Math.round((w.kcal / maxK) * 100)}%" class="${w.kcal > n.kcal ? 'over' : ''}"></i><small>${w.d.toLocaleDateString('es', { weekday: 'short' }).slice(0, 2)}<br>${w.d.getDate()}</small></button>`).join('')}
          <div class="wb-goal" style="bottom:${Math.round((n.kcal / maxK) * 100)}%"><span>meta</span></div></div>
        ${sinAnotar.length ? `<p class="small warn-txt">⚠️ Sin nada anotado: ${sinAnotar.map((w) => `<button class="btn link small" data-dia="${w.k}">${esc(diaNombre(w.k))}</button>`).join(' · ')}. Tócalo para completarlo.</p>` : ''}
      </div>`;
    const pk = n.protein * 4, fk = n.fat * 9, ck = n.carbs * 4, tot = pk + fk + ck;
    const macro = (label, g, k, cls) => `
      <div class="macro">
        <div class="macro-top"><span>${label}</span><strong>${g} g</strong></div>
        <div class="bar ${cls}"><i style="width:${Math.round((k / tot) * 100)}%"></i></div>
      </div>`;
    const goalTxt = { lose: 'déficit moderado (~20%)', recomp: 'déficit leve (~10%)', muscle: 'superávit leve (~10%)' }[a.goal] || 'mantenimiento';
    return `
      ${foodBlock}
      <div class="card kcal-card">
        <span class="muted">Calorías diarias recomendadas</span>
        <div class="kcal">${n.kcal}<small> kcal</small></div>
        <span class="muted small">Gasto estimado ${m.tdee} kcal → ${goalTxt}</span>
      </div>
      <div class="card">
        ${macro('Proteína', n.protein, pk, 'p')}
        ${macro('Carbohidratos', n.carbs, ck, 'c')}
        ${macro('Grasas', n.fat, fk, 'f')}
        <p class="muted small">💧 Agua: ~${n.water} L al día, más 0,5 L los días que entrenes.</p>
      </div>
      <div class="card">
        <h3>Buenas fuentes de proteína</h3>
        <ul class="list">${n.foods.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h3>Ejemplo de día</h3>
        <ul class="list">${n.meals.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <p class="muted small">Ajusta las porciones para acercarte a tus calorías. Si tienes alguna condición médica, consulta a un nutricionista.</p>
      </div>
      <div class="card">
        <h3>Consejos para ti</h3>
        <ul class="list tips">${P.tips(a).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`;
  }

  function progressTab(p, pg) {
    const ws = p.weights || [];
    const chart = ws.length >= 2
      ? chartSVG(ws.map((w, i) => ({ x: i, y: w.kg })), { firstLabel: ws[0].kg + ' kg', lastLabel: ws[ws.length - 1].kg + ' kg', x0Label: fmtShort(ws[0].date), x1Label: fmtShort(ws[ws.length - 1].date), aria: 'Evolución del peso' })
      : '<p class="muted small">Registra tu peso cada semana para ver tu evolución.</p>';
    return `
      <div class="card">
        <h3>Bloque ${p.plan.block}: ${pg.done} de ${pg.total} sesiones</h3>
        <div class="bar big"><i style="width:${pg.pct}%"></i></div>
        <p class="muted small">${pg.pct >= 75 ? '¡Gran trabajo! Ya puedes pasar al siguiente bloque.' : 'Completa al menos el 75% de las sesiones antes de subir de bloque.'}</p>
        <button class="btn ${pg.pct >= 75 ? 'primary' : 'ghost'}" id="nextblock">Generar bloque ${p.plan.block + 1} (más difícil) →</button>
      </div>
      <div class="card">
        <h3>Peso</h3>
        ${chart}
        <div class="inline-form">
          <input id="wkg" type="text" inputmode="decimal" placeholder="Peso (kg)">
          <input id="wdate" type="date" value="${diaSel()}" max="${dayKey()}" aria-label="Fecha del peso">
          <button class="btn primary small" id="addw">Guardar</button>
        </div>
        <ul class="list compact">${ws.slice().sort((x, y) => y.date - x.date).slice(0, 8).map((w) => `<li><span>${fmtDate(w.date)}</span><strong>${w.kg} kg</strong></li>`).join('')}</ul>
      </div>
      ${historialHTML(p)}`;
  }

  // Últimos 14 días: qué se entrenó y cuánto se comió. Tocar un día lo abre para revisarlo o completarlo.
  function historialHTML(p) {
    const goal = P.nutrition(p.answers, P.metrics(p.answers)).kcal;
    const inicio = dayKey(new Date(p.createdAt));
    const dias = Array.from({ length: 14 }, (_, i) => moverDia(dayKey(), -i)).filter((k) => k >= inicio);
    return `
      <div class="card">
        <h3>Tus últimos días <span class="muted small">toca uno para verlo</span></h3>
        <ul class="list compact hist">${dias.map((k) => {
          const e = entrenosDelDia(p, k), kc = Math.round(dayTotals(p, k).kcal);
          return `<li><button class="hist-row" data-hist="${k}"><span class="hist-day">${esc(diaNombre(k))}</span>
            <span class="hist-tr ${e.length ? 'ok' : 'muted'}">${e.length ? '🏋️ ' + esc(e.map((x) => x.name.split(' · ')[0]).join(', ')) : 'Sin entrenamiento'}</span>
            <span class="hist-kc ${kc > goal ? 'bad' : kc ? '' : 'muted'}">${kc ? kc + ' kcal' : 'sin comidas'}</span></button></li>`;
        }).join('')}</ul>
      </div>`;
  }

  function answerLabel(st, v) {
    if (v === undefined || v === null || v === '') return '—';
    if (st.options) {
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((x) => st.options.find((o) => o.v === x)?.label ?? x).join(', ');
    }
    if (st.type === 'date') return fmtDate(v + 'T00:00:00');
    return v + (st.unit ? ' ' + st.unit : '');
  }

  function profileTab(p) {
    const a = p.answers;
    const rows = window.QUIZ_STEPS.filter((s) => ['single', 'multi', 'input', 'date'].includes(s.type));
    const eqStep = window.QUIZ_STEPS.find((s) => s.id === 'equipment');
    const modeStep = window.QUIZ_STEPS.find((s) => s.id === 'trxMode');
    const eq = a.equipment || [];
    const profs = S.profiles();
    const m = P.metrics(a);
    return `
      <div class="card">
        <h3>Mis datos</h3>
        <dl class="answers two">
          <dt>Nombre</dt><dd>${esc(a.name)}</dd>
          <dt>Objetivo</dt><dd>${GOAL_LABELS[a.goal]}</dd>
          <dt>Edad</dt><dd>${a.age} años</dd>
          <dt>Estatura</dt><dd>${a.height} cm</dd>
          <dt>Peso actual</dt><dd>${a.weight} kg</dd>
          <dt>Peso objetivo</dt><dd>${a.targetWeight} kg</dd>
          <dt>IMC</dt><dd>${m.bmi}</dd>
          <dt>Entrena</dt><dd>${a.days} días/sem · ${a.duration} min</dd>
        </dl>
        <button class="btn ghost wide" id="redo">✏️ Cambiar mis respuestas (rehacer cuestionario)</button>
      </div>
      <div class="card">
        <h3>Mi equipo</h3>
        ${['Calistenia', 'Fuerza', 'Cardio'].map((gname) => `
          <p class="eq-group">${gname}</p>
          <div class="eq-list">
            ${eqStep.options.filter((o) => o.group === gname).map((o) => `<label class="eq"><input type="checkbox" value="${o.v}" ${eq.includes(o.v) ? 'checked' : ''}><span>${o.emoji} ${esc(o.label)}</span></label>`).join('')}
          </div>`).join('')}
        <p class="eq-group">Otro equipo</p>
        <div id="tagsbox">${tagsHTML(a.equipmentOther || [])}</div>
        <div id="trxmode" ${eq.includes('trx') ? '' : 'hidden'}>
          <p class="muted small">¿Cómo quieres usar el TRX?</p>
          <div class="seg-choice">${modeStep.options.map((o) => `<label><input type="radio" name="trxm" value="${o.v}" ${(a.trxMode || 'mix') === o.v ? 'checked' : ''}><span>${o.emoji} ${esc(o.label)}</span></label>`).join('')}</div>
        </div>
        <button class="btn primary wide" id="eqsave">Actualizar mi plan</button>
        <p class="muted small center">Se mantienen tu bloque, tus sesiones completadas y tu progreso.</p>
      </div>
      <div class="card">
        <h3>Configuración de la app</h3>
        <label class="set-row">🎨 Apariencia ${themeSelect()}</label>
        <label class="set-row">🧍 Quién muestra los ejercicios
          <select id="charsel">
            <option value="man" ${animPref() === 'man' ? 'selected' : ''}>🧔 Hombre (pelo castaño)</option>
            <option value="man2" ${animPref() === 'man2' ? 'selected' : ''}>🧔🏽 Hombre (barba)</option>
            ${window.NUBE?.sinMixamo ? '' : `<option value="human" ${animPref() === 'human' ? 'selected' : ''}>👩 Mujer</option>
            <option value="mannequin" ${animPref() === 'mannequin' ? 'selected' : ''}>🤖 Maniquí</option>`}
            <option value="custom" ${animPref() === 'custom' ? 'selected' : ''}>👤 Mi personaje (.glb)…</option>
            <option value="2d" ${animPref() === '2d' ? 'selected' : ''}>✏️ Dibujo 2D (más liviano)</option>
          </select>
        </label>
        <input type="file" id="charfile" accept=".glb,model/gltf-binary" hidden>
        <button class="set-row set-btn" id="opensync">☁ Nube: tus datos en todos tus aparatos <span>›</span></button>
        <button class="set-row set-btn" id="install" ${deferredInstall ? '' : 'hidden'}>⬇ Instalar la app en este dispositivo <span>›</span></button>
      </div>
      <div class="card">
        <h3>Planes guardados <span class="count">${profs.length}</span></h3>
        ${profs.map((x) => {
          const pg = profileProgress(x);
          return `
            <button class="profile-card ${x.id === p.id ? 'active' : ''}" data-id="${x.id}">
              <div class="avatar">${esc((x.answers.name || '?').slice(0, 1).toUpperCase())}</div>
              <div class="pc-main">
                <strong>${esc(x.answers.name)}${x.id === p.id ? ' <small class="tag">En uso</small>' : ''}</strong>
                <span>${GOAL_LABELS[x.answers.goal]} · Bloque ${x.plan.block} · ${x.answers.days} días/sem</span>
                <div class="bar"><i style="width:${pg.pct}%"></i></div>
              </div>
              <span class="pc-pct">${pg.pct}%</span>
            </button>`;
        }).join('')}
        <details class="new-plan">
          <summary>＋ Crear un plan nuevo</summary>
          <p class="sub">Elige el rango de edad</p>
          ${ageCardsHTML()}
        </details>
      </div>
      <div class="card">
        <h3>Respaldo de datos</h3>
        <div class="stack">
          <button class="btn ghost" id="exportall">💾 Exportar todos mis datos</button>
          <label class="btn ghost">📂 Importar datos<input type="file" id="import" accept="application/json,.json" hidden></label>
        </div>
      </div>
      <div class="card">
        <h3>Respuestas</h3>
        <dl class="answers">
          <dt>Rango de edad</dt><dd>${esc(a.ageRange)}</dd>
          ${rows.map((s) => `<dt>${esc(val(s.title, a))}</dt><dd>${esc(answerLabel(s, a[s.id]))}</dd>`).join('')}
        </dl>
      </div>
      <div class="stack">
        <button class="btn ghost" id="exportone">Exportar este plan</button>
        <button class="btn danger" id="del">Eliminar este plan</button>
      </div>
      <p class="muted small center">Creado el ${fmtDate(p.createdAt)}</p>`;
  }

  function bindPlanTab(p, tab) {
    if (tab === 'nutri') {
      const k = diaSel();
      bindDayNav(() => renderPlan(p.id, 'nutri'));
      $$('[data-del]').forEach((b) => b.onclick = () => { removeFood(p.id, k, b.dataset.del); renderPlan(p.id, 'nutri'); });
      $('#foodmanual').onclick = () => openManualFood(p);
      const foto = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) analyzePhoto(p, f); };
      $('#foodphoto').onchange = foto;
      const gal = $('#foodgal'); if (gal) gal.onchange = foto;
      $$('[data-rev]').forEach((el) => el.onclick = () => showFoodReview(p, el.dataset.rev, k, null));
      dayEntries(p, k).filter((e) => e.pend).forEach((e) => fotosEnEspera.add(e.id));
    }
    if (tab === 'plan') {
      $$('.chip').forEach((b) => b.onclick = () => { ui.week[p.id] = +b.dataset.w; renderPlan(p.id, 'plan'); });
    } else if (tab === 'progress') {
      $('#nextblock').onclick = () => {
        if (!confirm(`¿Generar el bloque ${p.plan.block + 1}? Los ejercicios subirán de nivel. Tu historial se conserva.`)) return;
        S.update(p.id, (x) => { x.plan = P.generatePlan(x.answers, x.plan.block + 1); });
        ui.week[p.id] = 1;
        go(`#/plan/${p.id}?tab=plan`);
      };
      const add = () => {
        const v = parseFloat($('#wkg').value.replace(',', '.'));
        if (isNaN(v) || v < 30 || v > 300) return alert('Introduce un peso válido en kg.');
        const wd = /^\d{4}-\d{2}-\d{2}$/.test($('#wdate').value) && $('#wdate').value <= dayKey() ? $('#wdate').value : dayKey();
        const date = horaDelDia(wd), kg = Math.round(v * 10) / 10;
        S.update(p.id, (x) => {
          x.weights = (x.weights || []).concat({ date, kg });
          // la nutrición se recalcula con el peso más reciente
          if (x.weights.every((w) => w.date <= date)) x.answers.weight = kg;
        });
        renderPlan(p.id, 'progress');
      };
      $('#addw').onclick = add;
      $$('[data-hist]').forEach((b) => b.onclick = () => { ui.dia = b.dataset.hist === dayKey() ? null : b.dataset.hist; go('#/'); });
      $('#wkg').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    } else if (tab === 'profile') {
      $('#redo').onclick = () => startQuiz({ ...p.answers }, p.id);
      $$('.profile-card').forEach((b) => b.onclick = () => {
        try { localStorage.setItem('calistenia.activo', b.dataset.id); } catch (e) { /* */ }
        go('#/plan/' + b.dataset.id + '?tab=profile');
      });
      $$('.age-card').forEach((b) => b.onclick = () => startQuiz({ ageRange: b.dataset.age }));
      $('#exportall').onclick = () => download(`calistenia-${new Date().toISOString().slice(0, 10)}.json`, S.exportJSON());
      $('#import').onchange = (e) => importFile(e);
      $('#opensync').onclick = openSync;
      bindThemeSelect();
      const inst = $('#install');
      if (inst) inst.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; inst.hidden = true; };
      const setChar = (v) => { try { localStorage.setItem('calistenia.anim', v); } catch (er) { /* */ } location.reload(); };
      $('#charsel').onchange = (e) => {
        if (e.target.value !== 'custom') return setChar(e.target.value);
        e.target.value = animPref();
        openCharacterHelp();
      };
      $('#charfile').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!window.CharacterStore) return alert('El motor 3D todavía se está cargando. Intenta de nuevo en unos segundos.');
        try {
          const r = await window.CharacterStore.save(f);
          if (!r.ok) return alert('Ese archivo no sirve como personaje: le faltan estos huesos del esqueleto: ' + r.missing.join(', ') + '.\nUsa un personaje "rigged" (con esqueleto humanoide).');
          setChar('custom');
        } catch (err) { alert('No se pudo leer el archivo: ' + err.message); }
      };
      $$('.eq input').forEach((c) => c.onchange = () => { $('#trxmode').hidden = !$$('.eq input').some((x) => x.checked && x.value === 'trx'); });
      let other = [...(p.answers.equipmentOther || [])];
      const paintTags = () => {
        $('#tagsbox').innerHTML = tagsHTML(other);
        bindTags($('#tagsbox'), other, (list, v) => {
          other = list;
          if (v) { const c = $$('.eq input').find((x) => x.value === v); if (c && !c.checked) { c.checked = true; c.onchange(); } }
          paintTags();
        });
      };
      paintTags();
      $('#eqsave').onclick = () => {
        const eq = $$('.eq input').filter((x) => x.checked).map((x) => x.value);
        const mode = ($$('input[name="trxm"]').find((x) => x.checked) || {}).value || 'mix';
        S.update(p.id, (x) => {
          x.answers.equipment = eq.length ? eq : ['none'];
          x.answers.equipmentOther = other;
          x.answers.trxMode = mode;
          x.plan = P.generatePlan(x.answers, x.plan.block);
        });
        go(`#/plan/${p.id}?tab=plan`);
      };
      $('#exportone').onclick = () => download(`plan-${(p.answers.name || 'perfil').toLowerCase().replace(/\W+/g, '-')}.json`,
        JSON.stringify({ app: 'calistenia', version: 1, profiles: [p] }, null, 2));
      $('#del').onclick = () => {
        if (!confirm(`¿Eliminar el plan de ${p.answers.name}? No se puede deshacer.`)) return;
        S.remove(p.id);
        go('#/');
      };
    }
  }

  // ---------- Animaciones y detalle de ejercicio ----------
  const A = window.ExerciseAnim;
  const MUSCLES = {
    push: 'Pecho · tríceps · hombros', vpush: 'Hombros · tríceps', dip: 'Tríceps · pecho · hombros',
    vpull: 'Dorsales · bíceps · agarre', hpull: 'Espalda alta · bíceps', squat: 'Cuádriceps · glúteos',
    hinge: 'Glúteos · isquiotibiales', core: 'Abdomen · core', skill: 'Equilibrio · hombros · core', cardio: 'Cardio · cuerpo completo',
  };
  const animBox = (key, cls = '', o = {}) => {
    // En modo oscuro las animaciones usan su variante oscura
    if (isDark() && !/\bdark\b/.test(cls)) cls += ' dark';
    return key && A.has(key)
      ? `<div class="anim ${cls}" data-anim="${esc(key)}" data-label="${esc(key)}"${o.detail ? ' data-detail="1"' : ''}${o.static ? ' data-static="1"' : ''}${o.pattern ? ` data-pattern="${o.pattern}"` : ''}${o.cues ? ` data-cues="${esc(o.cues)}"` : ''}></div>`
      : `<div class="anim anim-none ${cls}"><span>🤸</span></div>`;
  };
  const mountAnims = () => A.mountAll($app);

  const modal = document.getElementById('modal');
  function openExercise(x) {
    modal.innerHTML = `
      <div class="m-sheet" role="dialog" aria-modal="true" aria-label="${esc(x.name)}">
        <button class="icon-btn m-close" aria-label="Cerrar">✕</button>
        ${animBox(x.key, 'big', { detail: 1, cues: x.cue, pattern: x.pattern })}
        <h2>${esc(x.name)}</h2>
        ${x.pattern ? `<p class="m-muscles">${MUSCLES[x.pattern] || ''}</p>` : ''}
        ${x.dose ? `<p class="dose">${esc(x.dose)}</p>` : ''}
        <p class="m-cue">${esc(x.cue || '')}</p>
        ${x.perSide ? '<p class="muted small">Haz las repeticiones de un lado y luego cambia.</p>' : ''}
      </div>`;
    modal.classList.remove('hidden');
    A.mountAll(modal);
    modal.querySelector('.m-close').onclick = closeModal;
  }
  function closeModal() { modal.classList.add('hidden'); modal.innerHTML = ''; }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ---------- Sesión ----------
  function doseText(e) {
    const side = e.perSide ? ' por lado' : '';
    return e.kind === 'time' ? `${e.sets} × ${e.sec} s${side}` : `${e.sets} × ${e.reps} reps${side}`;
  }

  function renderSession(id, w, d) {
    const p = S.get(id);
    if (!p) return location.replace('#/');
    const day = p.plan.weeks[w - 1]?.days[d];
    if (!day) return location.replace('#/plan/' + id);
    const key = `${p.plan.block}-${w}-${d}`;
    const log = p.log[key] || { sets: {} };
    const circuit = day.format === 'circuit';
    keepAwake();

    const miniList = (items) => items.map((x, k) => `
      <li class="mini" data-mini="${k}">${animBox(x.name, 'thumb')}<span>${esc(x.name)}</span><strong>${esc(x.dose || '')}</strong></li>`).join('');

    $app.innerHTML = `
      <div class="screen session">
        <header class="plan-head compact">
          <button class="icon-btn light" id="backplan" aria-label="Volver">‹</button>
          <div>
            <h1>${esc(day.name)}</h1>
            <p>Semana ${w} · ${day.weekday} · ~${day.minutes} min</p>
          </div>
        </header>
        <main class="plan-body">
          <p class="muted small center">Mira cada ejercicio antes de empezar: toca la imagen para verlo en grande.</p>
          <div class="sticky-cta"><a class="btn primary" href="#/guide/${id}/${w}/${d}">▶ Empezar entrenamiento guiado</a></div>
          ${circuit ? `<div class="note">🔁 <strong>Formato circuito:</strong> haz un ejercicio tras otro con ${day.exercises[0]?.rest || 30} s de descanso. Al terminar la vuelta descansa 90 s. Cada círculo es una vuelta.</div>` : ''}
          <details class="card collapsible">
            <summary>🔥 Calentamiento · 5 min</summary>
            <ul class="list compact minis" data-group="warmup">${miniList(day.warmup)}</ul>
          </details>
          ${day.exercises.map((e, i) => {
            const sets = log.sets[i] || [];
            return `
              <div class="card ex" data-i="${i}">
                <div class="ex-row">
                  <button class="ex-anim-btn" data-open="${i}" aria-label="Ver cómo se hace ${esc(e.name)}">${animBox(e.id, 'ex-anim flip')}</button>
                  <div class="ex-info">
                    <strong>${i + 1}. ${esc(e.name)}</strong>
                    ${e.trx ? '<span class="tag trx">TRX</span>' : ''}${e.gym ? '<span class="tag gym">Máquina</span>' : ''}${e.db ? '<span class="tag gym">Mancuernas</span>' : ''}${e.emphasis ? '<span class="tag">Énfasis</span>' : ''}${e.skill ? '<span class="tag">Habilidad</span>' : ''}
                    <div class="dose">${doseText(e)}</div>
                    <div class="muted small">Descanso ${e.rest} s</div>
                    <button class="link-btn" data-open="${i}">Cómo se hace ›</button>
                  </div>
                </div>
                <div class="sets">
                  ${Array.from({ length: e.sets }, (_, s) => `<button class="set ${sets[s] ? 'on' : ''}" data-s="${s}" aria-label="Serie ${s + 1}">${s + 1}</button>`).join('')}
                  ${e.kind === 'time' ? `<button class="btn small ghost hold-btn" data-hold="${i}">▶ ${e.sec} s</button>` : ''}
                </div>
              </div>`;
          }).join('')}
          ${day.finisher ? `
            <div class="card finisher">
              <div class="ex-top">
                <div>
                  <strong>⚡ Cardio final</strong>
                  <div class="dose">${day.finisher.rounds} rondas · ${day.finisher.work} s ${day.finisher.machine ? 'fuerte' : 'trabajo'} / ${day.finisher.rest} s ${day.finisher.machine ? 'suave, sin parar' : 'descanso'}</div>
                </div>
                <button class="btn small primary" id="intervals">▶ Iniciar</button>
              </div>
              <ul class="list compact minis" data-group="finisher">${miniList(day.finisher.exercises)}</ul>
              <p class="muted small">${day.finisher.machine ? 'Sube la resistencia o la velocidad en los tramos fuertes.' : 'Alterna los dos ejercicios en cada ronda.'}</p>
            </div>` : ''}
          <details class="card collapsible">
            <summary>🧘 Vuelta a la calma · ${day.cooldown.length} estiramientos</summary>
            <ul class="list compact minis" data-group="cooldown">${miniList(day.cooldown)}</ul>
          </details>
          <div class="card">
            <h3>Notas</h3>
            <textarea id="note" rows="2" placeholder="¿Cómo te fue? Repeticiones reales, sensaciones...">${esc(log.note || '')}</textarea>
          </div>
          <button class="btn ${log.done ? 'ghost' : 'primary'} wide" id="done">${log.done ? '✓ Sesión completada · desmarcar' : 'Marcar sesión como completada'}</button>
        </main>
      </div>`;

    const saveLog = (fn) => S.update(id, (x) => { const l = x.log[key] || (x.log[key] = { sets: {} }); fn(l); });

    $('#backplan').onclick = () => go('#/plan/' + id);
    $$('[data-open]').forEach((b) => b.onclick = () => {
      const e = day.exercises[+b.dataset.open];
      openExercise({ key: e.id, name: e.name, cue: e.cue, pattern: e.pattern, perSide: e.perSide, dose: doseText(e) + ` · descanso ${e.rest} s` });
    });
    $$('.minis').forEach((ul) => {
      const items = ul.dataset.group === 'warmup' ? day.warmup : ul.dataset.group === 'cooldown' ? day.cooldown : day.finisher.exercises;
      ul.querySelectorAll('[data-mini]').forEach((li) => li.onclick = () => {
        const x = items[+li.dataset.mini];
        openExercise({ key: x.name, name: x.name, cue: x.cue, dose: x.dose, pattern: ul.dataset.group === 'finisher' ? 'cardio' : null });
      });
    });
    $$('.ex').forEach((card) => {
      const i = +card.dataset.i;
      const e = day.exercises[i];
      card.querySelectorAll('.set').forEach((b) => b.onclick = () => {
        const s = +b.dataset.s;
        const on = !b.classList.contains('on');
        b.classList.toggle('on', on);
        saveLog((l) => { (l.sets[i] = l.sets[i] || [])[s] = on; });
        const last = i === day.exercises.length - 1 && s === e.sets - 1;
        if (on && !last) runTimer([{ label: circuit ? 'Descanso · siguiente ejercicio' : `Descanso · ${e.name}`, sec: e.rest }]);
      });
      const hold = card.querySelector('[data-hold]');
      if (hold) hold.onclick = () => runTimer(holdPhases(e));
    });
    const iv = $('#intervals');
    if (iv) iv.onclick = () => runTimer(finisherPhases(day.finisher));
    $('#note').onchange = (ev) => saveLog((l) => { l.note = ev.target.value; });
    $('#done').onclick = () => {
      saveLog((l) => { l.done = !l.done; l.date = Date.now(); l.t = Date.now(); l.note = $('#note').value; });
      if (S.get(id).log[key].done) go('#/plan/' + id);
      else renderSession(id, w, d);
    };
    mountAnims();
  }

  const holdPhases = (e) => [{ label: 'Prepárate', sec: 5 }, { label: e.name + (e.perSide ? ' · lado 1' : ''), sec: e.sec }]
    .concat(e.perSide ? [{ label: 'Cambia de lado', sec: 5 }, { label: e.name + ' · lado 2', sec: e.sec }] : []);

  function finisherPhases(f) {
    const phases = [{ label: 'Prepárate', sec: 5, key: f.exercises[0].name }];
    for (let r = 0; r < f.rounds; r++) {
      const x = f.exercises[r % f.exercises.length];
      phases.push({ label: `Ronda ${r + 1}/${f.rounds} · ${x.name}`, sec: f.work, key: x.name, name: x.name, work: true });
      if (r < f.rounds - 1) phases.push({ label: f.machine ? 'Ritmo suave (sin parar)' : 'Descanso', sec: f.rest, key: f.exercises[(r + 1) % f.exercises.length].name, rest: !f.machine, name: f.machine ? 'Suave' : undefined });
    }
    return phases;
  }

  // ---------- Entrenamiento guiado ----------
  let guide = null;
  const MOTTOS = ['Respira hondo. Lo estás haciendo genial.', 'Una serie más cerca de tu objetivo.', 'La constancia vence al talento.',
    'Técnica primero, velocidad después.', 'Tu yo del futuro te lo agradece.', 'Hidrátate y prepárate.', 'Cada repetición suma.'];

  function confetti() {
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const colors = [C.colors.accent, '#FFC94D', '#4CC38A', '#5AA9FF', '#FF6FA5'];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
    }));
    const t0 = performance.now();
    const frame = (now) => {
      const t = now - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const q of parts) {
        q.vy += 0.32; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.a += q.va;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillStyle = q.c; ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2); ctx.restore();
      }
      if (t < 2600) requestAnimationFrame(frame); else cv.remove();
    };
    requestAnimationFrame(frame);
  }

  function buildGuide(day) {
    const steps = [{ type: 'list', group: 'warmup' }];
    const ex = day.exercises;
    if (day.format === 'circuit') {
      const rounds = Math.max(...ex.map((e) => e.sets));
      for (let r = 0; r < rounds; r++) {
        ex.forEach((e, i) => { if (e.sets > r) steps.push({ type: 'work', i, s: r, round: r }, { type: 'rest', sec: e.rest }); });
        const last = steps[steps.length - 1];
        if (r < rounds - 1) { last.sec = 90; last.label = `Fin de la vuelta ${r + 1}`; } else steps.pop();
      }
    } else {
      ex.forEach((e, i) => { for (let s = 0; s < e.sets; s++) steps.push({ type: 'work', i, s }, { type: 'rest', sec: e.rest }); });
      steps.pop();
    }
    if (day.finisher) steps.push({ type: 'rest', sec: 30, label: 'Prepárate para el cardio' }, { type: 'finisher' });
    steps.push({ type: 'list', group: 'cooldown' }, { type: 'done' });
    steps.forEach((st, k) => { if (st.type === 'rest') st.next = steps.slice(k + 1).find((x) => x.type !== 'rest'); });
    return steps;
  }

  function stopGuideTimer() { if (guide) { clearInterval(guide.h); guide.h = null; } }

  function renderGuide(id, w, d) {
    const p = S.get(id);
    const day = p?.plan.weeks[w - 1]?.days[d];
    if (!day) return location.replace('#/');
    const gkey = `${id}/${p.plan.block}/${w}/${d}`;
    if (!guide || guide.key !== gkey) guide = { key: gkey, id, w, d, day, steps: buildGuide(day), idx: 0, logKey: `${p.plan.block}-${w}-${d}` };
    keepAwake();
    renderGuideStep();
  }

  function guideGo(delta) {
    stopGuideTimer();
    guide.idx = Math.max(0, Math.min(guide.steps.length - 1, guide.idx + delta));
    renderGuideStep();
  }

  function stepTitle(st) {
    const e = guide.day.exercises[st.i];
    if (st.type === 'work') return { key: e.id, name: e.name, sub: e.kind === 'time' ? `${e.sec} s${e.perSide ? ' por lado' : ''}` : `${e.reps} reps${e.perSide ? ' por lado' : ''}`, info: `Serie ${st.s + 1} de ${e.sets}` };
    if (st.type === 'finisher') return { key: guide.day.finisher.exercises[0].name, name: 'Cardio final', sub: `${guide.day.finisher.rounds} rondas`, info: '' };
    if (st.type === 'list') return { key: guide.day.cooldown[0].name, name: 'Vuelta a la calma', sub: 'Estiramientos', info: '' };
    return { key: '', name: '¡Terminado!', sub: '', info: '' };
  }

  function ringSVG(frac, label, small) {
    const R = 52, C = 2 * Math.PI * R;
    return `<div class="g-ring ${small ? 'small' : ''}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" class="r-bg"/><circle cx="60" cy="60" r="${R}" class="r-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - frac)}"/></svg><span>${label}</span></div>`;
  }

  function renderGuideStep() {
    const { day, steps, idx } = guide;
    const st = steps[idx];
    const pct = Math.round((idx / (steps.length - 1)) * 100);
    let body = '';

    if (st.type === 'list') {
      const items = st.group === 'warmup' ? day.warmup : day.cooldown;
      body = `
        <p class="g-eyebrow">${st.group === 'warmup' ? 'Paso 1 · Calentamiento' : 'Último paso · Vuelta a la calma'}</p>
        <h1>${st.group === 'warmup' ? 'Calienta 5 minutos' : 'Estira y respira'}</h1>
        <div class="g-grid">${items.map((x) => `<div class="g-item">${animBox(x.name, 'dark')}<strong>${esc(x.name)}</strong><span>${esc(x.dose)}</span></div>`).join('')}</div>
        <div class="g-actions"><button class="btn primary" id="gnext">${st.group === 'warmup' ? 'Listo, ¡a entrenar!' : 'Terminar sesión'}</button></div>`;
    } else if (st.type === 'work') {
      const e = day.exercises[st.i];
      const total = day.exercises.length;
      body = `
        ${animBox(e.id, 'g-anim dark', { detail: 1, cues: e.cue, pattern: e.pattern })}
        <p class="g-eyebrow">${day.format === 'circuit' ? `Vuelta ${st.round + 1} · ` : ''}Ejercicio ${st.i + 1} de ${total} · Serie ${st.s + 1} de ${e.sets}</p>
        <h1>${esc(e.name)}</h1>
        <div class="g-target" id="gtarget">${e.kind === 'time' ? `${e.sec}<small> s${e.perSide ? ' por lado' : ''}</small>` : `${e.reps}<small> reps${e.perSide ? ' por lado' : ''}</small>`}</div>
        <details class="g-how"><summary>Cómo se hace</summary><p>${esc(e.cue)}</p></details>
        <div class="g-actions">
          ${e.kind === 'time' ? `<button class="btn primary" id="gstart">▶ Empezar ${e.sec} s</button>` : ''}
          <button class="btn ${e.kind === 'time' ? 'ghost' : 'primary'}" id="gdone">✓ Serie hecha</button>
        </div>`;
    } else if (st.type === 'rest') {
      const nx = stepTitle(st.next);
      body = `
        <p class="g-eyebrow">${esc(st.label || 'Descanso')}</p>
        <h1>Descansa</h1>
        <div id="gring">${ringSVG(1, st.sec)}</div>
        <div class="g-actions"><button class="btn ghost" id="gadd">+15 s</button><button class="btn primary" id="gnext">Saltar descanso</button></div>
        <p class="g-motto">${MOTTOS[Math.floor(Math.random() * MOTTOS.length)]}</p>
        <div class="g-next">${animBox(nx.key, 'thumb dark')}<div><small>Siguiente</small><strong>${esc(nx.name)}</strong><span>${esc([nx.sub, nx.info].filter(Boolean).join(' · '))}</span></div></div>`;
    } else if (st.type === 'finisher') {
      const f = day.finisher;
      body = `
        <div id="gfanim">${animBox(f.exercises[0].name, 'g-anim dark', { detail: 1, pattern: 'cardio' })}</div>
        <p class="g-eyebrow" id="gflabel">Cardio final · ${f.rounds} rondas de ${f.work} s</p>
        <h1 id="gfname">${esc(f.exercises.map((x) => x.name).join(' + '))}</h1>
        <div id="gring">${ringSVG(1, f.work)}</div>
        <div class="g-actions"><button class="btn primary" id="gstart">▶ Empezar intervalos</button><button class="btn ghost" id="gnext">Saltar cardio</button></div>`;
    } else {
      const log = S.get(guide.id)?.log?.[guide.logKey] || { sets: {} };
      const setsDone = Object.values(log.sets).reduce((t, a) => t + a.filter(Boolean).length, 0);
      const totalSets = day.exercises.reduce((t, e) => t + e.sets, 0);
      body = `
        <div class="g-done">🏆</div>
        <h1>¡Sesión completada!</h1>
        <p class="g-sub">${esc(day.name)} · ${guide.routine ? 'Rutina' : 'Semana ' + guide.w}. Cada sesión cuenta.</p>
        <div class="stats3 dark">
          <div><strong>${setsDone}/${totalSets}</strong><span>series</span></div>
          <div><strong>${day.exercises.length}</strong><span>ejercicios</span></div>
          <div><strong>~${day.minutes}</strong><span>minutos</span></div>
        </div>
        <div class="g-actions"><button class="btn primary" id="gfinish">${guide.routine ? 'Volver a las rutinas' : 'Volver al plan'}</button></div>`;
    }

    $app.innerHTML = `
      <div class="screen guide ${st.type}">
        <header class="g-head">
          <button class="icon-btn" id="gclose" aria-label="Salir">✕</button>
          <div class="g-prog"><i style="width:${pct}%"></i></div>
          <button class="icon-btn" id="gprev" aria-label="Paso anterior" ${idx ? '' : 'disabled'}>↺</button>
        </header>
        <main class="g-body">${body}</main>
      </div>`;
    mountAnims();
    window.scrollTo(0, 0);

    $('#gclose').onclick = () => { stopGuideTimer(); go(guide.back || `#/session/${guide.id}/${guide.w}/${guide.d}`); };
    $('#gprev').onclick = () => guideGo(-1);
    const next = $('#gnext');
    if (next) next.onclick = () => guideGo(1);

    if (st.type === 'work') {
      const e = day.exercises[st.i];
      const markDone = () => {
        S.update(guide.id, (x) => { const l = x.log[guide.logKey] || (x.log[guide.logKey] = { sets: {} }); (l.sets[st.i] = l.sets[st.i] || [])[st.s] = true; });
        beep(1);
        guideGo(1);
      };
      $('#gdone').onclick = markDone;
      const start = $('#gstart');
      if (start) start.onclick = () => {
        start.disabled = true;
        const phases = holdPhases(e);
        let k = 0, left = phases[0].sec;
        const show = () => { $('#gtarget').innerHTML = `${left}<small> s · ${esc(phases[k].label)}</small>`; };
        show(); beep(0);
        guide.h = setInterval(() => {
          left--;
          if (left <= 0) {
            k++;
            if (k >= phases.length) { stopGuideTimer(); return markDone(); }
            beep(1); left = phases[k].sec;
          }
          show();
        }, 1000);
      };
    } else if (st.type === 'rest') {
      let left = st.sec, total = st.sec;
      const draw = () => { $('#gring').innerHTML = ringSVG(left / total, left); };
      $('#gadd').onclick = () => { left += 15; total += 15; draw(); };
      guide.h = setInterval(() => {
        left--;
        if (left <= 0) { beep(2); return guideGo(1); }
        draw();
      }, 1000);
    } else if (st.type === 'finisher') {
      $('#gstart').onclick = (ev) => {
        ev.target.disabled = true;
        const phases = finisherPhases(day.finisher);
        let k = 0, left = phases[0].sec;
        const show = () => {
          const ph = phases[k];
          $('#gring').innerHTML = ringSVG(left / ph.sec, left);
          $('#gflabel').textContent = ph.label;
          $('#gfname').textContent = ph.rest ? 'Descanso' : ph.name || 'Prepárate';
          const box = $('#gfanim .anim');
          if (box && box.dataset.anim !== ph.key) { $('#gfanim').innerHTML = animBox(ph.key, 'g-anim dark', { detail: 1, pattern: 'cardio' }); mountAnims(); }
        };
        beep(0); show();
        guide.h = setInterval(() => {
          left--;
          if (left <= 0) {
            k++;
            if (k >= phases.length) { beep(2); return guideGo(1); }
            beep(1); left = phases[k].sec;
          }
          show();
        }, 1000);
      };
    } else if (st.type === 'done') {
      S.update(guide.id, (x) => { const l = x.log[guide.logKey] || (x.log[guide.logKey] = { sets: {} }); l.done = true; l.date = Date.now(); l.t = Date.now(); l.min = day.minutes; if (guide.routine) l.routine = day.name; });
      $('#gfinish').onclick = () => { const id = guide.id, r = guide.routine, back = guide.back; guide = null; go(r || !id ? back || '#/rutinas' : '#/plan/' + id); };
      confetti();
    }
  }

  // ---------- Rutinas TRX ----------
  const DEFAULT_ANSWERS = {
    gender: 'male', age: 30, goal: 'fitness', experience: 'beginner', pushups: 1, pullups: 0, plank: 1, frequency: 1, flexibility: 'mid',
    zones: [], limitations: ['none'], equipment: ['trx'], days: 3, duration: 25, height: 170, weight: 70, targetWeight: 70, bodyType: 'average',
  };

  function gymCard() {
    return `
      <a class="trx-card gym-card" href="#/rutinas?t=gym">
        <span class="trx-ico">🏋️</span>
        <div><strong>Rutinas en tu máquina</strong><span>${P.GYM_ROUTINES.length} rutinas · jalón, mariposa, rodillos, poleas…</span></div>
        <span class="go">›</span>
      </a>`;
  }

  function trxCard() {
    return `
      <a class="trx-card" href="#/rutinas">
        <span class="trx-ico">🪢</span>
        <div><strong>Rutinas TRX</strong><span>${P.TRX_ROUTINES.length} rutinas listas · cuerpo completo, core, piernas…</span></div>
        <span class="go">›</span>
      </a>`;
  }

  function renderRoutines(type) {
    const gym = type === 'gym';
    const list = gym ? P.GYM_ROUTINES : P.TRX_ROUTINES;
    const profs = S.profiles();
    const cur = profs.length ? activeProfile(profs) : null;
    const a = cur ? cur.answers : DEFAULT_ANSWERS;
    const block = cur ? cur.plan.block : 1;
    $app.innerHTML = `
      <div class="screen routines">
        ${trainHead('rutinas', cur)}
        <main class="plan-body">
          <nav class="week-chips"><a class="chip ${gym ? '' : 'on'}" href="#/rutinas">🪢 TRX</a><a class="chip ${gym ? 'on' : ''}" href="#/rutinas?t=gym">🏋️ Máquina</a></nav>
          ${gym
            ? '<div class="note">🏋️ <strong>Antes de empezar:</strong> ajusta el pasador de la pila de pesas con un peso que te permita hacer todas las repeticiones con buena técnica y 1-2 de reserva. Revisa que el cable esté bien enganchado.</div>'
            : '<div class="note">🪢 <strong>Antes de empezar:</strong> ancla el TRX en un punto firme (marco de puerta con su accesorio, viga o barra). Cuanto más inclinado está tu cuerpo, más difícil: ajústalo acercando o alejando los pies.</div>'}
          ${list.map((r) => {
            const day = P.buildRoutine(r.id, a, block);
            const times = cur ? Object.entries(cur.log).filter(([k, l]) => k.startsWith('R-' + r.id + '-') && l.done).length : 0;
            return `
              <div class="card routine">
                <div class="r-top">
                  <span class="r-emoji">${r.emoji}</span>
                  <div class="r-main"><strong>${esc(r.name)}</strong><span>~${day.minutes} min · ${day.exercises.length} ejercicios${day.format === 'circuit' ? ' · circuito' : ''}${day.finisher ? ' · cardio' : ''}</span></div>
                  ${times ? `<span class="r-done">✓ ${times}</span>` : ''}
                </div>
                <p class="muted small">${esc(r.desc)}</p>
                <div class="day-strip">${day.exercises.slice(0, 5).map((e) => animBox(e.id, 'strip', { static: 1 })).join('')}</div>
                <a class="btn primary wide" href="#/ver/${r.id}">👀 Ver ejercicios y empezar</a>
              </div>`;
          }).join('')}
        </main>
      </div>`;
    bindHead();
    mountAnims();
  }
  window.addEventListener('anim3d-ready', () => { if (location.hash.startsWith('#/rutinas')) mountAnims(); });

  // Vista previa de una rutina: cada ejercicio con su ejemplo animado, antes de empezar
  function renderRoutinePreview(rid) {
    const profs = S.profiles();
    const cur = profs.length ? activeProfile(profs) : null;
    const day = P.buildRoutine(rid, cur ? cur.answers : DEFAULT_ANSWERS, cur ? cur.plan.block : 1);
    if (!day) return location.replace('#/rutinas');
    const back = rid.startsWith('gym') ? '#/rutinas?t=gym' : '#/rutinas';
    $app.innerHTML = `
      <div class="screen preview">
        <header class="plan-head compact">
          <button class="icon-btn light" id="pvback" aria-label="Volver">‹</button>
          <div><h1>${esc(day.name)}</h1><p>~${day.minutes} min · ${day.exercises.length} ejercicios · toca uno para verlo en grande</p></div>
        </header>
        <main class="plan-body">
          ${exerciseCards(day)}
          <div class="sticky-cta"><a class="btn primary" href="#/routine/${rid}">▶ Empezar entrenamiento</a></div>
        </main>
      </div>`;
    $('#pvback').onclick = () => go(back);
    bindExerciseCards(day);
    mountAnims();
  }

  // Lista de ejercicios con ejemplo grande (se usa en la vista previa)
  function exerciseCards(day) {
    return day.exercises.map((e, i) => `
      <button class="pv-card" data-open="${i}">
        ${animBox(e.id, 'pv-anim flip')}
        <div class="pv-info">
          <span class="pv-num">${i + 1}</span>
          <strong>${esc(e.name)}</strong>
          <span class="dose">${doseText(e)}</span>
          <span class="muted small">${esc((MUSCLES[e.pattern] || '').split(' · ').slice(0, 2).join(' · '))}</span>
          <span class="link-btn">Ver cómo se hace ›</span>
        </div>
      </button>`).join('');
  }
  function bindExerciseCards(day) {
    $$('.pv-card').forEach((b) => b.onclick = () => {
      const e = day.exercises[+b.dataset.open];
      openExercise({ key: e.id, name: e.name, cue: e.cue, pattern: e.pattern, perSide: e.perSide, dose: doseText(e) + ` · descanso ${e.rest} s` });
    });
  }

  function renderRoutineGuide(rid) {
    const profs = S.profiles();
    const cur = profs.length ? activeProfile(profs) : null;
    const day = P.buildRoutine(rid, cur ? cur.answers : DEFAULT_ANSWERS, cur ? cur.plan.block : 1);
    if (!day) return location.replace('#/rutinas');
    const gkey = 'R/' + rid + '/' + (cur?.id || '');
    if (!guide || guide.key !== gkey) {
      guide = { key: gkey, id: cur?.id || null, day, steps: buildGuide(day), idx: 0, logKey: `R-${rid}-${Date.now()}`, back: rid.startsWith('gym') ? '#/rutinas?t=gym' : '#/rutinas', routine: true };
    }
    keepAwake();
    renderGuideStep();
  }

  // ---------- Biblioteca de ejercicios ----------
  const LIB_GROUPS = [
    ['push', 'Flexiones'], ['vpush', 'Empuje vertical'], ['dip', 'Fondos'], ['vpull', 'Dominadas'], ['hpull', 'Remo'],
    ['squat', 'Piernas'], ['hinge', 'Glúteos e isquios'], ['core', 'Core'], ['skill', 'Habilidades'],
  ];
  function renderLibrary(filter) {
    const groups = ['trx', 'cardio', 'gym'].includes(filter) ? [] : LIB_GROUPS.filter(([k]) => !filter || filter === k);
    const card = (x, pattern, lvl) => `
      <button class="lib-card" data-key="${esc(x.id || x.name)}" data-pattern="${pattern}">
        ${animBox(x.id || x.name, 'flip')}
        <strong>${esc(x.name)}</strong>
        ${lvl !== undefined ? `<span class="lvl">Nivel ${lvl + 1}</span>` : ''}
      </button>`;
    $app.innerHTML = `
      <div class="screen library">
        ${trainHead('ejercicios', S.profiles().length ? activeProfile(S.profiles()) : null)}
        <div class="lib-search"><input id="libq" type="search" placeholder="🔍 Buscar ejercicio (ej: jalón, sentadilla, TRX…)" autocomplete="off"></div>
        <p class="muted center" id="libnone" hidden>No encontré ejercicios con ese nombre.</p>
        <nav class="week-chips lib-chips">
          <a class="chip ${!filter ? 'on' : ''}" href="#/ejercicios">Todos</a>
          ${LIB_GROUPS.map(([k, l]) => `<a class="chip ${filter === k ? 'on' : ''}" href="#/ejercicios?g=${k}">${l}</a>`).join('')}
          <a class="chip ${filter === 'trx' ? 'on' : ''}" href="#/ejercicios?g=trx">🪢 TRX</a>
          <a class="chip ${filter === 'gym' ? 'on' : ''}" href="#/ejercicios?g=gym">🏋️ Máquina y pesas</a>
          <a class="chip ${filter === 'cardio' ? 'on' : ''}" href="#/ejercicios?g=cardio">Cardio y movilidad</a>
        </nav>
        <main class="plan-body">
          ${groups.map(([k, l]) => `
            <h2 class="lib-h">${l}</h2>
            <p class="muted small">${MUSCLES[k]} · de más fácil a más difícil</p>
            <div class="lib-grid">
              ${window.EXERCISE_LADDERS[k].map((x, i) => card(x, k, i)).join('')}
              ${(window.EXERCISE_ALTERNATES[k] || []).map((x) => card(x, k)).join('')}
            </div>`).join('')}
          ${!filter || filter === 'trx' ? `
            <h2 class="lib-h">🪢 TRX</h2>
            <p class="muted small">Cintas de suspensión · más inclinación = más difícil</p>
            ${LIB_GROUPS.filter(([k]) => window.TRX_LADDERS[k]).map(([k, l]) => `
              <h3 class="lib-sub">${l}</h3>
              <div class="lib-grid">
                ${window.TRX_LADDERS[k].map((x, i) => card(x, k, i)).join('')}
                ${(window.TRX_ALTERNATES[k] || []).map((x) => card(x, k)).join('')}
              </div>`).join('')}` : ''}
          ${!filter || filter === 'gym' ? `
            <h2 class="lib-h">🏋️ Tu máquina multiestación</h2>
            <p class="muted small">${Object.values(window.GYM_LADDERS).flat().length} ejercicios · elige un peso con el que llegues justo a las repeticiones</p>
            ${window.GYM_STATIONS.map(([st, label]) => {
              const items = Object.entries(window.GYM_LADDERS).flatMap(([k, l]) => l.filter((x) => x.st === st).map((x) => card(x, k)));
              return items.length ? `<h3 class="lib-sub">${label}</h3><div class="lib-grid">${items.join('')}</div>` : '';
            }).join('')}
            <h2 class="lib-h">🏋️‍♀️ Mancuernas</h2>
            <div class="lib-grid">${Object.entries(window.DB_LADDERS).map(([k, l]) => l.map((x) => card(x, k)).join('')).join('')}</div>` : ''}
          ${!filter || filter === 'cardio' ? `
            <h2 class="lib-h">🚴 Máquinas de cardio</h2>
            <div class="lib-grid">${Object.values(window.CARDIO_MACHINES).map((x) => card(x, 'cardio')).join('')}</div>
            <h2 class="lib-h">Cardio</h2>
            <div class="lib-grid">${[...window.CONDITIONING.low, ...window.CONDITIONING.high].map((x) => card(x, 'cardio')).join('')}</div>
            <h2 class="lib-h">Calentamiento y estiramientos</h2>
            <div class="lib-grid">${[...window.WARMUP, ...window.COOLDOWN].map((x) => card(x, '')).join('')}</div>` : ''}
        </main>
      </div>`;
    bindHead();
    const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    $('#libq').oninput = (e) => {
      const q = norm(e.target.value.trim());
      $$('.lib-card').forEach((c) => { c.hidden = !!q && !norm(c.textContent).includes(q); });
      $$('.lib-grid').forEach((g) => { g.hidden = ![...g.children].some((c) => !c.hidden); });
      // En la búsqueda se esconden los títulos de las secciones: solo quedan los ejercicios encontrados
      $$('.library main > h2, .library main > h3, .library main > p').forEach((h) => { h.hidden = !!q; });
      $('#libnone').hidden = !q || $$('.lib-card').some((c) => !c.hidden);
    };
    const all = [
      ...Object.values(window.EXERCISE_LADDERS).flat(), ...Object.values(window.EXERCISE_ALTERNATES).flat(),
      ...Object.values(window.TRX_LADDERS).flat(), ...Object.values(window.TRX_ALTERNATES).flat(),
      ...window.CONDITIONING.low, ...window.CONDITIONING.high, ...window.WARMUP, ...window.COOLDOWN,
      ...Object.values(window.GYM_LADDERS).flat(), ...Object.values(window.DB_LADDERS).flat(), ...Object.values(window.CARDIO_MACHINES),
    ];
    $$('.lib-card').forEach((b) => b.onclick = () => {
      const x = all.find((y) => (y.id || y.name) === b.dataset.key);
      openExercise({ key: b.dataset.key, name: x.name, cue: x.cue || x.dose, pattern: b.dataset.pattern || null, perSide: x.perSide });
    });
    mountAnims();
  }

  // ---------- Temporizador ----------
  const T = { el: document.getElementById('timer'), phases: [], i: 0, left: 0, h: null, total: 0 };
  let audio = null;

  function beep(times = 1) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      for (let k = 0; k < times; k++) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        const t = audio.currentTime + k * 0.25;
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.2);
      }
    } catch (e) { /* sin audio */ }
    if (times && navigator.vibrate) navigator.vibrate(times > 1 ? [200, 100, 200] : 200);
  }

  function runTimer(phases) {
    clearInterval(T.h);
    T.phases = phases; T.i = 0; T.left = T.total = phases[0].sec;
    T.el.classList.remove('hidden');
    beep(0); // inicializa el audio dentro del gesto del usuario
    drawTimer();
    T.h = setInterval(tick, 1000);
  }
  function nextPhase() {
    T.i++;
    if (T.i >= T.phases.length) { beep(2); return stopTimer(); }
    beep(1);
    T.left = T.total = T.phases[T.i].sec;
    drawTimer();
  }
  function tick() {
    T.left--;
    if (T.left <= 0) return nextPhase();
    drawTimer();
  }
  function stopTimer() { clearInterval(T.h); T.el.classList.add('hidden'); }
  function drawTimer() {
    const ph = T.phases[T.i];
    const mm = Math.floor(T.left / 60), ss = String(T.left % 60).padStart(2, '0');
    T.el.innerHTML = `
      <div class="t-bar"><i style="width:${(1 - T.left / T.total) * 100}%"></i></div>
      <div class="t-row">
        <div class="t-info"><span class="t-label">${esc(ph.label)}</span><span class="t-time">${mm}:${ss}</span></div>
        <div class="t-actions">
          <button data-t="add">+15 s</button>
          <button data-t="skip">Saltar</button>
          <button data-t="close" aria-label="Cerrar">✕</button>
        </div>
      </div>`;
  }
  T.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'add') { T.left += 15; T.total += 15; drawTimer(); }
    else if (b.dataset.t === 'skip') nextPhase();
    else stopTimer();
  });

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.onrelease = () => { wakeLock = null; }; } } catch (e) { /* no soportado */ }
  }

  // ---------- PWA ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    const b = document.getElementById('install');
    if (b) b.hidden = false;
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // APK (Capacitor): el botón Atrás de Android navega dentro de la app y solo sale desde el inicio.
  const NativeApp = window.capacitorApp?.App;
  if (NativeApp && window.Capacitor?.isNativePlatform?.()) {
    NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (!modal.classList.contains('hidden')) return closeModal();
      if (T.el && !T.el.classList.contains('hidden')) return stopTimer();
      const atHome = !location.hash || location.hash === '#/' || location.hash === '#';
      if (atHome) NativeApp.exitApp();
      else if (canGoBack) history.back();
      else go('#/');
    });
  }

  route();
  paintNav();
})();
