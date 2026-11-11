// Animaciones de ejercicios: figura articulada en SVG (vista lateral, mirando a la derecha).
// Cada ejercicio se define con posturas clave; el motor interpola la cadera, el ángulo del torso y la
// posición de manos/pies, y resuelve codos y rodillas con cinemática inversa para que los segmentos
// mantengan su longitud y los apoyos queden fijos.
//
// Postura: { hip:[x,y], t: ángulo del torso (0 = vertical, + = inclinado hacia adelante), n: inclinación del cuello,
//            hn/hf: mano cercana/lejana, fn/ff: pie cercano/lejano }  (hf y ff copian a hn/fn si se omiten)
(function () {
  const SEG = { T: 46, UA: 27, FA: 27, TH: 38, SH: 38, NECK: 15, HEAD: 10 };
  const G = 150; // suelo
  const D = Math.PI / 180;
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- Geometría ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const dir = (deg) => [Math.sin(deg * D), -Math.cos(deg * D)];

  // Dos segmentos de A a C; el punto medio se dobla hacia `hint`.
  function solve2(A, C, l1, l2, hint) {
    let v = sub(C, A);
    let d = len(v) || 0.001;
    const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.5;
    if (d > max) { v = mul(v, max / d); d = max; C = add(A, v); }
    if (d < min) d = min;
    const u = mul(v, 1 / d);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const P = add(A, mul(u, a));
    const perp = [-u[1], u[0]];
    const s = perp[0] * hint[0] + perp[1] * hint[1] >= 0 ? 1 : -1;
    return { mid: add(P, mul(perp, h * s)), end: C };
  }

  function skeleton(p, hints) {
    const hip = p.hip;
    const S = add(hip, mul(dir(p.t), SEG.T));
    const head = add(hip, mul(dir(p.t + (p.n || 0)), SEG.T + SEG.NECK));
    const arm = (hand, hint) => { const r = solve2(S, hand, SEG.UA, SEG.FA, hint); return [S, r.mid, r.end]; };
    const leg = (foot, hint) => { const r = solve2(hip, foot, SEG.TH, SEG.SH, hint); return [hip, r.mid, r.end]; };
    return {
      hip, S, head,
      an: arm(p.hn, hints.en), af: arm(p.hf || p.hn, hints.ef),
      ln: leg(p.fn, hints.kn), lf: leg(p.ff || p.fn, hints.kf),
    };
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function mix(A, B, k) {
    return {
      hip: lerpP(A.hip, B.hip, k), t: lerp(A.t, B.t, k), n: lerp(A.n || 0, B.n || 0, k),
      hn: lerpP(A.hn, B.hn, k), hf: lerpP(A.hf || A.hn, B.hf || B.hn, k),
      fn: lerpP(A.fn, B.fn, k), ff: lerpP(A.ff || A.fn, B.ff || B.fn, k),
    };
  }
  const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

  // ---------- Posturas base ----------
  const STAND = { hip: [120, 72], t: 2, hn: [124, 80], fn: [121, 148] };
  const STAND_ARMS_FWD = { ...STAND, hn: [172, 30] };
  const PLANK_UP = { hip: [109, 114], t: 65, hn: [150, 148], fn: [40, 146] };
  const PLANK_DOWN = { hip: [115, 137], t: 83, hn: [150, 148], fn: [40, 146] };
  const HANG = { hip: [119, 80], t: -3, hn: [120, -20], fn: [88, 128] };
  const PULL_TOP = { hip: [114, 30], t: -8, n: 4, hn: [120, -20], fn: [82, 78] };
  const QUAD = { hip: [90, 110], t: 70, hn: [133, 148], fn: [55, 148] };
  const SUPINE = { hip: [110, 138], t: -93, hn: [104, 148], fn: [148, 148] };
  const DIP_UP = { hip: [116, 62], t: 8, hn: [120, 70], fn: [86, 120] };
  const DIP_DOWN = { hip: [109, 86], t: 25, hn: [120, 70], fn: [82, 142] };

  const H_PUSH = { e: [-1, -0.6] };
  const H_PULL = { e: [0.3, 1], k: [1, 0.2] };
  const H_SUPINE = { k: [0.3, -1], e: [0, -1] };


  // Multiestación de una torre (como la Bodytone): torre detrás del asiento, viga alta con la polea,
  // brazos de la mariposa a la altura del pecho y torre frontal para los ejercicios de pie.
  const btSeg = (list) => list.map((q) => ({ ...q, bt: 1 }));
  const BT_TOWER = [...btSeg([
    { w: 'seg', a: [56, 150], b: [56, -70], r: 3.5 }, { w: 'seg', a: [44, 150], b: [44, -40], r: 2.5 },
    { w: 'seg', a: [56, -66], b: [120, -66], r: 3 }, { w: 'seg', a: [96, -66], b: [140, -66], r: 2 },
  ]), { w: 'btmachine', side: 'seat' }];
  const BT_SEAT = btSeg([
    { w: 'seg', a: [70, 102], b: [126, 102], r: 5 }, { w: 'seg', a: [96, 104], b: [96, 150], r: 3 },
    { w: 'seg', a: [70, 98], b: [64, 28], r: 6 }, { w: 'seg', a: [120, 150], b: [146, 150], r: 2.5 },
  ]);
  const BT_ARMS = btSeg([{ w: 'seg', a: [62, 18], b: [104, 18], r: 2.5 }, { w: 'seg', a: [104, 18], b: [108, 66], r: 2.5 }]);
  const BT_FRONT = [...btSeg([
    { w: 'seg', a: [168, 150], b: [168, -70], r: 3.5 }, { w: 'seg', a: [180, 150], b: [180, -40], r: 2.5 },
    { w: 'seg', a: [168, -66], b: [150, -66], r: 3 }, { w: 'seg', a: [140, 150], b: [196, 150], r: 2.5 },
  ]), { w: 'btmachine', side: 'front' }];
  // Máquina detrás de la persona (de espaldas a la torre)
  const BT_BEHIND = [...btSeg([{ w: 'seg', a: [56, 150], b: [56, -70], r: 3.5 }, { w: 'seg', a: [56, -66], b: [78, -66], r: 3 }]), { w: 'btmachine', side: 'behind' }];
  // ---------- Biblioteca ----------
  const LIB = {
    // Empuje
    wall_pushup: { props: [{ w: 'wall', x: 168 }], hint: { e: [0, 1] },
      poses: [{ hip: [96, 79], t: 20, hn: [166, 44], fn: [70, 148] }, { hip: [114, 88], t: 35, hn: [166, 44], fn: [70, 148] }] },
    incline_pushup: { props: [{ w: 'box', x: 140, y: 110, wd: 40 }], hint: H_PUSH,
      poses: [{ hip: [116, 92], t: 46, hn: [150, 110], fn: [62, 146] }, { hip: [124, 108], t: 64, hn: [150, 110], fn: [62, 146] }] },
    knee_pushup: { hint: { e: [-1, -0.6], k: [0, 1] },
      poses: [{ hip: [104, 112], t: 58, hn: [150, 148], fn: [48, 118] }, { hip: [108, 134], t: 80, hn: [150, 148], fn: [46, 122] }] },
    pushup: { hint: H_PUSH, poses: [PLANK_UP, PLANK_DOWN] },
    pushup_pause: { hint: H_PUSH, poses: [PLANK_UP, PLANK_DOWN], holds: [0.4, 1.6] },
    diamond_pushup: { hint: { e: [-1, -1] }, poses: [{ ...PLANK_UP, hn: [146, 148] }, { ...PLANK_DOWN, hn: [146, 148] }] },
    decline_pushup: { props: [{ w: 'box', x: 4, y: 112, wd: 44 }], hint: H_PUSH,
      poses: [{ hip: [104, 100], t: 82, hn: [150, 148], fn: [30, 110] }, { hip: [104, 120], t: 99, hn: [150, 148], fn: [30, 110] }] },
    archer_pushup: { hint: H_PUSH, poses: [{ ...PLANK_UP, hf: [176, 148] }, { ...PLANK_DOWN, hf: [180, 148] }] },
    pseudo_planche_pushup: { hint: { e: [-1, -1] },
      poses: [{ hip: [109, 114], t: 65, hn: [128, 148], fn: [40, 146] }, { hip: [115, 133], t: 80, hn: [128, 148], fn: [40, 146] }] },
    shoulder_taps: { hint: { e: [0.4, 1] }, poses: [PLANK_UP, { ...PLANK_UP, hn: [156, 96] }], tempo: [0.5, 0.5], holds: [0.3, 0.3] },
    pike_pushup: { hint: { e: [-1, -0.5] },
      poses: [{ hip: [95, 80], t: 133, hn: [168, 148], fn: [60, 148] }, { hip: [104, 87], t: 150, hn: [168, 148], fn: [60, 148] }] },
    elevated_pike: { props: [{ w: 'box', x: 30, y: 110, wd: 40 }], hint: { e: [-1, -0.5] },
      poses: [{ hip: [100, 52], t: 164, hn: [128, 148], fn: [55, 110] }, { hip: [106, 74], t: 175, hn: [128, 148], fn: [55, 110] }] },
    wall_handstand: { props: [{ w: 'wall', x: 150 }], hold: true,
      poses: [{ hip: [138, 48], t: 180, hn: [138, 148], fn: [146, -26] }, { hip: [139, 47], t: 179, hn: [138, 148], fn: [146, -27] }] },
    wall_hspu_neg: { props: [{ w: 'wall', x: 150 }], hint: { e: [-1, 0] }, tempo: [3, 0.8], holds: [0.4, 0.4],
      poses: [{ hip: [138, 48], t: 180, hn: [134, 148], fn: [146, -26] }, { hip: [140, 76], t: 182, hn: [134, 148], fn: [146, 2] }] },

    // Fondos
    bench_dip_bent: { props: [{ w: 'box', x: 40, y: 106, wd: 50 }], hint: { e: [-1, -0.4], k: [0.3, -1] },
      poses: [{ hip: [96, 96], t: -5, hn: [88, 104], fn: [138, 148] }, { hip: [98, 124], t: -6, hn: [88, 104], fn: [138, 148] }] },
    bench_dip: { props: [{ w: 'box', x: 40, y: 106, wd: 50 }], hint: { e: [-1, -0.4], k: [0.3, -1] },
      poses: [{ hip: [99, 94], t: -4, hn: [88, 104], fn: [166, 146] }, { hip: [100, 122], t: -6, hn: [88, 104], fn: [166, 146] }] },
    dip_negative: { props: [{ w: 'pbar', x: 120, y: 70 }], hint: { e: [-1, 0], k: [1, 0.2] }, tempo: [3, 0.8], poses: [DIP_UP, DIP_DOWN] },
    parallel_dip: { props: [{ w: 'pbar', x: 120, y: 70 }], hint: { e: [-1, 0], k: [1, 0.2] }, poses: [DIP_UP, DIP_DOWN] },
    ring_dip: { props: [{ w: 'strap', from: [120, -40], to: 'hn', ring: true }], hint: { e: [-1, 0], k: [1, 0.2] }, floor: true, poses: [DIP_UP, DIP_DOWN] },
    support_hold: { props: [{ w: 'pbar', x: 120, y: 70 }], hint: { k: [1, 0.2] }, hold: true,
      poses: [DIP_UP, { ...DIP_UP, hip: [116, 61] }] },

    // Tirón vertical
    dead_hang: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, hold: true, poses: [HANG, { ...HANG, hip: [119, 79], fn: [88, 127] }] },
    scap_pull: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, tempo: [0.7, 0.7],
      poses: [HANG, { ...HANG, hip: [119, 73], fn: [88, 121] }] },
    negative_pullup: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, tempo: [4, 0.6], holds: [0.6, 0.3], poses: [PULL_TOP, HANG] },
    assisted_pullup: { props: [{ w: 'bar', y: -20 }, { w: 'strap', from: [120, -20], to: 'fn', band: true }], hint: H_PULL, poses: [HANG, PULL_TOP] },
    chinup: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, poses: [HANG, PULL_TOP] },
    pullup: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, poses: [HANG, PULL_TOP] },
    pullup_pause: { props: [{ w: 'bar', y: -20 }], hint: H_PULL, holds: [0.4, 1.8], poses: [HANG, PULL_TOP] },
    archer_pullup: { props: [{ w: 'bar', y: -20, x1: 40, x2: 200 }], hint: H_PULL,
      poses: [{ ...HANG, hf: [80, -20] }, { ...PULL_TOP, hip: [128, 30], hn: [140, -20], hf: [80, -20] }] },
    hanging_knee_raise: { props: [{ w: 'bar', y: -20 }], hint: { e: [0.3, 1], k: [1, -1] },
      poses: [HANG, { hip: [123, 78], t: -8, hn: [120, -20], fn: [152, 96] }] },
    hanging_leg_raise: { props: [{ w: 'bar', y: -20 }], hint: { e: [0.3, 1], k: [1, -1] },
      poses: [{ ...HANG, fn: [116, 150] }, { hip: [126, 76], t: -10, hn: [120, -20], fn: [198, 66] }] },

    // Tirón horizontal
    prone_ytw: { hint: { e: [0, -1] }, tempo: [0.8, 0.8],
      poses: [{ hip: [100, 140], t: 92, hn: [196, 146], fn: [24, 146] }, { hip: [100, 140], t: 88, n: -8, hn: [194, 116], fn: [24, 146] }] },
    superman: { hint: { e: [0, -1], k: [-1, -1] }, tempo: [0.8, 0.8],
      poses: [{ hip: [100, 140], t: 92, hn: [196, 146], fn: [24, 146] }, { hip: [100, 141], t: 84, n: -8, hn: [192, 112], fn: [28, 122] }] },
    towel_row: { props: [{ w: 'door', x: 200 }, { w: 'strap', from: [198, 80], to: 'hn' }], hint: { e: [-1, 0.6] },
      poses: [{ hip: [110, 84], t: -32, hn: [137, 61], fn: [150, 148] }, { hip: [124, 77], t: -18, hn: [128, 52], fn: [150, 148] }] },
    table_row: { props: [{ w: 'table', x1: 112, x2: 196, y: 70 }], hint: { e: [0, 1] },
      poses: [{ hip: [93, 128], t: 75, hn: [118, 70], fn: [20, 146] }, { hip: [84, 107], t: 57, hn: [118, 70], fn: [20, 146] }] },
    elevated_row: { props: [{ w: 'table', x1: 112, x2: 196, y: 70 }, { w: 'box', x: -6, y: 112, wd: 36 }], hint: { e: [0, 1] },
      poses: [{ hip: [84, 115], t: 94, hn: [118, 70], fn: [10, 110] }, { hip: [84, 100], t: 77, hn: [118, 70], fn: [10, 110] }] },
    archer_row: { props: [{ w: 'table', x1: 100, x2: 200, y: 70 }], hint: { e: [0, 1] },
      poses: [{ hip: [93, 128], t: 75, hn: [118, 70], hf: [168, 70], fn: [20, 146] }, { hip: [86, 108], t: 58, hn: [118, 70], hf: [168, 70], fn: [20, 146] }] },

    // Piernas
    box_squat: { props: [{ w: 'box', x: 56, y: 108, wd: 40 }], poses: [STAND, { hip: [92, 102], t: 30, hn: [168, 72], fn: [121, 148] }] },
    air_squat: { poses: [STAND, { hip: [96, 112], t: 35, hn: [172, 72], fn: [121, 148] }] },
    split_squat: { hint: { kf: [0.3, 1] },
      poses: [{ hip: [112, 80], t: 4, hn: [120, 84], fn: [142, 148], ff: [82, 146] }, { hip: [110, 112], t: 6, hn: [118, 116], fn: [142, 148], ff: [82, 146] }] },
    reverse_lunge: { hint: { kf: [0.3, 1] },
      poses: [STAND, { hip: [108, 110], t: 6, hn: [116, 114], fn: [121, 148], ff: [66, 146] }] },
    bulgarian_split: { props: [{ w: 'box', x: 26, y: 104, wd: 44 }], hint: { kf: [0.3, 1] },
      poses: [{ hip: [108, 76], t: 8, hn: [116, 82], fn: [135, 148], ff: [56, 100] }, { hip: [104, 110], t: 14, hn: [114, 114], fn: [135, 148], ff: [56, 100] }] },
    shrimp_assisted: { props: [{ w: 'wall', x: 186 }], hint: { kf: [0, 1] },
      poses: [{ hip: [120, 74], t: 4, hn: [182, 56], hf: [98, 98], fn: [122, 148], ff: [98, 98] }, { hip: [104, 114], t: 30, hn: [182, 82], hf: [72, 124], fn: [122, 148], ff: [72, 124] }] },
    pistol_assisted: { props: [{ w: 'pbar', x: 186, y: -40 }], hint: { k: [1, -0.3] },
      poses: [{ hip: [120, 74], t: 4, hn: [184, 48], fn: [122, 148], ff: [162, 138] }, { hip: [104, 126], t: 34, hn: [184, 86], fn: [122, 148], ff: [180, 124] }] },
    pistol: { hint: { k: [1, -0.3] },
      poses: [{ hip: [120, 74], t: 4, hn: [124, 80], fn: [122, 148], ff: [160, 138] }, { hip: [104, 126], t: 36, hn: [182, 80], fn: [122, 148], ff: [180, 124] }] },
    wall_sit: { props: [{ w: 'wall', x: 52 }], hint: { k: [1, -1] }, hold: true,
      poses: [{ hip: [76, 106], t: 0, hn: [110, 102], fn: [116, 148] }, { hip: [76, 105], t: 0, hn: [110, 101], fn: [116, 148] }] },
    calf_raise: { tempo: [0.6, 0.9], poses: [STAND, { ...STAND, hip: [120, 64], hn: [124, 72], fn: [121, 140] }] },

    // Cadera / glúteos
    glute_bridge: { hint: H_SUPINE, poses: [SUPINE, { hip: [112, 108], t: -125, hn: [104, 148], fn: [148, 148] }] },
    sl_glute_bridge: { hint: H_SUPINE,
      poses: [{ ...SUPINE, fn: [178, 122], ff: [148, 148] }, { hip: [112, 108], t: -125, hn: [104, 148], fn: [182, 84], ff: [148, 148] }] },
    hip_thrust: { props: [{ w: 'box', x: 16, y: 108, wd: 50 }], hint: H_SUPINE,
      poses: [{ hip: [96, 140], t: -44, hn: [100, 132], fn: [140, 148] }, { hip: [110, 102], t: -92, hn: [110, 98], fn: [140, 148] }] },
    sl_hip_thrust: { props: [{ w: 'box', x: 16, y: 108, wd: 50 }], hint: H_SUPINE,
      poses: [{ hip: [96, 140], t: -44, hn: [100, 132], fn: [168, 118], ff: [140, 148] }, { hip: [110, 102], t: -92, hn: [110, 98], fn: [184, 88], ff: [140, 148] }] },
    nordic_negative: { props: [{ w: 'anchor', x: 52, y: 136 }], hint: { k: [1, 1], e: [-1, 0.5] }, tempo: [3, 0.8],
      poses: [{ hip: [100, 108], t: 0, hn: [112, 82], fn: [62, 146] }, { hip: [131, 125], t: 58, hn: [196, 140], fn: [62, 146] }] },
    quadruped_kickback: { hint: { kn: [0, 1], kf: [1, 1] },
      poses: [QUAD, { ...QUAD, fn: [58, 54], ff: [55, 148] }] },
    side_lying_abduction: { hint: { e: [1, -1] },
      poses: [{ hip: [110, 140], t: -90, hn: [96, 140], hf: [40, 128], fn: [186, 144] }, { hip: [110, 140], t: -90, hn: [96, 140], hf: [40, 128], fn: [178, 104], ff: [186, 144] }] },

    // Core
    dead_bug: { hint: { k: [-1, -1], e: [0, -1] },
      poses: [{ hip: [110, 138], t: -92, hn: [66, 86], fn: [148, 100] }, { hip: [110, 138], t: -92, hn: [12, 136], hf: [66, 86], fn: [148, 100], ff: [184, 128] }] },
    plank: { hint: { e: [-1, 1] }, hold: true,
      poses: [{ hip: [104, 130], t: 78, hn: [176, 146], fn: [30, 146] }, { hip: [104, 128], t: 77, hn: [176, 146], fn: [30, 146] }] },
    side_plank: { hint: { e: [-1, 1] }, hold: true,
      poses: [{ hip: [104, 128], t: 77, hn: [166, 146], hf: [162, 60], fn: [30, 146] }, { hip: [104, 126], t: 76, hn: [166, 146], hf: [162, 58], fn: [30, 146] }] },
    hollow_hold: { hold: true, hint: { k: [0, -1] },
      poses: [{ hip: [120, 140], t: -70, hn: [24, 112], fn: [194, 124] }, { hip: [120, 139], t: -72, hn: [24, 110], fn: [194, 122] }] },
    tuck_lsit: { hint: { k: [1, -1], e: [-1, 0] },
      poses: [{ hip: [118, 145], t: -2, hn: [118, 148], fn: [152, 146] }, { hip: [118, 136], t: -2, hn: [118, 148], fn: [146, 122] }] },
    lsit: { hint: { k: [1, -1], e: [-1, 0] },
      poses: [{ hip: [118, 145], t: -2, hn: [118, 148], fn: [194, 146] }, { hip: [118, 136], t: -2, hn: [118, 148], fn: [194, 134] }] },
    dragon_flag_neg: { props: [{ w: 'box', x: 30, y: 122, wd: 150 }], hint: { e: [1, -1], k: [1, 0] }, tempo: [3, 1],
      poses: [{ hip: [64, 72], t: -175, hn: [40, 112], fn: [70, -4] }, { hip: [104, 106], t: -104, hn: [40, 112], fn: [180, 96] }] },
    bird_dog: { hint: { kn: [1, 1], kf: [1, 1], e: [-1, 0] },
      poses: [QUAD, { ...QUAD, hn: [186, 88], ff: [16, 104] }] },
    reverse_crunch: { hint: { k: [-1, -1], e: [0, -1] },
      poses: [{ hip: [110, 138], t: -93, hn: [104, 148], fn: [148, 100] }, { hip: [104, 128], t: -100, hn: [104, 148], fn: [112, 80] }] },

    // Habilidades
    crow: { hint: { k: [1, 1], e: [-1, 0] },
      poses: [{ hip: [110, 104], t: 60, hn: [146, 148], fn: [116, 148] }, { hip: [114, 92], t: 72, hn: [146, 148], fn: [118, 112] }] },
    wall_handstand_skill: { props: [{ w: 'wall', x: 150 }], hold: true,
      poses: [{ hip: [138, 48], t: 180, hn: [138, 148], fn: [146, -26] }, { hip: [139, 47], t: 179, hn: [138, 148], fn: [146, -27] }] },
    freestanding_hs: { hold: true,
      poses: [{ hip: [120, 48], t: 180, hn: [120, 148], fn: [124, -27] }, { hip: [118, 48], t: 177, hn: [120, 148], fn: [116, -27] }] },



    // ---- Multiestación Bodytone: torre detrás del asiento, viga alta con polea, asiento, respaldo y rodillos ----
    lat_pulldown: { props: [...BT_SEAT, ...BT_TOWER, { w: 'seg', a: [124, 120], b: [140, 120], r: 4.5 }, { w: 'strap', from: [118, -66], to: 'hn' }], hint: { e: [0.3, 1], k: [1, -0.2] },
      poses: [{ hip: [106, 98], t: -6, hn: [124, -4], fn: [140, 148] }, { hip: [106, 98], t: -12, hn: [128, 48], fn: [140, 148] }] },
    bt_close_pulldown: { props: [...BT_SEAT, ...BT_TOWER, { w: 'seg', a: [124, 120], b: [140, 120], r: 4.5 }, { w: 'strap', from: [118, -66], to: 'hn' }], hint: { e: [0.6, 1], k: [1, -0.2] },
      poses: [{ hip: [106, 98], t: -4, hn: [122, -2], fn: [140, 148] }, { hip: [106, 98], t: -10, hn: [124, 56], fn: [140, 148] }] },
    machine_chest_press: { props: [...BT_SEAT, ...BT_TOWER, ...BT_ARMS], hint: { e: [-1, 0.6] },
      poses: [{ hip: [96, 98], t: -6, hn: [124, 58], fn: [140, 148] }, { hip: [96, 98], t: -6, hn: [146, 60], fn: [140, 148] }] },
    bt_pec_deck: { props: [...BT_SEAT, ...BT_TOWER, ...BT_ARMS], hint: { e: [-0.4, 1] },
      poses: [{ hip: [96, 98], t: -6, hn: [106, 22], fn: [140, 148] }, { hip: [96, 98], t: -6, hn: [132, 20], fn: [140, 148] }] },
    leg_extension: { props: [...BT_SEAT, ...BT_TOWER, { w: 'weight', to: ['fn'], pad: true }], hint: { k: [1, -0.3] },
      poses: [{ hip: [104, 96], t: -6, hn: [112, 100], fn: [132, 146] }, { hip: [104, 96], t: -6, hn: [112, 100], fn: [176, 102] }] },
    bt_standing_leg_curl: { props: [...BT_FRONT, { w: 'weight', to: ['ff'], pad: true }], hint: { e: [-1, 0.5], kf: [0, 1] },
      poses: [{ hip: [118, 72], t: 6, hn: [158, 60], fn: [121, 148], ff: [116, 146] }, { hip: [118, 72], t: 8, hn: [158, 60], fn: [121, 148], ff: [86, 100] }] },
    bt_kickback: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'ff' }], hint: { e: [-1, 0.5], kf: [0.2, 1] },
      poses: [{ hip: [118, 72], t: 14, hn: [158, 60], fn: [121, 148], ff: [124, 146] }, { hip: [118, 72], t: 20, hn: [158, 60], fn: [121, 148], ff: [72, 120] }] },
    bt_cable_crunch: { props: [...BT_FRONT, { w: 'strap', from: [168, -60], to: 'hn' }], hint: { k: [0.3, 1], e: [1, 0.2] },
      poses: [{ hip: [104, 106], t: 8, hn: [130, 48], fn: [66, 148] }, { hip: [106, 108], t: 62, n: 14, hn: [148, 92], fn: [66, 148] }] },
    bt_upright_row: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'hn' }], hint: { e: [-0.4, -1] },
      poses: [{ hip: [120, 72], t: 4, hn: [130, 96], fn: [121, 148] }, { hip: [120, 72], t: 4, hn: [132, 44], fn: [121, 148] }] },
    cable_row: { props: [...BT_FRONT, { w: 'strap', from: [164, 134], to: 'hn' }], hint: { e: [-1, 0.5], k: [1, -0.5] },
      poses: [{ hip: [90, 140], t: 26, hn: [150, 112], fn: [158, 136] }, { hip: [90, 140], t: -2, hn: [116, 110], fn: [158, 136] }] },
    triceps_pushdown: { props: [...BT_FRONT, { w: 'strap', from: [168, -60], to: 'hn' }], hint: { e: [-1, 0.5] },
      poses: [{ hip: [120, 72], t: 10, hn: [146, 60], fn: [121, 148] }, { hip: [120, 72], t: 10, hn: [142, 94], fn: [121, 148] }] },
    cable_curl: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'hn' }], hint: { e: [0, 1] },
      poses: [{ hip: [120, 72], t: 6, hn: [136, 92], fn: [121, 148] }, { hip: [120, 72], t: 6, hn: [142, 30], fn: [121, 148] }] },

    bt_straight_arm_pulldown: { props: [...BT_FRONT, { w: 'strap', from: [168, -60], to: 'hn' }], hint: { e: [-1, -0.2] },
      poses: [{ hip: [116, 74], t: 20, hn: [170, -12], fn: [121, 148] }, { hip: [116, 74], t: 22, hn: [146, 80], fn: [121, 148] }] },
    bt_overhead_triceps: { props: [...BT_BEHIND, { w: 'strap', from: [76, -62], to: 'hn' }], hint: { e: [0, -1], kf: [0.3, 1] },
      poses: [{ hip: [118, 74], t: 25, hn: [132, 2], fn: [146, 148], ff: [96, 148] }, { hip: [118, 74], t: 25, hn: [184, 4], fn: [146, 148], ff: [96, 148] }] },
    bt_face_pull: { props: [...BT_FRONT, { w: 'strap', from: [168, -20], to: 'hn' }], hint: { e: [-0.5, -1] },
      poses: [{ hip: [118, 74], t: -6, hn: [168, 18], fn: [121, 148] }, { hip: [118, 74], t: -4, hn: [140, 12], fn: [121, 148] }] },
    bt_woodchop_high: { props: [...BT_FRONT, { w: 'strap', from: [168, -60], to: 'hn' }], hint: { e: [0, 1] },
      poses: [{ hip: [118, 72], t: -4, hn: [164, -4], fn: [126, 148], ff: [104, 148] }, { hip: [116, 74], t: 18, hn: [110, 96], fn: [126, 148], ff: [104, 148] }] },
    bt_low_woodchop: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'hn' }], hint: { e: [0, 1] },
      poses: [{ hip: [114, 80], t: 26, hn: [150, 118], fn: [126, 148], ff: [104, 148] }, { hip: [118, 72], t: -4, hn: [112, 4], fn: [126, 148], ff: [104, 148] }] },
    bt_front_raise: { props: [...BT_BEHIND, { w: 'strap', from: [60, 140], to: 'hn' }], hint: { e: [-1, 0.3] },
      poses: [{ ...STAND, hn: [126, 78] }, { ...STAND, hn: [174, 24] }] },
    bt_cable_squat: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'hn' }], hint: { e: [-0.2, 1] },
      poses: [{ ...STAND, hn: [140, 46] }, { hip: [96, 112], t: 32, hn: [132, 78], fn: [121, 148] }] },
    bt_pull_through: { props: [...BT_BEHIND, { w: 'strap', from: [60, 140], to: 'hn' }], hint: { e: [1, 1] },
      poses: [{ hip: [112, 76], t: 75, hn: [108, 124], fn: [121, 148] }, { ...STAND, hn: [124, 96] }] },
    bt_one_arm_row: { props: [...BT_FRONT, { w: 'strap', from: [164, 140], to: 'hn' }], hint: { e: [-1, -1], kf: [0.3, 1] },
      poses: [{ hip: [110, 80], t: 40, hn: [160, 92], hf: [146, 104], fn: [138, 148], ff: [92, 148] }, { hip: [110, 80], t: 40, hn: [124, 76], hf: [146, 104], fn: [138, 148], ff: [92, 148] }] },
    bt_reverse_fly: { props: [...BT_FRONT, { w: 'seg', a: [86, 102], b: [140, 102], r: 5 }, { w: 'seg', a: [112, 104], b: [112, 150], r: 3 }], hint: { e: [0, -1] },
      poses: [{ hip: [110, 98], t: 14, hn: [168, 40], fn: [150, 148] }, { hip: [110, 98], t: 14, hn: [128, 36], fn: [150, 148] }] },
    bt_situp_rollers: { props: [...BT_SEAT, ...BT_TOWER, { w: 'weight', to: ['fn'], pad: true }], hint: { k: [1, -0.3], e: [1, 0.3] },
      poses: [{ hip: [104, 98], t: -40, hn: [86, 60], fn: [140, 140] }, { hip: [104, 98], t: 10, hn: [120, 58], fn: [140, 140] }] },
    // ---- Máquina multiestación ----
    machine_shoulder_press: { props: [{ w: 'box', x: 80, y: 104, wd: 40 }, { w: 'seg', a: [82, 104], b: [78, 30], r: 4 }, { w: 'seg', a: [60, 148], b: [60, -40] },
      { w: 'strap', from: [60, -30], to: 'hn' }], hint: { e: [1, 1] },
      poses: [{ hip: [100, 100], t: -4, hn: [112, 40], fn: [146, 148] }, { hip: [100, 100], t: -4, hn: [104, 2], fn: [146, 148] }] },
    leg_curl: { props: [{ w: 'box', x: 24, y: 122, wd: 154 }, { w: 'weight', to: ['fn'], pad: true }], hint: { k: [-1, 1] },
      poses: [{ hip: [96, 114], t: 92, hn: [178, 128], fn: [22, 118] }, { hip: [96, 114], t: 92, hn: [178, 128], fn: [66, 76] }] },
    // ---- Mancuernas ----
    goblet_squat: { props: [{ w: 'weight', to: ['hn'] }], hint: { e: [-0.2, 1] },
      poses: [{ ...STAND, hn: [140, 46] }, { hip: [96, 112], t: 32, hn: [132, 78], fn: [121, 148] }] },
    db_lunge: { props: [{ w: 'weight', to: ['hn', 'hf'] }], hint: { kf: [0.3, 1] },
      poses: [STAND, { hip: [108, 110], t: 6, hn: [114, 118], fn: [121, 148], ff: [66, 146] }] },
    db_rdl: { props: [{ w: 'weight', to: ['hn', 'hf'] }], poses: [STAND, { hip: [104, 74], t: 80, hn: [150, 116], fn: [121, 148] }] },
    db_row: { props: [{ w: 'weight', to: ['hn', 'hf'] }], hint: { e: [-1, -1] },
      poses: [{ hip: [104, 74], t: 70, hn: [148, 112], fn: [121, 148] }, { hip: [104, 74], t: 70, hn: [130, 84], fn: [121, 148] }] },
    db_floor_press: { props: [{ w: 'weight', to: ['hn', 'hf'] }], hint: { k: [0.3, -1], e: [1, 0.3] },
      poses: [{ hip: [110, 140], t: -92, hn: [66, 86], fn: [148, 148] }, { hip: [110, 140], t: -92, hn: [72, 118], fn: [148, 148] }] },
    db_shoulder_press: { props: [{ w: 'weight', to: ['hn', 'hf'] }], hint: { e: [0.4, 1] },
      poses: [{ ...STAND, hn: [132, 22] }, { ...STAND, hn: [124, -26] }] },
    db_curl: { props: [{ w: 'weight', to: ['hn', 'hf'] }], hint: { e: [0, 1] },
      poses: [{ ...STAND, hn: [126, 80] }, { ...STAND, hn: [134, 32] }] },
    // ---- Máquinas de cardio ----
    bike: { props: [{ w: 'seg', a: [70, 148], b: [176, 148] }, { w: 'seg', a: [102, 146], b: [98, 92] }, { w: 'seg', a: [88, 90], b: [110, 90], r: 3.5 },
      { w: 'seg', a: [150, 146], b: [158, 66] }, { w: 'seg', a: [152, 64], b: [166, 64], r: 3 }, { w: 'seg', a: [122, 128], b: [150, 132] }, { w: 'disc', c: [152, 128], r: 17 }],
      hint: { k: [1, -0.4], e: [-1, 0.4] }, cycle: [0, 1, 2, 3], step: 0.22,
      poses: [{ hip: [100, 84], t: 28, hn: [156, 64], fn: [135, 128], ff: [109, 128] }, { hip: [100, 84], t: 28, hn: [156, 64], fn: [122, 141], ff: [122, 115] },
        { hip: [100, 84], t: 28, hn: [156, 64], fn: [109, 128], ff: [135, 128] }, { hip: [100, 84], t: 28, hn: [156, 64], fn: [122, 115], ff: [122, 141] }] },
    treadmill: { props: [{ w: 'seg', a: [50, 147], b: [200, 147], r: 2.5 }, { w: 'seg', a: [196, 148], b: [186, 52] }, { w: 'seg', a: [186, 62], b: [150, 64], r: 2.5 }],
      hint: { k: [1, 0], e: [-1, 0.4] }, tempo: [0.3, 0.3], holds: [0.02, 0.02],
      poses: [{ hip: [118, 70], t: 8, hn: [100, 82], hf: [148, 60], fn: [146, 122], ff: [96, 142] }, { hip: [118, 70], t: 8, hn: [148, 60], hf: [100, 82], fn: [96, 142], ff: [146, 122] }] },
    elliptical: { props: [{ w: 'seg', a: [60, 148], b: [190, 148] }, { w: 'seg', a: [180, 148], b: [170, 40] }, { w: 'strap', from: [170, 44], to: 'hn' }, { w: 'strap', from: [170, 44], to: 'hf' }],
      hint: { k: [1, -0.2], e: [-1, 0.4] }, tempo: [0.5, 0.5], holds: [0.02, 0.02],
      poses: [{ hip: [116, 66], t: 6, hn: [150, 52], hf: [136, 60], fn: [136, 138], ff: [100, 132] }, { hip: [116, 66], t: 6, hn: [136, 60], hf: [150, 52], fn: [100, 132], ff: [136, 138] }] },
    jump_rope: { tempo: [0.18, 0.18], holds: [0.02, 0.02],
      poses: [{ ...STAND, hn: [134, 92] }, { hip: [120, 62], t: 2, hn: [134, 82], fn: [121, 138] }] },

    // ---- Ampliación: más movimientos de calistenia ----
    hindu_pushup: { hint: { e: [-1, -0.5] }, cycle: [0, 1, 2], step: 0.8,
      poses: [{ hip: [95, 80], t: 133, hn: [168, 148], fn: [58, 148] }, { hip: [124, 122], t: 104, hn: [168, 148], fn: [58, 148] }, { hip: [134, 140], t: 28, n: -10, hn: [168, 148], fn: [58, 148] }] },
    spiderman_pushup: { hint: { e: [-1, -0.6], kf: [1, 0.3] }, poses: [PLANK_UP, { ...PLANK_DOWN, ff: [118, 136] }] },
    clap_pushup: { hint: H_PUSH, tempo: [0.3, 0.6], holds: [0.3, 0.1],
      poses: [PLANK_DOWN, { hip: [108, 104], t: 62, hn: [152, 122], fn: [40, 146] }] },
    wall_walk: { props: [{ w: 'wall', x: 2 }], hint: { e: [-1, -0.4] }, tempo: [2.4, 1.6],
      poses: [{ hip: [109, 114], t: 65, hn: [150, 148], fn: [22, 140] }, { hip: [34, 50], t: 175, hn: [40, 148], fn: [18, -22] }] },
    hspu_wall: { props: [{ w: 'wall', x: 150 }], hint: { e: [-1, 0] }, tempo: [1.4, 1.2],
      poses: [{ hip: [138, 48], t: 180, hn: [134, 148], fn: [146, -26] }, { hip: [140, 76], t: 182, hn: [134, 148], fn: [146, 2] }] },
    muscle_up: { props: [{ w: 'bar', y: -20 }], hint: { e: [-1, 0.6], k: [1, 0.2] }, cycle: [0, 1, 2, 1], step: 0.8,
      poses: [HANG, { ...PULL_TOP, hip: [116, 22] }, { hip: [116, -28], t: 6, hn: [120, -20], fn: [104, 44] }] },
    l_pullup: { props: [{ w: 'bar', y: -20 }], hint: { e: [0.3, 1], k: [1, -1] },
      poses: [{ hip: [119, 80], t: -3, hn: [120, -20], fn: [194, 74] }, { hip: [114, 30], t: -8, n: 4, hn: [120, -20], fn: [189, 24] }] },
    toes_to_bar: { props: [{ w: 'bar', y: -20 }], hint: { e: [0.3, 1], k: [1, -1] },
      poses: [{ ...HANG, fn: [116, 150] }, { hip: [128, 70], t: -14, hn: [120, -20], fn: [146, -6] }] },
    tuck_front_lever: { props: [{ w: 'bar', y: -20 }], hint: { e: [0.3, 1], k: [-1, -1] }, tempo: [1.2, 1],
      poses: [HANG, { hip: [164, 36], t: -92, hn: [120, -20], fn: [146, 46] }] },
    tuck_planche: { hint: { k: [1, 1], e: [-1, 0] }, hold: true,
      poses: [{ hip: [100, 98], t: 84, hn: [132, 148], fn: [110, 104] }, { hip: [100, 96], t: 85, hn: [132, 148], fn: [110, 102] }] },
    step_up: { props: [{ w: 'box', x: 130, y: 110, wd: 46 }], hint: { kf: [1, -0.2] },
      poses: [{ hip: [112, 84], t: 12, hn: [120, 90], fn: [148, 108], ff: [100, 148] }, { hip: [140, 34], t: 3, hn: [146, 40], fn: [148, 108], ff: [150, 74] }] },
    sissy_squat: { hint: { k: [1, 0] }, poses: [STAND, { hip: [128, 104], t: -30, hn: [150, 60], fn: [122, 146] }] },
    good_morning: { hint: { e: [-1, -0.5] }, poses: [{ ...STAND, hn: [126, 18] }, { hip: [104, 74], t: 80, hn: [156, 56], fn: [121, 148] }] },
    sl_rdl: { hint: { kf: [0, 1] }, poses: [STAND, { hip: [108, 72], t: 85, hn: [150, 112], fn: [121, 148], ff: [34, 64] }] },
    crunch: { hint: H_SUPINE, tempo: [0.7, 0.9],
      poses: [{ hip: [110, 138], t: -93, hn: [72, 128], fn: [148, 148] }, { hip: [110, 138], t: -60, n: -10, hn: [100, 106], fn: [148, 148] }] },
    bicycle_crunch: { hint: { k: [-0.3, -1], e: [0, -1] }, tempo: [0.5, 0.5], holds: [0.1, 0.1],
      poses: [{ hip: [110, 140], t: -65, hn: [80, 98], fn: [132, 104], ff: [184, 128] }, { hip: [110, 140], t: -65, hn: [80, 98], fn: [184, 128], ff: [132, 104] }] },
    leg_raise_floor: { hint: { e: [0, -1] },
      poses: [{ hip: [110, 140], t: -92, hn: [96, 148], fn: [186, 140] }, { hip: [110, 140], t: -92, hn: [96, 148], fn: [118, 64] }] },
    v_up: { hint: { e: [1, -1] },
      poses: [{ hip: [120, 140], t: -88, hn: [30, 132], fn: [196, 136] }, { hip: [120, 142], t: -40, hn: [158, 74], fn: [168, 82] }] },
    bear_crawl: { hint: { k: [1, 1], e: [-1, 0] }, tempo: [0.45, 0.45], holds: [0.05, 0.05],
      poses: [{ hip: [90, 96], t: 80, hn: [136, 148], hf: [150, 148], fn: [60, 148], ff: [78, 148] }, { hip: [96, 96], t: 80, hn: [150, 148], hf: [136, 148], fn: [78, 148], ff: [62, 148] }] },
    inchworm: { hint: { e: [-1, -0.5] }, cycle: [0, 1, 2, 1], step: 0.9,
      poses: [STAND, { hip: [118, 72], t: 160, hn: [136, 148], fn: [121, 148] }, { hip: [190, 116], t: 65, hn: [230, 148], fn: [121, 146] }] },
    // ---- Ampliación: TRX ----
    trx_rollout: { props: [{ w: 'trx', anchor: [4, -70], to: ['hn', 'hf'] }], hint: { e: [1, 0] },
      poses: [{ hip: [112, 79], t: 25, hn: [176, 40], fn: [80, 148] }, { hip: [130, 96], t: 50, hn: [200, 30], fn: [80, 148] }] },
    trx_squat_jump: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], tempo: [0.4, 0.5], holds: [0.2, 0.1],
      poses: [{ hip: [94, 114], t: 22, hn: [160, 64], fn: [121, 148] }, { hip: [120, 58], t: 0, hn: [172, 24], fn: [121, 132] }] },
    trx_hamstring_runner: { props: [{ w: 'trx', anchor: [170, -70], to: ['fn', 'ff'] }], hint: { k: [0.3, -1], e: [0, -1] }, tempo: [0.5, 0.5],
      poses: [{ hip: [114, 104], t: -124, hn: [100, 148], fn: [150, 96], ff: [184, 96] }, { hip: [114, 104], t: -124, hn: [100, 148], fn: [184, 96], ff: [150, 96] }] },
    trx_t_fly: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [1, 0] },
      poses: [{ hip: [108, 79], t: -25, hn: [133, 7], fn: [140, 148] }, { hip: [124, 74], t: -10, hn: [156, 12], fn: [140, 148] }] },

    // TRX (cintas de suspensión). Anclaje delante = remos; anclaje detrás = press.
    trx_row_high: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [-1, 0.6] },
      poses: [{ hip: [108, 79], t: -25, hn: [133, 7], fn: [140, 148] }, { hip: [124, 74], t: -12, hn: [134, 34], fn: [140, 148] }] },
    trx_row: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [-1, 0.6] },
      poses: [{ hip: [101, 90], t: -40, hn: [115, 23], fn: [150, 148] }, { hip: [118, 79], t: -25, hn: [118, 44], fn: [150, 148] }] },
    trx_row_low: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [-1, 0.6] },
      poses: [{ hip: [99, 110], t: -60, hn: [100, 52], fn: [165, 148] }, { hip: [108, 97], t: -48, hn: [92, 70], fn: [165, 148] }] },
    trx_single_row: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn'] }], hint: { e: [-1, 0.6], ef: [-1, 0] },
      poses: [{ hip: [101, 90], t: -40, hn: [115, 23], hf: [82, 100], fn: [150, 148] }, { hip: [118, 79], t: -25, hn: [118, 44], hf: [104, 86], fn: [150, 148] }] },
    trx_face_pull: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [0, -1] },
      poses: [{ hip: [108, 79], t: -25, hn: [133, 7], fn: [140, 148] }, { hip: [124, 74], t: -12, hn: [128, 14], fn: [140, 148] }] },
    trx_biceps_curl: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [1, 1] },
      poses: [{ hip: [108, 79], t: -25, hn: [133, 7], fn: [140, 148] }, { hip: [120, 76], t: -18, hn: [126, 12], fn: [140, 148] }] },
    trx_y_raise: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { e: [1, 0] },
      poses: [{ hip: [108, 79], t: -25, hn: [133, 7], fn: [140, 148] }, { hip: [124, 74], t: -10, hn: [150, -22], fn: [140, 148] }] },
    trx_chest_press_high: { props: [{ w: 'trx', anchor: [4, -70], to: ['hn', 'hf'] }], hint: { e: [-1, -0.5] },
      poses: [{ hip: [116, 77], t: 20, hn: [180, 50], fn: [90, 148] }, { hip: [130, 84], t: 32, hn: [168, 56], fn: [90, 148] }] },
    trx_chest_press: { props: [{ w: 'trx', anchor: [4, -70], to: ['hn', 'hf'] }], hint: { e: [-1, -0.5] },
      poses: [{ hip: [119, 90], t: 40, hn: [195, 74], fn: [70, 148] }, { hip: [130, 101], t: 52, hn: [184, 82], fn: [70, 148] }] },
    trx_fly: { props: [{ w: 'trx', anchor: [4, -70], to: ['hn', 'hf'] }], hint: { e: [-1, -0.5] },
      poses: [{ hip: [119, 90], t: 40, hn: [196, 66], fn: [70, 148] }, { hip: [130, 101], t: 52, hn: [196, 74], hf: [150, 74], fn: [70, 148] }] },
    trx_triceps: { props: [{ w: 'trx', anchor: [4, -70], to: ['hn', 'hf'] }], hint: { e: [1, 0.3] },
      poses: [{ hip: [124, 86], t: 35, hn: [160, 22], fn: [80, 148] }, { hip: [112, 79], t: 25, hn: [176, 9], fn: [80, 148] }] },
    trx_pushup_feet: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, -0.6] },
      poses: [{ hip: [104, 96], t: 87, hn: [150, 148], fn: [28, 100] }, { hip: [102, 119], t: 104, hn: [150, 148], fn: [28, 100] }] },
    trx_atomic_pushup: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, -0.6], k: [1, 1] }, cycle: [0, 1, 0, 2], step: 0.7,
      poses: [{ hip: [104, 96], t: 87, hn: [150, 148], fn: [28, 100] }, { hip: [102, 119], t: 104, hn: [150, 148], fn: [28, 100] }, { hip: [110, 74], t: 117, hn: [150, 148], fn: [80, 100] }] },
    trx_knee_tuck: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, -0.6], k: [1, 1] },
      poses: [{ hip: [104, 96], t: 87, hn: [150, 148], fn: [28, 100] }, { hip: [108, 86], t: 101, hn: [150, 148], fn: [92, 100] }] },
    trx_mountain_climber: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, -0.6], k: [1, 1] }, tempo: [0.35, 0.35], holds: [0.05, 0.05],
      poses: [{ hip: [106, 94], t: 88, hn: [150, 148], fn: [90, 104], ff: [28, 100] }, { hip: [106, 94], t: 88, hn: [150, 148], fn: [28, 100], ff: [90, 104] }] },
    trx_pike: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, -0.5] },
      poses: [{ hip: [104, 96], t: 87, hn: [150, 148], fn: [28, 100] }, { hip: [124, 56], t: 146, hn: [150, 148], fn: [60, 94] }] },
    trx_plank: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, 1] }, hold: true,
      poses: [{ hip: [104, 116], t: 96, hn: [176, 146], fn: [28, 108] }, { hip: [104, 114], t: 95, hn: [176, 146], fn: [28, 108] }] },
    trx_body_saw: { props: [{ w: 'trx', anchor: [28, -70], to: ['fn', 'ff'] }], hint: { e: [-1, 1] },
      poses: [{ hip: [104, 116], t: 96, hn: [176, 146], fn: [28, 108] }, { hip: [90, 115], t: 96, hn: [176, 146], fn: [14, 108] }] },
    trx_hip_press: { props: [{ w: 'trx', anchor: [150, -70], to: ['fn', 'ff'] }], hint: { k: [0.3, -1], e: [0, -1] },
      poses: [{ hip: [110, 140], t: -93, hn: [104, 148], fn: [150, 96] }, { hip: [114, 112], t: -121, hn: [104, 148], fn: [150, 96] }] },
    trx_hamstring_curl: { props: [{ w: 'trx', anchor: [170, -70], to: ['fn', 'ff'] }], hint: { k: [0.3, -1], e: [0, -1] },
      poses: [{ hip: [110, 118], t: -115, hn: [100, 148], fn: [184, 96] }, { hip: [116, 100], t: -127, hn: [100, 148], fn: [148, 96] }] },
    trx_squat: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }],
      poses: [{ hip: [120, 72], t: 2, hn: [170, 38], fn: [121, 148] }, { hip: [94, 114], t: 22, hn: [160, 64], fn: [121, 148] }] },
    trx_lunge: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { kf: [0.3, 1] },
      poses: [{ hip: [112, 80], t: 4, hn: [166, 44], fn: [142, 148], ff: [82, 146] }, { hip: [110, 112], t: 8, hn: [164, 74], fn: [142, 148], ff: [82, 146] }] },
    trx_suspended_lunge: { props: [{ w: 'trx', anchor: [30, -70], to: ['ff'] }], hint: { kf: [0.3, 1] },
      poses: [{ hip: [110, 78], t: 4, hn: [118, 82], fn: [136, 148], ff: [62, 104] }, { hip: [104, 112], t: 8, hn: [112, 116], fn: [136, 148], ff: [46, 110] }] },
    trx_pistol: { props: [{ w: 'trx', anchor: [236, -70], to: ['hn', 'hf'] }], hint: { k: [1, -0.3] },
      poses: [{ hip: [120, 74], t: 4, hn: [172, 40], fn: [122, 148], ff: [160, 138] }, { hip: [104, 126], t: 30, hn: [176, 82], fn: [122, 148], ff: [180, 124] }] },
    trx_assisted_pullup: { props: [{ w: 'trx', anchor: [124, -80], to: ['hn', 'hf'] }], hint: { k: [1, 1], e: [0.3, 1] },
      poses: [{ hip: [100, 108], t: -4, hn: [124, 12], fn: [64, 146] }, { hip: [106, 88], t: -6, hn: [120, 30], fn: [64, 146] }] },

    // Cardio
    march: { hint: { k: [1, 0], e: [-1, 0.3] }, tempo: [0.45, 0.45], holds: [0.05, 0.05],
      poses: [{ ...STAND, hn: [100, 72], hf: [146, 70], fn: [146, 112], ff: [121, 148] }, { ...STAND, hn: [146, 70], hf: [100, 72], fn: [121, 148], ff: [146, 112] }] },
    shadow_boxing: { hint: { e: [-0.3, 1] }, tempo: [0.25, 0.35], holds: [0.1, 0.1],
      poses: [{ hip: [116, 74], t: 6, hn: [142, 30], hf: [138, 34], fn: [136, 148], ff: [100, 148] }, { hip: [118, 74], t: 10, hn: [176, 28], hf: [138, 34], fn: [136, 148], ff: [100, 148] }] },
    climbers_slow: { hint: { k: [1, 0.3], e: [-1, -0.6] }, tempo: [0.5, 0.5],
      poses: [{ ...PLANK_UP, fn: [110, 140], ff: [40, 146] }, { ...PLANK_UP, fn: [40, 146], ff: [110, 140] }] },
    climbers: { hint: { k: [1, 0.3], e: [-1, -0.6] }, tempo: [0.25, 0.25], holds: [0.05, 0.05],
      poses: [{ ...PLANK_UP, fn: [110, 140], ff: [40, 146] }, { ...PLANK_UP, fn: [40, 146], ff: [110, 140] }] },
    jumping_jacks: { hint: { e: [1, 0] }, tempo: [0.3, 0.3], holds: [0.05, 0.05],
      poses: [STAND, { hip: [120, 62], t: 2, hn: [112, -36], hf: [134, -36], fn: [130, 138], ff: [110, 138] }] },
    jump_squat: { tempo: [0.5, 0.35], holds: [0.2, 0.1],
      poses: [{ hip: [96, 112], t: 35, hn: [172, 72], fn: [121, 148] }, { hip: [121, 54], t: 0, hn: [140, -36], fn: [121, 130] }] },
    burpee: { hint: { e: [-1, -0.6] }, cycle: [0, 1, 2, 1, 3], step: 0.45,
      poses: [STAND, { hip: [106, 120], t: 60, hn: [150, 148], fn: [121, 148] }, PLANK_UP, { hip: [121, 54], t: 0, hn: [140, -36], fn: [121, 130] }] },
  };

  // Calentamiento y estiramientos (por nombre)
  const BY_NAME = {
    'Círculos de brazos': { tempo: [0.5, 0.5], hint: { e: [-1, 0] }, poses: [{ ...STAND, hn: [118, -26] }, { ...STAND, hn: [176, 30] }] },
    'Rotaciones de muñecas': { tempo: [0.4, 0.4], holds: [0.05, 0.05], hint: { e: [0, 1] },
      poses: [{ ...STAND, hn: [158, 50] }, { ...STAND, hn: [160, 58] }] },
    'Sentadilla con pausa abajo': { holds: [0.3, 1.2], poses: [STAND, { hip: [96, 112], t: 35, hn: [172, 72], fn: [121, 148] }] },
    'Marcha en el sitio': 'march',
    'Gato-camello': { tempo: [1, 1], hint: { k: [1, 1] }, poses: [{ ...QUAD, n: 10 }, { ...QUAD, hip: [90, 106], t: 66, n: -14 }] },
    'Postura del niño': { hold: true, hint: { k: [1, -0.5], e: [1, -0.5] },
      poses: [{ hip: [86, 128], t: 112, hn: [176, 146], fn: [56, 146] }, { hip: [86, 129], t: 113, hn: [176, 146], fn: [56, 146] }] },
    'Estiramiento de cuádriceps de pie': { hold: true, hint: { kf: [0, 1] },
      poses: [{ ...STAND, hf: [92, 112], ff: [92, 112] }, { ...STAND, hip: [120, 71], hf: [92, 111], ff: [92, 111] }] },
    'Estiramiento de isquiotibiales sentado/a': { hold: true, hint: { e: [1, 1] },
      poses: [{ hip: [70, 144], t: 50, hn: [140, 140], fn: [146, 146] }, { hip: [70, 144], t: 56, hn: [144, 142], fn: [146, 146] }] },
    'Estocada profunda (flexor de cadera)': { hold: true, hint: { kf: [0.3, 1] },
      poses: [{ hip: [104, 112], t: -2, hn: [128, 110], fn: [140, 148], ff: [52, 146] }, { hip: [104, 114], t: -4, hn: [128, 112], fn: [140, 148], ff: [52, 146] }] },
    'Estiramiento de pecho en la pared': { props: [{ w: 'wall', x: 168 }], hold: true,
      poses: [{ ...STAND, hip: [140, 72], hn: [168, 30], fn: [141, 148] }, { ...STAND, hip: [139, 72], t: 0, hn: [168, 30], fn: [141, 148] }] },
    'Estiramiento de dorsales (manos en la pared)': { props: [{ w: 'wall', x: 196 }], hold: true, hint: { k: [1, 0] },
      poses: [{ hip: [96, 76], t: 80, hn: [196, 64], fn: [100, 148] }, { hip: [96, 78], t: 84, hn: [196, 66], fn: [100, 148] }] },
  };

  // Alias de ejercicios que comparten animación
  const ALIAS = {
    bt_wide_pulldown: 'lat_pulldown', bt_reverse_pushdown: 'triceps_pushdown', bt_reverse_curl: 'cable_curl', bt_lateral_raise: 'bt_front_raise',
    bt_single_press: 'machine_chest_press', bt_single_leg_ext: 'leg_extension', bt_seat_dip: 'bench_dip', bt_seat_bulgarian: 'bulgarian_split',
    bt_seat_incline_pushup: 'incline_pushup',
    wall_handstand_skill: 'wall_handstand', wide_pushup: 'pushup', straight_bar_dip: 'parallel_dip', wide_pullup: 'pullup',
    typewriter_pullup: 'archer_pullup', sumo_squat: 'air_squat', frog_pump: 'glute_bridge', hollow_rock: 'hollow_hold',
    high_knees: 'march', trx_power_pull: 'trx_single_row', trx_high_row: 'trx_face_pull', trx_crossing_lunge: 'trx_lunge',
    trx_sl_hip_press: 'trx_hip_press', trx_side_plank: 'trx_plank', trx_oblique_crunch: 'trx_knee_tuck',
  };
  const COND_IDS = {
    'Marcha con rodillas altas': 'march', 'Boxeo de sombra': 'shadow_boxing', 'Escaladores lentos': 'climbers_slow',
    'Jumping jacks': 'jumping_jacks', 'Escaladores': 'climbers', 'Burpees': 'burpee', 'Sentadilla con salto': 'jump_squat',
    'Gateo de oso': 'bear_crawl', 'Gusano (inchworm)': 'inchworm', 'Rodillas altas': 'high_knees',
    'Bicicleta estática': 'bike', 'Bicicleta estática (suave)': 'bike', 'Caminadora': 'treadmill', 'Caminadora (suave)': 'treadmill',
    'Elíptica': 'elliptical', 'Elíptica (suave)': 'elliptical', 'Cuerda para saltar': 'jump_rope', 'Cuerda para saltar (suave)': 'jump_rope',
  };

  function specFor(key) {
    const k = COND_IDS[key] || key;
    let s = LIB[ALIAS[k] || k] || BY_NAME[key];
    if (typeof s === 'string') s = LIB[s];
    return s || null;
  }

  // ---------- Línea de tiempo ----------
  function timeline(spec) {
    const steps = [];
    if (spec.cycle) {
      const st = spec.step || 0.5;
      for (let i = 0; i < spec.cycle.length; i++) {
        steps.push({ a: spec.cycle[i], b: spec.cycle[(i + 1) % spec.cycle.length], d: st, h: 0.12, n: i });
      }
    } else if (spec.hold) {
      steps.push({ a: 0, b: 1, d: 1.6, h: 0, n: 0 }, { a: 1, b: 0, d: 1.6, h: 0, n: 1 });
    } else {
      const [d1, d2] = spec.tempo || [1, 1];
      const [h0, h1] = spec.holds || [0.4, 0.4];
      steps.push({ a: 0, b: 1, d: d1, h: h0, n: 0 }, { a: 1, b: 0, d: d2, h: h1, n: 1 });
    }
    const total = steps.reduce((t, s) => t + s.h + s.d, 0);
    return { steps, total };
  }

  // Devuelve la postura y la fase actual (pausa o movimiento, con su progreso).
  function poseAt(spec, tl, time) {
    let t = ((time % tl.total) + tl.total) % tl.total;
    for (const s of tl.steps) {
      if (t < s.h) return { pose: spec.poses[s.a], step: s, moving: false, k: 0 };
      t -= s.h;
      if (t < s.d) return { pose: mix(spec.poses[s.a], spec.poses[s.b], ease(t / s.d)), step: s, moving: true, k: t / s.d };
      t -= s.d;
    }
    return { pose: spec.poses[0], step: tl.steps[0], moving: false, k: 0 };
  }

  // ---------- Músculos trabajados ----------
  const PATTERN_MUSCLES = {
    push: ['chest', 'ua', 'shoulder'], vpush: ['shoulder', 'ua'], dip: ['ua', 'chest'], vpull: ['back', 'ua', 'fa'],
    hpull: ['back', 'ua'], squat: ['thigh', 'glute'], hinge: ['glute', 'thigh'], core: ['abs'], skill: ['shoulder', 'abs'],
    cardio: ['thigh', 'shoulder'],
  };
  const EX_MUSCLES = {
    calf_raise: ['shin'], quadruped_kickback: ['glute'], side_lying_abduction: ['glute'], nordic_negative: ['thigh'],
    prone_ytw: ['back', 'shoulder'], superman: ['back', 'glute'], shoulder_taps: ['abs', 'shoulder'], wall_sit: ['thigh'],
    dead_hang: ['fa', 'back'], scap_pull: ['back'], hanging_knee_raise: ['abs'], hanging_leg_raise: ['abs'], tuck_lsit: ['abs'],
    lsit: ['abs'], dragon_flag_neg: ['abs'], crow: ['shoulder', 'abs'],
    trx_face_pull: ['back', 'shoulder'], trx_y_raise: ['shoulder', 'back'], trx_triceps: ['ua'], trx_biceps_curl: ['ua', 'fa'],
    trx_hamstring_curl: ['thigh', 'glute'], trx_hip_press: ['glute'],
    trx_hamstring_runner: ['thigh', 'glute'], bike: ['thigh'], treadmill: ['thigh'], elliptical: ['thigh', 'shoulder'], jump_rope: ['shin', 'thigh'],
    leg_extension: ['thigh'], leg_curl: ['thigh', 'glute'], triceps_pushdown: ['ua'], cable_curl: ['ua', 'fa'], db_curl: ['ua', 'fa'],
    lat_pulldown: ['back', 'ua'], bt_close_pulldown: ['back', 'ua'], bt_pec_deck: ['chest', 'shoulder'], bt_cable_crunch: ['abs'],
    bt_kickback: ['glute'], bt_straight_arm_pulldown: ['back'], bt_overhead_triceps: ['ua'], bt_reverse_pushdown: ['ua'], bt_face_pull: ['shoulder', 'back'],
    bt_woodchop_high: ['abs'], bt_low_woodchop: ['abs', 'shoulder'], bt_front_raise: ['shoulder'], bt_lateral_raise: ['shoulder'], bt_reverse_curl: ['fa'],
    bt_cable_squat: ['thigh', 'glute'], bt_pull_through: ['glute', 'thigh'], bt_one_arm_row: ['back', 'ua'], bt_reverse_fly: ['shoulder', 'back'],
    bt_situp_rollers: ['abs'], bt_single_leg_ext: ['thigh'], bt_seat_dip: ['ua', 'chest'], bt_standing_leg_curl: ['thigh'], bt_upright_row: ['shoulder'], db_row: ['back', 'ua'], cable_row: ['back', 'ua'], db_rdl: ['glute', 'thigh'], goblet_squat: ['thigh', 'glute'], trx_t_fly: ['shoulder', 'back'], trx_rollout: ['abs', 'shoulder'], tuck_front_lever: ['back', 'abs'],
    tuck_planche: ['shoulder', 'abs'], good_morning: ['glute', 'thigh'], sl_rdl: ['glute', 'thigh'], step_up: ['thigh', 'glute'],
    l_pullup: ['back', 'abs'], toes_to_bar: ['abs'], muscle_up: ['back', 'ua', 'chest'], wall_walk: ['shoulder', 'abs'], trx_fly: ['chest', 'shoulder'], trx_assisted_pullup: ['back', 'ua'],
  };
  let patternById = null;
  function musclesFor(key, pattern) {
    if (EX_MUSCLES[key]) return EX_MUSCLES[key];
    if (!pattern) {
      if (!patternById) {
        patternById = {};
        for (const [p, list] of Object.entries(window.EXERCISE_LADDERS || {})) list.forEach((e) => { patternById[e.id] = p; });
        for (const [p, list] of Object.entries(window.EXERCISE_ALTERNATES || {})) list.forEach((e) => { patternById[e.id] = p; });
        for (const [p, list] of Object.entries(window.TRX_LADDERS || {})) list.forEach((e) => { patternById[e.id] = p; });
        for (const [p, list] of Object.entries(window.TRX_ALTERNATES || {})) list.forEach((e) => { patternById[e.id] = p; });
        for (const L2 of [window.GYM_LADDERS, window.DB_LADDERS]) for (const [p, list] of Object.entries(L2 || {})) list.forEach((e) => { patternById[e.id] = p; });
        for (const k of Object.keys(COND_IDS)) patternById[k] = 'cardio';
      }
      pattern = patternById[key];
    }
    return PATTERN_MUSCLES[pattern] || [];
  }

  // Textos de fase por ejercicio (por defecto se deducen de la dirección del movimiento)
  const PHASES = {
    table_row: ['Tira', 'Vuelve'], elevated_row: ['Tira', 'Vuelve'], archer_row: ['Tira', 'Vuelve'], towel_row: ['Tira', 'Vuelve'],
    negative_pullup: ['Baja lento', 'Vuelve arriba'], dip_negative: ['Baja lento', 'Vuelve arriba'], wall_hspu_neg: ['Baja lento', 'Vuelve'],
    nordic_negative: ['Baja lento', 'Vuelve'], dragon_flag_neg: ['Baja lento', 'Vuelve'], prone_ytw: ['Eleva', 'Baja'], superman: ['Eleva', 'Baja'],
    shoulder_taps: ['Toca el hombro', 'Apoya'], dead_bug: ['Estira', 'Vuelve'], bird_dog: ['Estira', 'Vuelve'],
    side_lying_abduction: ['Eleva', 'Baja'], quadruped_kickback: ['Empuja', 'Vuelve'],
    trx_row_high: ['Tira', 'Vuelve'], trx_row: ['Tira', 'Vuelve'], trx_row_low: ['Tira', 'Vuelve'], trx_single_row: ['Tira', 'Vuelve'],
    trx_face_pull: ['Tira a la cara', 'Vuelve'], trx_biceps_curl: ['Dobla', 'Estira'], trx_y_raise: ['Eleva en Y', 'Vuelve'],
    trx_triceps: ['Estira', 'Dobla'], trx_hamstring_curl: ['Estira', 'Recoge'], trx_knee_tuck: ['Recoge', 'Estira'],
    trx_pike: ['Sube la cadera', 'Baja'], trx_rollout: ['Extiende', 'Vuelve'], trx_t_fly: ['Abre en T', 'Vuelve'],
    crunch: ['Sube', 'Baja'], lat_pulldown: ['Tira', 'Sube'], bt_close_pulldown: ['Tira', 'Sube'], bt_pec_deck: ['Junta', 'Abre'],
    bt_cable_crunch: ['Enrolla', 'Sube'], bt_straight_arm_pulldown: ['Baja en arco', 'Sube'], bt_overhead_triceps: ['Estira', 'Dobla'],
    bt_face_pull: ['Tira a la cara', 'Vuelve'], bt_woodchop_high: ['Corta en diagonal', 'Vuelve'], bt_low_woodchop: ['Sube en diagonal', 'Baja'],
    bt_front_raise: ['Sube', 'Baja'], bt_cable_squat: ['Baja', 'Sube'], bt_pull_through: ['Empuja la cadera', 'Atrás'], bt_one_arm_row: ['Tira', 'Estira'],
    bt_reverse_fly: ['Abre atrás', 'Vuelve'], bt_situp_rollers: ['Sube', 'Baja lento'], bt_kickback: ['Patea atrás', 'Vuelve'], bt_standing_leg_curl: ['Recoge', 'Baja'], bt_upright_row: ['Sube', 'Baja'], cable_row: ['Tira', 'Vuelve'], machine_chest_press: ['Empuja', 'Vuelve'],
    machine_shoulder_press: ['Empuja', 'Baja'], leg_extension: ['Estira', 'Baja'], leg_curl: ['Recoge', 'Baja'], triceps_pushdown: ['Empuja', 'Sube'],
    cable_curl: ['Sube', 'Baja'], db_curl: ['Sube', 'Baja'], db_row: ['Tira', 'Baja'], db_floor_press: ['Baja', 'Empuja'], db_rdl: ['Inclina', 'Sube'],
    db_shoulder_press: ['Empuja', 'Baja'], v_up: ['Cierra en V', 'Abre'], wall_walk: ['Sube por la pared', 'Baja'], step_up: ['Sube', 'Baja'],
    good_morning: ['Inclina', 'Sube'], sl_rdl: ['Inclina', 'Sube'], tuck_front_lever: ['Sube a horizontal', 'Baja'], clap_pushup: ['Empuja y palmada', 'Baja'], trx_assisted_pullup: ['Tira', 'Baja'], trx_body_saw: ['Atrás', 'Adelante'],
  };

  // ---------- Formas ----------
  const f1 = (v) => v.toFixed(1);
  const fp = (p) => f1(p[0]) + ',' + f1(p[1]);
  function arcPts(c, r, a0, a1, n = 7) {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
    return out;
  }
  // Segmento con volumen (cápsula que se afina de r1 a r2)
  function capsule(a, b, r1, r2) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const pts = [...arcPts(b, r2, ang - Math.PI / 2, ang + Math.PI / 2), ...arcPts(a, r1, ang + Math.PI / 2, ang + (3 * Math.PI) / 2)];
    return 'M' + pts.map(fp).join('L') + 'Z';
  }
  function smooth(pts) {
    const n = pts.length;
    let d = 'M' + fp(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + fp([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + fp([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + fp(p2);
    }
    return d + 'Z';
  }
  const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  const front = (u) => [-u[1], u[0]]; // normal hacia el pecho (la figura mira a la derecha)

  function torsoPath(H, S) {
    const u = unit(sub(S, H)), f = front(u), L = len(sub(S, H));
    const at = (k, off) => add(add(H, mul(u, L * k)), mul(f, off));
    return smooth([
      at(-0.16, -2), at(0.02, 9.5), at(0.38, 8.5), at(0.72, 11.5), at(0.94, 9.5), at(1.1, 2),
      at(0.98, -8.5), at(0.68, -10.5), at(0.36, -9), at(0.06, -12), at(-0.1, -9),
    ]);
  }
  const ellipseAt = (c, rx, ry, angDeg) => ({ c, rx, ry, ang: angDeg });

  function bodyShapes(s) {
    const u = unit(sub(s.S, s.hip)), f = front(u), L = len(sub(s.S, s.hip));
    const ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
    const tor = (k, off) => add(add(s.hip, mul(u, L * k)), mul(f, off));
    const shoe = (leg) => {
      const ank = leg[2];
      const toe = [ank[0] + 10, ank[1] + 1];
      if (ank[1] > G - 14) toe[1] = G - 2;
      return capsule(ank, toe, 4.6, 3.6);
    };
    const hu = unit(sub(s.head, s.S)), hf = front(hu), hAng = Math.atan2(hu[1], hu[0]);
    return {
      farArm: [capsule(s.af[0], s.af[1], 6, 5), capsule(s.af[1], s.af[2], 5, 4)],
      farHand: s.af[2],
      farLeg: [capsule(s.lf[0], s.lf[1], 8.6, 6.4), capsule(s.lf[1], s.lf[2], 6.4, 4.6)],
      farShoe: shoe(s.lf),
      torso: torsoPath(s.hip, s.S),
      neck: capsule(s.S, add(s.S, mul(hu, 9)), 5, 4.5),
      head: s.head,
      hair: 'M' + [...arcPts(s.head, 11, hAng + 0.45, hAng - 2.2, 9)].map(fp).join('L') + 'Z',
      eye: add(add(s.head, mul(hf, 5.5)), mul(hu, 1.5)),
      nearLeg: [capsule(s.ln[0], s.ln[1], 9, 6.6), capsule(s.ln[1], s.ln[2], 6.6, 4.8)],
      nearShoe: shoe(s.ln),
      nearArm: [capsule(s.an[0], s.an[1], 6.4, 5.2), capsule(s.an[1], s.an[2], 5.2, 4.2)],
      nearHand: s.an[2],
      m: {
        ua: capsule(s.an[0], s.an[1], 5, 4.2), fa: capsule(s.an[1], s.an[2], 4.2, 3.4),
        thigh: capsule(s.ln[0], s.ln[1], 7.4, 5.4), shin: capsule(add(s.ln[1], mul(unit(sub(s.ln[2], s.ln[1])), 6)), s.ln[2], 5.4, 3.6),
        chest: ellipseAt(tor(0.74, 5), 8, 5.5, ang), abs: ellipseAt(tor(0.4, 4.5), 10, 4.2, ang),
        back: ellipseAt(tor(0.62, -5.5), 11, 4.8, ang), glute: ellipseAt(tor(0.04, -6), 7.5, 6.5, ang),
        shoulder: ellipseAt(add(s.S, mul(f, 1)), 6.5, 6, ang),
      },
    };
  }

  // ---------- Dibujo ----------
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  function drawProps(g, spec) {
    const dyn = [];
    for (const p of spec.props || []) {
      if (p.w === 'wall') el('rect', { x: p.x, y: -300, width: 10, height: G + 300, class: 'a-prop' }, g);
      else if (p.w === 'box') el('rect', { x: p.x, y: p.y, width: p.wd || 40, height: G - p.y, rx: 4, class: 'a-prop' }, g);
      else if (p.w === 'bar') {
        const x1 = p.x1 || 60, x2 = p.x2 || 180;
        el('line', { x1, x2: x1, y1: -300, y2: p.y, class: 'a-post' }, g);
        el('line', { x1: x2, x2, y1: -300, y2: p.y, class: 'a-post' }, g);
        el('line', { x1, x2, y1: p.y, y2: p.y, class: 'a-bar' }, g);
      } else if (p.w === 'pbar') {
        el('line', { x1: p.x, x2: p.x, y1: p.y, y2: G, class: 'a-post' }, g);
        el('line', { x1: p.x - 14, x2: p.x + 14, y1: p.y, y2: p.y, class: 'a-bar' }, g);
      } else if (p.w === 'table') {
        el('line', { x1: p.x1 + 6, x2: p.x1 + 6, y1: p.y, y2: G, class: 'a-post' }, g);
        el('line', { x1: p.x2 - 6, x2: p.x2 - 6, y1: p.y, y2: G, class: 'a-post' }, g);
        el('line', { x1: p.x1, x2: p.x2, y1: p.y, y2: p.y, class: 'a-bar' }, g);
      } else if (p.w === 'door') {
        el('rect', { x: p.x, y: -300, width: 14, height: G + 300, class: 'a-prop' }, g);
        el('circle', { cx: p.x - 2, cy: 80, r: 3, class: 'a-knob' }, g);
      } else if (p.w === 'anchor') {
        el('rect', { x: p.x, y: p.y, width: 30, height: 6, rx: 2, class: 'a-prop' }, g);
      } else if (p.w === 'disc') {
        el('circle', { cx: p.c[0], cy: p.c[1], r: p.r, class: 'a-prop' }, g);
      } else if (p.w === 'seg') {
        el('line', { x1: p.a[0], y1: p.a[1], x2: p.b[0], y2: p.b[1], class: 'a-post', 'stroke-width': p.r ? p.r * 2 : 4 }, g);
      } else if (p.w === 'weight') {
        for (const to of p.to) dyn.push({ p: { to }, handle: el('rect', { width: p.pad ? 12 : 16, height: p.pad ? 12 : 7, rx: p.pad ? 6 : 2, class: p.pad ? 'a-pad' : 'a-db' }, g), w: p.pad ? 12 : 16, h: p.pad ? 12 : 7 });
      } else if (p.w === 'trx') {
        for (const to of p.to) {
          const line = el('line', { class: 'a-trx' }, g);
          const handle = el('rect', { width: 9, height: 6, rx: 2.5, class: 'a-trx-h' }, g);
          dyn.push({ p: { from: p.anchor, to }, line, handle });
        }
      } else if (p.w === 'strap') {
        const line = el('line', { class: p.band ? 'a-band' : 'a-strap' }, g);
        const ring = p.ring ? el('circle', { r: 6, class: 'a-ring' }, g) : null;
        dyn.push({ p, line, ring });
      }
    }
    return dyn;
  }

  let uid = 0;
  const PHASE_ICON = { down: '↓', up: '↑', fwd: '→', back: '←', hold: '⏸' };

  class Player {
    constructor(container, key, opts = {}) {
      this.spec = specFor(key);
      this.key = key;
      this.container = container;
      this.opts = opts;
      if (!this.spec) { container.classList.add('anim-none'); return; }
      this.tl = timeline(this.spec);
      this.offset = opts.offset || 0;
      this.detail = !!opts.detail;
      const h = this.spec.hint || {};
      this.hints = {
        en: h.en || h.e || [-1, 0.3], ef: h.ef || h.e || [-1, 0.3],
        kn: h.kn || h.k || [1, -0.25], kf: h.kf || h.k || [1, -0.25],
      };
      this.muscles = musclesFor(COND_IDS[key] || key, opts.pattern);
      this.id = 'a' + ++uid;

      const svg = el('svg', { viewBox: this.frame(), class: 'anim-svg', role: 'img', 'aria-label': opts.label || 'Animación del ejercicio' });
      const defs = el('defs', {}, svg);
      const lg = (id, c1, c2) => { const g = el('linearGradient', { id, x1: 0, x2: 0.3, y1: 0, y2: 1 }, defs); el('stop', { offset: 0, 'stop-color': c1 }, g); el('stop', { offset: 1, 'stop-color': c2 }, g); };
      lg(this.id + 'b', '#FFFFFF', '#D3DAE4');
      lg(this.id + 'f', '#C3CBD7', '#A2ADBC');
      lg(this.id + 'm', '#FFB37A', 'var(--accent)');
      const rg = el('radialGradient', { id: this.id + 'fl', cx: 0.5, cy: 0, r: 0.8 }, defs);
      el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0.1 }, rg);
      el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0 }, rg);

      if (this.spec.floor !== false) {
        el('rect', { x: -300, y: G, width: 840, height: 300, class: 'a-ground' }, svg);
        el('ellipse', { cx: 120, cy: G + 2, rx: 80, ry: 6, fill: `url(#${this.id}fl)` }, svg);
        el('line', { x1: -300, x2: 540, y1: G, y2: G, class: 'a-floor' }, svg);
      }
      const gp = el('g', {}, svg);
      this.dyn = drawProps(gp, this.spec);

      if (this.detail) this.drawGhosts(el('g', { class: 'a-ghosts' }, svg));

      // Capas: cada parte se dibuja contorno + relleno, de atrás hacia adelante
      const layer = (fill) => {
        const g = el('g', {}, svg);
        return { g, o: el('g', { class: 'a-outline' }, g), f: el('g', { fill }, g) };
      };
      const B = `url(#${this.id}b)`, F = `url(#${this.id}f)`;
      this.L = {
        farArm: layer(F), farLeg: layer(F), torso: layer(B), nearLeg: layer(B), nearArm: layer(B),
      };
      const pair = (Lr, n) => Array.from({ length: n }, () => [el('path', {}, Lr.o), el('path', {}, Lr.f)]);
      this.P = {
        farArm: pair(this.L.farArm, 2), farHand: [el('circle', { r: 4.2 }, this.L.farArm.o), el('circle', { r: 4.2 }, this.L.farArm.f)],
        farLeg: pair(this.L.farLeg, 2), farShoe: el('path', { class: 'a-shoe far' }, this.L.farLeg.g),
        torso: pair(this.L.torso, 2), head: [el('circle', { r: 10.5 }, this.L.torso.o), el('circle', { r: 10.5 }, this.L.torso.f)],
        nearLeg: pair(this.L.nearLeg, 2), nearShoe: el('path', { class: 'a-shoe' }, this.L.nearLeg.g),
        nearArm: pair(this.L.nearArm, 2), nearHand: [el('circle', { r: 4.4 }, this.L.nearArm.o), el('circle', { r: 4.4 }, this.L.nearArm.f)],
      };
      this.hair = el('path', { class: 'a-hair' }, this.L.torso.g);
      this.eye = el('circle', { r: 1.6, class: 'a-eye' }, this.L.torso.g);

      // Músculos resaltados (encima de su parte del cuerpo)
      const mg = (Lr) => el('g', { class: 'a-muscle', fill: `url(#${this.id}m)` }, Lr.g);
      const host = { ua: 'nearArm', fa: 'nearArm', thigh: 'nearLeg', shin: 'nearLeg', chest: 'torso', abs: 'torso', back: 'torso', glute: 'torso', shoulder: 'torso' };
      this.M = this.muscles.map((m) => ({ m, node: ['ua', 'fa', 'thigh', 'shin'].includes(m) ? el('path', {}, mg(this.L[host[m]])) : el('ellipse', {}, mg(this.L[host[m]])) }));

      if (this.detail) {
        this.arrow = el('path', { class: 'a-arrow' }, svg);
        this.main = this.mainJoint();
        const hud = document.createElement('div');
        hud.className = 'anim-hud';
        hud.innerHTML = '<span class="hud-phase"></span><span class="hud-rep"></span>';
        this.hud = { phase: hud.children[0], rep: hud.children[1] };
        this.cueEl = document.createElement('div');
        this.cueEl.className = 'anim-cue';
        this.cues = (opts.cues || []).filter(Boolean);
        container.innerHTML = '';
        container.appendChild(svg);
        container.appendChild(hud);
        if (this.cues.length) container.appendChild(this.cueEl);
      } else {
        container.innerHTML = '';
        container.appendChild(svg);
      }
      this.svg = svg;
      this.draw(this.offset);
    }

    // Encuadre automático: recorre la animación y ajusta el viewBox a la figura (y a sus apoyos).
    frame() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const inc = (q, r = 0) => { x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r); y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r); };
      for (let i = 0; i < 24; i++) {
        const sk = skeleton(poseAt(this.spec, this.tl, (this.tl.total * i) / 24).pose, this.hints);
        [sk.hip, sk.S, ...sk.an, ...sk.af, ...sk.ln, ...sk.lf].forEach((q) => inc(q, 10));
        inc(sk.head, SEG.HEAD + 4);
        inc([sk.ln[2][0] + 14, sk.ln[2][1]]);
      }
      for (const p of this.spec.props || []) {
        if (p.w === 'box') { inc([p.x, p.y]); inc([p.x + (p.wd || 40), p.y]); }
        else if (p.w === 'bar' || p.w === 'table') inc([(x0 + x1) / 2, p.y - 4]);
        else if (p.w === 'pbar' && p.y > -40) inc([p.x, p.y - 4]);
        else if (p.w === 'wall' || p.w === 'door') { x0 = Math.min(x0, p.x - 4); x1 = Math.max(x1, p.x + 14); }
      }
      if (this.spec.floor !== false) y1 = Math.max(y1, G + 8);
      const R = 240 / 202;
      // En la vista detallada se deja aire arriba (fase y repeticiones) y abajo (consejo de técnica).
      const det = this.opts.detail;
      x0 -= det ? 20 : 12; x1 += det ? 20 : 12; y0 -= det ? 34 : 12; y1 += det ? (this.opts.cues?.length ? 46 : 14) : 4;
      let w = x1 - x0, hh = y1 - y0;
      if (w < 150) { x0 -= (150 - w) / 2; w = 150; }
      if (w / hh < R) { const nw = hh * R; x0 -= (nw - w) / 2; w = nw; }
      else { const nh = w / R; y0 -= nh - hh; hh = nh; }
      return `${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(hh)}`;
    }

    // Articulación que más se desplaza: se usa para la flecha y para decir si "sube" o "baja".
    mainJoint() {
      const a = skeleton(this.spec.poses[0], this.hints), b = skeleton(this.spec.poses[1] || this.spec.poses[0], this.hints);
      const cands = { hip: [a.hip, b.hip], S: [a.S, b.S], head: [a.head, b.head], hn: [a.an[2], b.an[2]], fn: [a.ln[2], b.ln[2]], ff: [a.lf[2], b.lf[2]] };
      let best = 'hip', dmax = -1;
      for (const [k, [p, q]] of Object.entries(cands)) { const d = len(sub(q, p)); if (d > dmax) { dmax = d; best = k; } }
      return { key: best, dist: dmax };
    }

    jointOf(sk, k) { return ({ hip: sk.hip, S: sk.S, head: sk.head, hn: sk.an[2], fn: sk.ln[2], ff: sk.lf[2] })[k]; }

    drawGhosts(g) {
      const n = Math.min(this.spec.poses.length, this.spec.cycle ? 1 : 2);
      for (let i = 0; i < n; i++) {
        const sh = bodyShapes(skeleton(this.spec.poses[i], this.hints));
        const d = [...sh.farArm, ...sh.farLeg, sh.torso, ...sh.nearLeg, ...sh.nearArm].join(' ');
        el('path', { d, class: 'a-ghost' }, g);
        el('circle', { cx: sh.head[0], cy: sh.head[1], r: 10.5, class: 'a-ghost' }, g);
      }
    }

    setPair(pr, d) { pr[0].setAttribute('d', d); pr[1].setAttribute('d', d); }
    setCirc(pr, c) { for (const n of pr) { n.setAttribute('cx', f1(c[0])); n.setAttribute('cy', f1(c[1])); } }

    draw(time) {
      if (!this.spec) return;
      const st = poseAt(this.spec, this.tl, time);
      const s = skeleton(st.pose, this.hints);
      const sh = bodyShapes(s);
      const P = this.P;
      sh.farArm.forEach((d, i) => this.setPair(P.farArm[i], d)); this.setCirc(P.farHand, sh.farHand);
      sh.farLeg.forEach((d, i) => this.setPair(P.farLeg[i], d)); P.farShoe.setAttribute('d', sh.farShoe);
      this.setPair(P.torso[0], sh.torso); this.setPair(P.torso[1], sh.neck); this.setCirc(P.head, sh.head);
      this.hair.setAttribute('d', sh.hair);
      this.eye.setAttribute('cx', f1(sh.eye[0])); this.eye.setAttribute('cy', f1(sh.eye[1]));
      sh.nearLeg.forEach((d, i) => this.setPair(P.nearLeg[i], d)); P.nearShoe.setAttribute('d', sh.nearShoe);
      sh.nearArm.forEach((d, i) => this.setPair(P.nearArm[i], d)); this.setCirc(P.nearHand, sh.nearHand);

      const pulse = 0.55 + 0.35 * Math.sin(time * 5);
      for (const { m, node } of this.M) {
        const v = sh.m[m];
        if (typeof v === 'string') node.setAttribute('d', v);
        else {
          node.setAttribute('cx', f1(v.c[0])); node.setAttribute('cy', f1(v.c[1]));
          node.setAttribute('rx', v.rx); node.setAttribute('ry', v.ry);
          node.setAttribute('transform', `rotate(${f1(v.ang)} ${f1(v.c[0])} ${f1(v.c[1])})`);
        }
        node.parentNode.setAttribute('opacity', f1(pulse));
      }

      for (const d of this.dyn) {
        const to = typeof d.p.to === 'string' ? ({ hn: s.an[2], hf: s.af[2], fn: s.ln[2], ff: s.lf[2] })[d.p.to] : d.p.to;
        if (d.line) {
          d.line.setAttribute('x1', d.p.from[0]); d.line.setAttribute('y1', d.p.from[1]);
          d.line.setAttribute('x2', f1(to[0])); d.line.setAttribute('y2', f1(to[1]));
        }
        if (d.ring) { d.ring.setAttribute('cx', f1(to[0])); d.ring.setAttribute('cy', f1(to[1])); }
        if (d.handle) { d.handle.setAttribute('x', f1(to[0] - (d.w || 9) / 2)); d.handle.setAttribute('y', f1(to[1] - (d.h || 6) / 2)); }
      }
      if (this.detail) this.drawHud(st, time);
    }

    drawHud(st, time) {
      const spec = this.spec;
      const rep = Math.floor(time / this.tl.total) + 1;
      let phaseTxt, dirKey = 'hold';
      if (spec.hold) {
        phaseTxt = 'Mantén la posición';
        this.hud.rep.textContent = `${Math.floor(time % 60)} s`;
      } else if (spec.cycle) {
        phaseTxt = 'Ritmo constante';
        this.hud.rep.textContent = `Rep ${rep}`;
      } else {
        const s = st.step;
        const labels = PHASES[this.key];
        const a = skeleton(spec.poses[s.a], this.hints), b = skeleton(spec.poses[s.b], this.hints);
        const v = sub(this.jointOf(b, this.main.key), this.jointOf(a, this.main.key));
        dirKey = Math.abs(v[1]) >= Math.abs(v[0]) * 0.6 ? (v[1] > 0 ? 'down' : 'up') : (v[0] > 0 ? 'fwd' : 'back');
        const auto = { down: 'Baja', up: 'Sube', fwd: 'Lleva adelante', back: 'Lleva atrás' }[dirKey];
        phaseTxt = (labels ? labels[s.n] : auto) + ` · ${s.d < 1.5 ? s.d.toFixed(1).replace('.0', '') : Math.round(s.d)} s`;
        if (!st.moving) { phaseTxt = st.step.h > 0.8 ? 'Pausa' : phaseTxt; }
        this.hud.rep.textContent = `Rep ${rep}`;
        // Flecha de dirección junto a la articulación principal
        if (st.moving && this.main.dist > 8) {
          const now = this.jointOf(skeleton(st.pose, this.hints), this.main.key);
          const u = unit(v), n = [-u[1], u[0]];
          const side = n[0] > 0 || (n[0] === 0 && n[1] < 0) ? 1 : -1;
          const base = add(now, mul(n, 22 * side));
          const tip = add(base, mul(u, 16)), tail = sub(base, mul(u, 12));
          const w1 = add(sub(tip, mul(u, 7)), mul(n, 5)), w2 = sub(sub(tip, mul(u, 7)), mul(n, 5));
          this.arrow.setAttribute('d', `M${fp(tail)}L${fp(tip)}M${fp(w1)}L${fp(tip)}L${fp(w2)}`);
          this.arrow.setAttribute('opacity', f1(Math.sin(Math.PI * st.k)));
        } else this.arrow.setAttribute('opacity', 0);
      }
      const txt = `${PHASE_ICON[spec.hold || spec.cycle ? 'hold' : dirKey] || ''} ${phaseTxt}`;
      if (this.hud.phase.textContent !== txt) this.hud.phase.textContent = txt;
      if (this.cues.length) {
        const per = spec.hold ? 4 : Math.max(3, this.tl.total);
        const i = Math.floor(time / per) % this.cues.length;
        if (this.cueIdx !== i) { this.cueIdx = i; this.cueEl.textContent = '💡 ' + this.cues[i]; this.cueEl.classList.remove('in'); void this.cueEl.offsetWidth; this.cueEl.classList.add('in'); }
      }
    }
  }

  // Movimiento sin dibujo: lo usa el renderizador 3D (js/anim3d.js) con las mismas posturas.
  class Driver {
    constructor(key, opts = {}) {
      this.key = key;
      this.opts = opts;
      this.spec = specFor(key);
      if (!this.spec) return;
      this.tl = timeline(this.spec);
      const h = this.spec.hint || {};
      this.hints = {
        en: h.en || h.e || [-1, 0.3], ef: h.ef || h.e || [-1, 0.3],
        kn: h.kn || h.k || [1, -0.25], kf: h.kf || h.k || [1, -0.25],
      };
      this.muscles = musclesFor(COND_IDS[key] || key, opts.pattern);
      this.main = Player.prototype.mainJoint.call(this);
    }
    at(time) { const st = poseAt(this.spec, this.tl, time); return { st, s: skeleton(st.pose, this.hints) }; }
    frameBox() { const [x0, y0, w, h] = Player.prototype.frame.call(this).split(' ').map(Number); return { x0, y0, w, h }; }
    // Postura más representativa para una imagen fija
    keyTime() { const s0 = this.tl.steps[0]; return this.spec.hold || this.spec.cycle ? 0.4 : s0.h + s0.d + 0.05; }
    hud(st, time) {
      const spec = this.spec;
      const rep = Math.floor(time / this.tl.total) + 1;
      if (spec.hold) return { phase: '⏸ Mantén la posición', rep: `${Math.floor(time % 60)} s` };
      if (spec.cycle) return { phase: '⏸ Ritmo constante', rep: `Rep ${rep}` };
      const s = st.step;
      const a = skeleton(spec.poses[s.a], this.hints), b = skeleton(spec.poses[s.b], this.hints);
      const J = Player.prototype.jointOf;
      const v = sub(J(b, this.main.key), J(a, this.main.key));
      const dirKey = Math.abs(v[1]) >= Math.abs(v[0]) * 0.6 ? (v[1] > 0 ? 'down' : 'up') : (v[0] > 0 ? 'fwd' : 'back');
      const auto = { down: 'Baja', up: 'Sube', fwd: 'Lleva adelante', back: 'Lleva atrás' }[dirKey];
      const labels = PHASES[this.key];
      let txt = (labels ? labels[s.n] : auto) + ` · ${s.d < 1.5 ? s.d.toFixed(1).replace('.0', '') : Math.round(s.d)} s`;
      if (!st.moving && s.h > 0.8) txt = 'Pausa';
      return { phase: `${PHASE_ICON[dirKey]} ${txt}`, rep: `Rep ${rep}` };
    }
  }

  // Un solo bucle para todas las animaciones visibles
  const active = new Set();
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = null;
  const t0 = performance.now();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const pl = e.target.__player;
      if (!pl || pl.opts.static) continue;
      if (e.isIntersecting) active.add(pl); else active.delete(pl);
    }
    loop();
  }) : null;

  function loop() {
    if (raf || reduced) return;
    const tick = (now) => {
      raf = null;
      for (const pl of active) {
        if (!pl.container.isConnected) { active.delete(pl); io && io.unobserve(pl.container); pl.dispose && pl.dispose(); continue; }
        pl.draw((now - (pl.start ?? t0)) / 1000 + pl.offset);
      }
      if (active.size) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // Divide el texto de técnica en frases cortas para mostrarlas una a una
  const splitCues = (txt) => String(txt || '').split(/\.\s+/).map((s) => s.trim().replace(/\.$/, '')).filter((s) => s.length > 3);

  // Registra un reproductor (2D o 3D) en el bucle compartido
  function track(container, pl) {
    container.__player = pl;
    if (pl.opts.detail) pl.start = performance.now();
    if (pl.opts.static) return pl;
    if (io) io.observe(container); else { active.add(pl); loop(); }
    return pl;
  }

  function unmount(container) {
    const pl = container.__player;
    if (!pl) return;
    active.delete(pl);
    if (io) io.unobserve(container);
    if (pl.dispose) pl.dispose();
    container.__player = null;
  }

  function mount(container, key, opts = {}) {
    const R3 = window.ExerciseAnim3D;
    if (R3 && R3.ready && !opts.force2d && specFor(key)) {
      const p3 = R3.mount(container, key, opts);
      if (p3) return track(container, p3);
    }
    const pl = new Player(container, key, opts);
    if (!pl.spec) return pl;
    container.__player = pl;
    if (opts.detail) pl.start = performance.now();
    if (opts.static) { pl.draw(pl.tl.total * 0.3); return pl; }
    if (io) io.observe(container); else { active.add(pl); loop(); }
    return pl;
  }

  // Monta todos los elementos con data-anim dentro de root (force: vuelve a montarlos, p. ej. al cargar el 3D)
  function mountAll(root, force = false) {
    root.querySelectorAll('[data-anim]').forEach((n, i) => {
      if (n.__player && !force) return;
      if (force) unmount(n);
      mount(n, n.dataset.anim, {
        offset: n.dataset.detail ? 0 : i * 0.37, label: n.dataset.label, detail: !!n.dataset.detail,
        static: !!n.dataset.static, pattern: n.dataset.pattern, cues: n.dataset.cues ? splitCues(n.dataset.cues) : [],
      });
    });
  }

  window.ExerciseAnim = {
    mount, mountAll, splitCues, has: (k) => !!specFor(k), keys: () => Object.keys(LIB),
    remountAll: () => mountAll(document, true),
    _core: { Driver, G, SEG, track, loop },
    _poseCount: (k) => specFor(k)?.poses.length,
    _drawAt: (c, k, i) => { const pl = new Player(c, k); if (pl.spec) { pl.tl = { steps: [{ a: i, b: i, d: 1, h: 1, n: 0 }], total: 2 }; pl.draw(0); } return pl; },
  };
})();
