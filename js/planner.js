// Motor del plan: con las respuestas del cuestionario calcula métricas, nutrición, proyección
// y un bloque de 4 semanas de entrenamiento con progresión.
(function () {
  const L = window.EXERCISE_LADDERS;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const DAY_MS = 86400000;

  // ---------- Métricas ----------
  function metrics(a) {
    const h = a.height / 100;
    const bmi = a.weight / (h * h);
    const bmiCat = bmi < 18.5 ? 'under' : bmi < 25 ? 'normal' : bmi < 30 ? 'over' : 'obese';
    const bmr = 10 * a.weight + 6.25 * a.height - 5 * a.age + (a.gender === 'male' ? 5 : -161);
    const dayFactor = { sitting: 1.2, mixed: 1.3, standing: 1.4, physical: 1.55 }[a.dayType] || 1.3;
    const tdee = bmr * (dayFactor + (a.days || 3) * 0.03);
    return {
      bmi: Math.round(bmi * 10) / 10,
      bmiCat,
      healthyMin: Math.round(18.5 * h * h),
      healthyMax: Math.round(24.9 * h * h),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    };
  }

  const BMI_LABELS = {
    under: { label: 'Bajo peso', tone: 'warn' },
    normal: { label: 'Normal', tone: 'ok' },
    over: { label: 'Sobrepeso', tone: 'warn' },
    obese: { label: 'Obesidad', tone: 'bad' },
  };

  // ---------- Nutrición ----------
  const DIET_FOODS = {
    traditional: ['Pollo, pavo o carne magra', 'Huevos', 'Pescado', 'Yogur griego o queso fresco', 'Legumbres'],
    mediterranean: ['Pescado azul', 'Legumbres', 'Huevos', 'Yogur natural', 'Frutos secos y aceite de oliva'],
    vegetarian: ['Huevos', 'Yogur griego / skyr', 'Queso fresco', 'Lentejas y garbanzos', 'Tofu o tempeh'],
    vegan: ['Tofu y tempeh', 'Lentejas, garbanzos y frijoles', 'Seitán', 'Proteína de guisante o soja', 'Edamame'],
    keto: ['Huevos', 'Carnes y pescados', 'Quesos', 'Aguacate', 'Frutos secos y semillas'],
  };
  const DIET_MEALS = {
    traditional: ['Desayuno: huevos revueltos, pan integral y fruta', 'Almuerzo: pollo a la plancha, arroz y ensalada', 'Merienda: yogur con avena', 'Cena: pescado con verduras salteadas'],
    mediterranean: ['Desayuno: tostada con tomate, aceite de oliva y huevo', 'Almuerzo: garbanzos con espinacas y atún', 'Merienda: yogur con nueces', 'Cena: salmón al horno con verduras'],
    vegetarian: ['Desayuno: tortilla de claras con queso y fruta', 'Almuerzo: bowl de lentejas, quinoa y verduras', 'Merienda: skyr con frutos rojos', 'Cena: tofu salteado con arroz integral'],
    vegan: ['Desayuno: avena con bebida de soja y mantequilla de maní', 'Almuerzo: tempeh con arroz y brócoli', 'Merienda: hummus con bastones de verdura', 'Cena: curry de garbanzos y espinacas'],
    keto: ['Desayuno: huevos con aguacate', 'Almuerzo: ensalada grande con pollo y aceite de oliva', 'Merienda: queso y nueces', 'Cena: pescado con verduras verdes y mantequilla'],
  };

  function nutrition(a, m) {
    const h = a.height / 100;
    const refWeight = m.bmi > 27 ? 25 * h * h : a.weight; // evita sobreestimar proteína con mucho sobrepeso
    const factor = { lose: 0.8, recomp: 0.9, muscle: 1.1 }[a.goal] || 1;
    const floor = a.gender === 'male' ? 1500 : 1200;
    const recomendada = Math.round(Math.max(m.tdee * factor, Math.min(floor, m.tdee)) / 10) * 10;
    // Meta propia (Perfil → Calorías diarias): reemplaza la recomendada; la proteína se mantiene y el resto se ajusta
    const kcal = a.kcalMeta > 0 ? Math.round(a.kcalMeta) : recomendada;
    const protein = Math.round(refWeight * ({ lose: 2, recomp: 2, muscle: 1.8 }[a.goal] || 1.6));
    let fat, carbs;
    if (a.diet === 'keto') {
      carbs = 40;
      fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
    } else {
      fat = Math.min(Math.round(refWeight * 0.8), Math.round((kcal * 0.35) / 9));
      carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
    }
    const water = Math.round(a.weight * 0.035 * 10) / 10;
    return {
      kcal, recomendada, personalizada: kcal !== recomendada, protein, fat, carbs, water,
      foods: DIET_FOODS[a.diet] || DIET_FOODS.traditional,
      meals: DIET_MEALS[a.diet] || DIET_MEALS.traditional,
    };
  }

  // ¿Es segura una meta de calorías? Compara con lo que se gasta al día (tdee) y en reposo (bmr).
  function evaluarMeta(a, m, kcal) {
    const floor = a.gender === 'male' ? 1500 : 1200;
    const deficit = m.tdee - kcal, pct = deficit / m.tdee;
    const kgSem = Math.round((deficit * 7 / 7700) * 100) / 100;
    const ritmo = kgSem > 0.02 ? `Bajarías unos ${String(kgSem).replace('.', ',')} kg por semana.` : kgSem < -0.02 ? `Subirías unos ${String(-kgSem).replace('.', ',')} kg por semana.` : 'Mantendrías tu peso.';
    const rec = nutrition({ ...a, kcalMeta: undefined }, m).recomendada;
    if (Math.abs(kcal - rec) <= rec * 0.03) return { nivel: 'ok', kgSem, titulo: '🟢 Recomendada', texto: `${ritmo} Es la meta calculada para tu objetivo.` };
    if (kcal < floor || kcal < m.bmr * 0.85 || pct > 0.35) {
      return { nivel: 'alto', kgSem, titulo: '🔴 Muy baja para ti', confirmar: true,
        texto: `${ritmo} Está ${kcal < floor ? `bajo el mínimo recomendado (${floor} kcal)` : `muy por debajo de lo que tu cuerpo gasta en reposo (${m.bmr} kcal)`}. Comer tan poco puede hacerte perder músculo, darte cansancio, mareos, mal humor y falta de vitaminas, y suele terminar en efecto rebote. Hazlo solo con control de un nutricionista o médico.` };
    }
    if (pct > 0.25 || kcal < m.bmr) {
      return { nivel: 'ojo', kgSem, titulo: '🟡 Exigente',
        texto: `${ritmo} Es un déficit fuerte${kcal < m.bmr ? ` (bajo lo que gastas en reposo, ${m.bmr} kcal)` : ''}. Come tu proteína completa, duerme bien, no te saltes los entrenamientos de fuerza y fíjate cómo te sientes. Si hay cansancio o mareos, vuelve a subirla.` };
    }
    if (deficit < 0 && (a.goal === 'lose' || a.goal === 'recomp')) {
      return { nivel: 'info', kgSem, titulo: 'ℹ️ Sobre tu gasto', texto: `${ritmo} Con esta meta no bajarías de peso, porque es más de lo que gastas al día (${m.tdee} kcal).` };
    }
    return { nivel: 'ok', kgSem, titulo: '🟢 Razonable', texto: `${ritmo} Es un ritmo sostenible para tu objetivo.` };
  }

  // ---------- Proyección ----------
  function projection(a) {
    const diff = a.targetWeight - a.weight;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Math.abs(diff) < 0.5) {
      return { direction: 'keep', weeks: 0, rate: 0, points: [{ w: 0, kg: a.weight }, { w: 8, kg: a.weight }], targetDate: today };
    }
    const losing = diff < 0;
    const rate = losing ? clamp(a.weight * 0.0075, 0.3, 1.0) : (a.gender === 'male' ? 0.25 : 0.18);
    const weeks = Math.ceil(Math.abs(diff) / rate);
    // La pérdida suele ser algo más rápida al principio: curva ligeramente cóncava.
    const shape = (t) => (losing ? 1 - Math.pow(1 - t, 1.25) : t);
    const n = Math.min(weeks, 12);
    const points = [];
    for (let i = 0; i <= n; i++) {
      const w = (weeks * i) / n;
      points.push({ w, kg: Math.round((a.weight + diff * shape(w / weeks)) * 10) / 10 });
    }
    const out = {
      direction: losing ? 'lose' : 'gain',
      weeks, rate: Math.round(rate * 100) / 100, points,
      targetDate: new Date(today.getTime() + weeks * 7 * DAY_MS),
    };
    if (a.eventDate) {
      const ev = new Date(a.eventDate + 'T00:00:00');
      const evWeeks = (ev - today) / (7 * DAY_MS);
      if (evWeeks > 0) {
        const t = clamp(evWeeks / weeks, 0, 1);
        out.event = { date: ev, weeks: Math.round(evWeeks), kg: Math.round((a.weight + diff * shape(t)) * 10) / 10, reached: t >= 1 };
      }
    }
    return out;
  }

  // ---------- Niveles ----------
  function generalLevel(a) {
    const exp = { none: 0, beginner: 1, some: 2, advanced: 3 }[a.experience] ?? 0;
    return Math.round((exp + (a.frequency ?? 0)) / 2);
  }

  function levels(a, block) {
    const g = generalLevel(a);
    const pu = a.pushups ?? 0;
    const pl = a.pullups ?? 0;
    let squat = [1, 1, 3, 4][g];
    if (a.bodyType === 'obese') squat -= 1;
    if (a.age >= 55) squat -= 1;
    const lv = {
      push: [g === 0 && a.bodyType === 'obese' ? 0 : 1, 2, 3, 4, 5][pu],
      vpush: [0, 0, 1, 2, 3][pu],
      dip: [0, 0, 1, 3, 3][pu],
      vpull: [Math.min(g, 2), 2, 4, 5, 7][pl],
      hpull: [g >= 1 ? 2 : 1, 2, 3, 3, 4][pl],
      squat: Math.max(0, squat),
      hinge: [0, 1, 2, 3][g],
      core: [0, 1, 3, 5][a.plank ?? 0],
      skill: g >= 2 ? 1 : 0,
    };
    for (const k in lv) lv[k] = clamp(lv[k] + (block - 1), 0, L[k].length - 1);
    return lv;
  }

  const LEVEL_NAMES = ['Principiante', 'Básico', 'Intermedio', 'Avanzado'];

  // ---------- Selección de ejercicios ----------
  function allowed(ex, a) {
    const lim = (a.limitations || []).filter((x) => x !== 'none');
    const eq = a.equipment || [];
    if ((ex.avoid || []).some((x) => lim.includes(x))) return false;
    if (ex.needs && !ex.needs.some((n) => eq.includes(n))) return false;
    return true;
  }

  // Busca desde el nivel pedido hacia abajo un ejercicio permitido y no repetido en el día.
  function pick(pattern, level, a, used, lv) {
    const ladder = L[pattern];
    level = clamp(level, 0, ladder.length - 1);
    let anyAllowed = false;
    for (let i = level; i >= 0; i--) {
      const ex = ladder[i];
      if (!allowed(ex, a)) continue;
      anyAllowed = true;
      if (!used.has(ex.id)) return { ex, pattern };
    }
    if (!anyAllowed) {
      for (let i = level + 1; i < ladder.length; i++) if (allowed(ladder[i], a)) anyAllowed = true;
    }
    const fb = window.PATTERN_FALLBACK[pattern];
    if (!anyAllowed && fb) return pick(fb, lv[fb], a, used, lv);
    const alt = (window.EXERCISE_ALTERNATES[pattern] || []).find((ex) => allowed(ex, a) && !used.has(ex.id));
    return alt ? { ex: alt, pattern } : null;
  }

  // TRX: escaleras propias; el nivel se traslada proporcionalmente desde la escalera de calistenia.
  const TL = window.TRX_LADDERS || {};
  // Elige un ejercicio de otra herramienta (TRX, máquina o mancuernas) trasladando el nivel de la calistenia
  const TOOL_LADDERS = { trx: [TL, window.TRX_ALTERNATES || {}], gym: [window.GYM_LADDERS || {}, {}], db: [window.DB_LADDERS || {}, {}] };
  function pickTool(tool, pattern, lv, a, used, n, seed = 0) {
    if (tool === 'trx') return pickTrx(pattern, lv, a, used, n);
    const [lad, alts] = TOOL_LADDERS[tool];
    const p = lad[pattern] ? pattern : null;
    if (!p) return null;
    const lim = (a.limitations || []).filter((x) => x !== 'none');
    const ok = (ex) => !used.has(ex.id) && !(ex.avoid || []).some((x) => lim.includes(x));
    const cands = [...lad[p], ...(alts[p] || [])].filter(ok);
    return cands.length ? { ex: cands[(seed + n - 1) % cands.length], pattern: p } : null;
  }

  function pickTrx(pattern, lv, a, used, n) {
    const p = TL[pattern] ? pattern : pattern === 'skill' ? 'core' : null;
    if (!p) return null;
    const ladder = TL[p], cal = L[p];
    const lvl = clamp((lv[p] ?? 0) - (n - 1), 0, cal.length - 1);
    const idx = Math.round((lvl / (cal.length - 1)) * (ladder.length - 1));
    const lim = (a.limitations || []).filter((x) => x !== 'none');
    const ok = (ex) => !used.has(ex.id) && !(ex.avoid || []).some((x) => lim.includes(x));
    const alt = ((window.TRX_ALTERNATES || {})[p] || []).find(ok);
    if (alt && n > 1) return { ex: alt, pattern: p }; // si el patrón se repite, primero una variante distinta
    for (let i = idx; i >= 0; i--) if (ok(ladder[i])) return { ex: ladder[i], pattern: p };
    if (alt) return { ex: alt, pattern: p };
    for (let i = idx + 1; i < ladder.length; i++) if (ok(ladder[i])) return { ex: ladder[i], pattern: p };
    return null;
  }

  const SCHEMES = {
    muscle: { sets: 3, lo: 8, rest: 90 },
    lose: { sets: 3, lo: 12, rest: 30, circuit: true },
    recomp: { sets: 3, lo: 10, rest: 60 },
    fitness: { sets: 3, lo: 10, rest: 60 },
    skills: { sets: 4, lo: 5, rest: 120 },
  };

  function dose(ex, pattern, a, week, g) {
    const s = SCHEMES[a.goal] || SCHEMES.fitness;
    let sets = s.sets;
    if (a.duration <= 15) sets -= 1;
    if (a.duration >= 55 && (a.goal === 'muscle' || a.goal === 'skills')) sets += 1;
    if (week >= 3) sets += 1;
    sets = clamp(sets, 2, 5);
    const prog = [0, 1, 1, 2][week - 1];
    if (ex.kind === 'time') {
      return { sets, sec: (ex.baseSec || 20) + prog * 5 + (g >= 2 ? 5 : 0), rest: s.rest };
    }
    let reps = s.lo + prog * 2 - (g === 0 ? 2 : 0);
    // Las piernas a dos apoyos con peso corporal necesitan más repeticiones para ser un estímulo real.
    if ((pattern === 'squat' || pattern === 'hinge') && !ex.perSide) reps += 4;
    if (ex.maxReps && reps > ex.maxReps) reps = Math.min(ex.maxReps, Math.ceil(ex.maxReps * 0.6) + week - 1);
    return { sets, reps: Math.max(3, reps), rest: s.rest };
  }

  const TEMPLATES = {
    fullA: { name: 'Cuerpo completo A', slots: ['squat', 'push', 'vpull', 'hinge', 'core', 'dip', 'hpull'] },
    fullB: { name: 'Cuerpo completo B', slots: ['vpull', 'vpush', 'squat', 'hpull', 'core', 'hinge', 'push'] },
    fullC: { name: 'Cuerpo completo C', slots: ['hinge', 'dip', 'hpull', 'squat', 'core', 'push', 'vpull'] },
    upperA: { name: 'Tren superior A', slots: ['push', 'vpull', 'dip', 'hpull', 'core', 'vpush', 'push'] },
    lowerA: { name: 'Tren inferior A', slots: ['squat', 'hinge', 'core', 'squat', 'hinge', 'core', 'squat'] },
    upperB: { name: 'Tren superior B', slots: ['vpull', 'vpush', 'hpull', 'push', 'core', 'dip', 'vpull'] },
    lowerB: { name: 'Tren inferior B', slots: ['hinge', 'squat', 'core', 'hinge', 'squat', 'core', 'hinge'] },
    push: { name: 'Empuje', slots: ['push', 'vpush', 'dip', 'push', 'core', 'vpush', 'dip'] },
    pull: { name: 'Tirón', slots: ['vpull', 'hpull', 'vpull', 'core', 'hinge', 'hpull', 'core'] },
    legs: { name: 'Piernas y core', slots: ['squat', 'hinge', 'squat', 'core', 'hinge', 'core', 'squat'] },
    trxFull: { name: 'TRX cuerpo completo', slots: ['hpull', 'push', 'squat', 'hinge', 'core', 'dip', 'vpush'] },
  };
  const EXTRA_DAY = { 2: 'Sábado', 3: 'Sábado', 4: 'Sábado', 5: 'Domingo' };

  // Rutinas de TRX listas para hacer (se ajustan al nivel de la persona)
  // Rutinas en la multiestación (tipo Bodytone)
  const GYM_ROUTINES = [
    { id: 'gym_full', tool: 'gym', name: 'Máquina cuerpo completo', emoji: '🏋️', minutes: 30, desc: 'Jalón, press, mariposa, piernas con los rodillos y abdomen en polea.',
      slots: ['vpull', 'push', 'squat', 'hinge', 'push', 'core'] },
    { id: 'gym_upper', tool: 'gym', name: 'Máquina pecho, espalda y brazos', emoji: '💪', minutes: 30, desc: 'Jalón, press de pecho, mariposa, remo, tríceps y bíceps en polea.',
      slots: ['vpull', 'push', 'hpull', 'push', 'dip', 'dip'] },
    { id: 'gym_legs', tool: 'gym', name: 'Máquina piernas y glúteos', emoji: '🦵', minutes: 20, desc: 'Extensión de cuádriceps, curl femoral de pie, patada de glúteo y sentadilla.',
      slots: ['squat', 'hinge', 'hinge', 'hinge', 'squat', 'core'] },
    { id: 'gym_back_arms', tool: 'gym', name: 'Máquina espalda y bíceps', emoji: '🧗', minutes: 30, desc: 'Jalones, pullover, remos y curls en polea.',
      slots: ['vpull', 'vpull', 'hpull', 'hpull', 'dip', 'dip'] },
    { id: 'gym_shoulders', tool: 'gym', name: 'Máquina hombros y postura', emoji: '🎯', minutes: 25, desc: 'Face pull, pájaro invertido, elevaciones y remo al mentón.',
      slots: ['hpull', 'vpush', 'hpull', 'vpush', 'core'] },
    { id: 'gym_core', tool: 'gym', name: 'Máquina abdomen', emoji: '🔥', minutes: 15, format: 'circuit', desc: 'Abdominal en polea, leñadores y abdominal con los rodillos.',
      slots: ['core', 'core', 'core', 'core'] },
    { id: 'gym_cal_mix', tool: 'mixgym', name: 'Máquina + calistenia', emoji: '🔀', minutes: 35, desc: 'Alterna ejercicios de la máquina con flexiones, sentadillas y core de peso corporal.',
      slots: ['vpull', 'push', 'squat', 'hpull', 'hinge', 'core'] },
  ];

  const TRX_ROUTINES = [
    { id: 'trx_full', name: 'TRX cuerpo completo', emoji: '🔥', minutes: 25, desc: 'Remo, press, piernas, glúteos y core en una sola sesión.',
      slots: ['hpull', 'push', 'squat', 'hinge', 'core', 'dip'] },
    { id: 'trx_upper', name: 'TRX tren superior', emoji: '💪', minutes: 20, desc: 'Pecho, espalda, hombros y brazos.',
      slots: ['push', 'hpull', 'dip', 'vpush', 'hpull', 'push'] },
    { id: 'trx_legs', name: 'TRX piernas y glúteos', emoji: '🍑', minutes: 20, desc: 'Sentadillas, zancadas y curl femoral.',
      slots: ['squat', 'hinge', 'squat', 'hinge', 'core'] },
    { id: 'trx_core', name: 'TRX core exprés', emoji: '⚡', minutes: 12, format: 'circuit', desc: 'Circuito corto de abdomen con los pies en las cintas.',
      slots: ['core', 'core', 'core', 'core'] },
    { id: 'trx_burn', name: 'TRX quema grasa', emoji: '🏃', minutes: 25, format: 'circuit', finisher: true, desc: 'Circuito de cuerpo completo con cardio al final.',
      slots: ['squat', 'push', 'hpull', 'hinge', 'core'] },
  ];
  const SPLITS = {
    2: ['fullA', 'fullB'],
    3: ['fullA', 'fullB', 'fullC'],
    4: ['upperA', 'lowerA', 'upperB', 'lowerB'],
    5: ['push', 'pull', 'legs', 'upperB', 'lowerB'],
  };
  const WEEKDAYS = {
    2: ['Lunes', 'Jueves'],
    3: ['Lunes', 'Miércoles', 'Viernes'],
    4: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
    5: ['Lunes', 'Martes', 'Miércoles', 'Viernes', 'Sábado'],
  };
  const ZONE_PATTERN = { chest: 'push', back: 'hpull', arms: 'dip', core: 'core', legs: 'squat', glutes: 'hinge' };
  const WEEK_TITLES = ['Base: aprende la técnica', 'Más repeticiones', 'Más volumen', 'Pico y evaluación'];

  function cardioMachines(a) {
    const eq = a.equipment || [];
    return Object.entries(window.CARDIO_MACHINES || {}).filter(([k]) => eq.includes(k)).map(([key, m]) => ({ key, ...m }));
  }

  function buildDay(tplKey, dayIdx, week, a, lv, g, opt = {}) {
    const tpl = TEMPLATES[tplKey] || tplKey;
    const mode = opt.mode || 'cal';
    const nSlots = tpl.n || { 15: 3, 25: 4, 40: 5, 55: 6 }[a.duration] || 4;
    const slots = tpl.slots.slice(0, nSlots).map((p) => ({ p }));
    const zones = tpl.routine ? [] : (a.zones || []).filter((z) => z !== 'full').map((z) => ZONE_PATTERN[z]);
    const zonesHere = zones.filter((p) => tpl.slots.includes(p));
    if (zonesHere.length) {
      const zp = zonesHere[dayIdx % zonesHere.length];
      if (nSlots < 7) slots.push({ p: zp, emphasis: true });
      else slots[slots.length - 1] = { p: zp, emphasis: true };
    }
    if (a.goal === 'skills' && mode !== 'trx') slots.unshift({ p: 'skill', skill: true });

    const used = new Set();
    const seen = {};
    const exercises = [];
    // En modo mixto se alterna: un ejercicio de calistenia, uno de TRX (desfasado según el día).
    // Herramientas que se alternan con la calistenia en cada sesión
    const eq = a.equipment || [];
    const tools = mode === 'trx' ? ['trx'] : mode === 'gym' ? ['gym'] : mode === 'mixgym' ? ['gym', 'cal'] : ['cal', ...(mode === 'mix' ? ['trx'] : []), ...(eq.includes('gym') && !tpl.routine ? ['gym'] : []), ...(eq.includes('dumbbells') && !tpl.routine ? ['db'] : [])];
    slots.forEach((s, k) => { s.tool = s.skill ? 'cal' : tools[(k + dayIdx) % tools.length]; });
    for (const s of slots) {
      const n = seen[s.p] = (seen[s.p] || 0) + 1;
      const res = (s.tool !== 'cal' && pickTool(s.tool, s.p, lv, a, used, n, dayIdx + week - 1)) || pick(s.p, lv[s.p] - (n - 1), a, used, lv);
      if (!res) continue;
      used.add(res.ex.id);
      const d = dose(res.ex, res.pattern, a, week, g);
      if (n > 1 && res.ex.kind === 'reps' && !res.ex.maxReps) d.reps += 2; // variante más fácil → más volumen
      exercises.push({
        id: res.ex.id, name: res.ex.name, cue: res.ex.cue, kind: res.ex.kind, perSide: !!res.ex.perSide,
        pattern: res.pattern, emphasis: !!s.emphasis, skill: !!s.skill, trx: (res.ex.needs || []).includes('trx'),
        gym: (res.ex.needs || []).includes('gym'), db: (res.ex.needs || []).includes('dumbbells'), ...d,
      });
    }

    let finisher = null;
    const rounds = tpl.routine ? (tpl.finisher ? 4 : 0) : ({ lose: a.duration >= 40 ? 6 : 4, recomp: 3, fitness: dayIdx % 2 === 0 ? 3 : 0 }[a.goal] || 0);
    const machines = cardioMachines(a);
    if (rounds) {
      const low = (a.limitations || []).includes('knees') || a.bodyType === 'obese' || a.age >= 55 || g === 0;
      const pool = window.CONDITIONING[low ? 'low' : 'high'];
      finisher = {
        rounds, work: 30, rest: 30,
        exercises: [pool[dayIdx % pool.length], pool[(dayIdx + 1) % pool.length]],
      };
      if (machines.length) {
        const m = machines[dayIdx % machines.length];
        const seated = m.key !== 'jumprope';
        finisher = { rounds: rounds + 1, work: 30, rest: 30, machine: seated, exercises: [{ name: m.name, cue: m.cue + (seated ? ' 30 s fuerte y 30 s suave, sin parar.' : '') }] };
      }
    }
    const warmup = machines.length
      ? [{ name: machines[dayIdx % machines.length].name + ' (suave)', dose: '5 min' }, ...window.WARMUP.filter((x) => x.name !== 'Marcha en el sitio')]
      : window.WARMUP;

    const nCool = a.flexibility === 'low' ? 5 : a.flexibility === 'mid' ? 4 : 3;
    const cooldown = [];
    for (let i = 0; i < nCool; i++) cooldown.push(window.COOLDOWN[(dayIdx + i) % window.COOLDOWN.length]);

    const estimate = () => {
      const workSec = exercises.reduce((t, e) => t + e.sets * ((e.kind === 'time' ? e.sec : e.reps * 3) * (e.perSide ? 2 : 1) + e.rest), 0);
      return Math.round(4 + workSec / 60 + (finisher ? finisher.rounds : 0) + nCool * 0.6);
    };
    // Ajusta la sesión al tiempo elegido: primero quita series, luego ejercicios.
    let minutes = estimate();
    while (minutes > a.duration + 5) {
      const maxSets = Math.max(...exercises.map((e) => e.sets));
      if (maxSets > 2) {
        for (let i = exercises.length - 1; i >= 0; i--) if (exercises[i].sets === maxSets) { exercises[i].sets--; break; }
      } else if (exercises.length > 3) {
        exercises.pop();
      } else break;
      minutes = estimate();
    }

    const hasTrx = exercises.some((e) => e.trx);
    const extras = [hasTrx && 'TRX', exercises.some((e) => e.gym) && 'máquina', exercises.some((e) => e.db) && 'mancuernas'].filter(Boolean);
    return {
      name: tpl.routine || /^TRX/.test(tpl.name) || mode === 'gym' || mode === 'mixgym' ? tpl.name : mode === 'trx' ? 'TRX · ' + tpl.name : extras.length ? tpl.name + ' + ' + extras.join(' + ') : tpl.name,
      weekday: opt.weekday || WEEKDAYS[a.days][dayIdx],
      format: tpl.format || (SCHEMES[a.goal]?.circuit ? 'circuit' : 'sets'),
      trx: hasTrx,
      warmup,
      exercises, finisher, cooldown, minutes,
    };
  }

  function generatePlan(a, block = 1) {
    const g = generalLevel(a);
    const lv = levels(a, block);
    const split = SPLITS[a.days] || SPLITS[3];
    const trxOn = (a.equipment || []).includes('trx');
    const mode = !trxOn ? 'cal' : a.trxMode === 'only' ? 'trx' : a.trxMode === 'extra' ? 'cal' : 'mix';
    const weeks = [1, 2, 3, 4].map((w) => ({
      week: w,
      title: WEEK_TITLES[w - 1],
      days: split.map((t, i) => buildDay(t, i, w, a, lv, g, { mode }))
        .concat(trxOn && a.trxMode === 'extra' ? [buildDay('trxFull', split.length, w, a, lv, g, { mode: 'trx', weekday: EXTRA_DAY[a.days] })] : []),
    }));
    return { block, generatedAt: Date.now(), level: g, levelName: LEVEL_NAMES[clamp(g + block - 1, 0, 3)], weeks };
  }

  // Rutina de TRX ajustada al nivel de la persona (semana 2 del bloque como referencia)
  function buildRoutine(id, a, block = 1) {
    const r = [...TRX_ROUTINES, ...GYM_ROUTINES].find((x) => x.id === id);
    if (!r) return null;
    const g = generalLevel(a);
    const lv = levels(a, block);
    const a2 = { ...a, duration: r.minutes };
    const tpl = { name: r.name, slots: r.slots, n: r.slots.length, routine: true, format: r.format, finisher: r.finisher };
    const day = buildDay(tpl, 0, 2, a2, lv, g, { mode: r.tool || 'trx', weekday: r.minutes + ' min' });
    if (r.format === 'circuit') day.exercises.forEach((e) => { e.rest = Math.min(e.rest, 30); });
    return { ...day, routineId: r.id, emoji: r.emoji, desc: r.desc };
  }

  // ---------- Consejos ----------
  function tips(a) {
    const t = [];
    const lim = a.limitations || [];
    if (lim.includes('wrists')) t.push('Molestias en las muñecas: haz las flexiones sobre los puños o con agarres, y calienta bien las muñecas.');
    if (lim.includes('knees')) t.push('Rodillas: evitamos los saltos y las zancadas profundas. Trabaja en un rango sin dolor.');
    if (lim.includes('back')) t.push('Zona lumbar: prioriza el control del core (dead bug, planchas) y evita arquear la espalda.');
    if (lim.includes('shoulders')) t.push('Hombros: quitamos los fondos y los empujes por encima de la cabeza. Si algo duele, para.');
    if (a.sleep < 7) t.push('Intenta dormir 7-8 horas. Es cuando el músculo se recupera.');
    if (a.water < 2) t.push('Ten una botella de agua a la vista y bebe un vaso con cada comida.');
    const h = a.habits || [];
    if (h.includes('emotional')) t.push('Si comes por ansiedad, prueba primero 10 minutos de caminata o un vaso de agua, y espera.');
    if (h.includes('late')) t.push('Cena con más proteína y verduras: te sacia y reduce el picoteo nocturno.');
    if (h.includes('sweets')) t.push('No los prohíbas: planifica un dulce pequeño 2-3 veces por semana.');
    if (h.includes('skip')) t.push('Saltarte comidas suele llevar a comer de más después. Ten snacks de proteína a mano.');
    if (h.includes('alcohol')) t.push('El alcohol frena la recuperación y suma calorías. Reducirlo acelera tus resultados.');
    const cm = cardioMachines(a);
    if (cm.length) t.push(`Días libres: 20-30 min de ${cm.map((m) => m.name.toLowerCase()).join(' o ')} a ritmo suave (que puedas conversar). Suma salud sin quitarte recuperación.`);
    if ((a.equipment || []).some((x) => x === 'gym' || x === 'dumbbells')) t.push('Con máquina o mancuernas elige un peso con el que llegues a las repeticiones con 1-2 de reserva. Cuando te sobren, sube un poco el peso.');
    if ((a.equipment || []).includes('trx')) t.push('TRX: cuanto más inclinado está tu cuerpo, más difícil. Acerca o aleja los pies del anclaje para llegar justo a las repeticiones.');
    t.push('Progresión: cuando completes todas las series y repeticiones con buena técnica, genera el siguiente bloque.');
    return t;
  }

  window.Planner = {
    evaluarMeta, GYM_ROUTINES, cardioMachines, metrics, nutrition, projection, generatePlan, buildRoutine, TRX_ROUTINES, tips, BMI_LABELS, generalLevel };
})();
