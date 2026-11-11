// Animaciones 3D: un maniquí humano con esqueleto (modelo glTF) movido con las mismas posturas que el 2D.
// - La vista detallada (modal, modo guiado, inicio) se anima en tiempo real.
// - Las miniaturas son imágenes 3D fijas generadas una vez con un único renderizador compartido.
// Si WebGL o el modelo no están disponibles, la app sigue usando las animaciones 2D.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const EA = window.ExerciseAnim;
const { Driver, G } = EA._core;
const css = getComputedStyle(document.documentElement);
const ACCENT = new THREE.Color((css.getPropertyValue('--accent') || '#F26B1D').trim());
const R3 = { ready: false, mount };
// En teléfonos se baja un poco la resolución y la calidad de sombras para que todo vaya fluido
const MOBILE = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
window.ExerciseAnim3D = R3;

let base = null;

// ---------- Reglas de músculos sobre la malla (pesos de los huesos + orientación) ----------
const MUSCLE_RULES = {
  ua: { bones: ['RightArm', 'LeftArm'] },
  fa: { bones: ['RightForeArm', 'LeftForeArm'] },
  shoulder: { bones: ['RightShoulder', 'LeftShoulder'], extra: { bones: ['RightArm', 'LeftArm'], k: 0.35 } },
  thigh: { bones: ['RightUpLeg', 'LeftUpLeg'] },
  shin: { bones: ['RightLeg', 'LeftLeg'] },
  chest: { bones: ['Spine2'], side: 'front' },
  abs: { bones: ['Spine', 'Spine1'], side: 'front' },
  back: { bones: ['Spine1', 'Spine2'], side: 'back' },
  glute: { bones: ['Hips'], side: 'back' },
};

// Traduce el nombre de un hueso (Mixamo, Unity/Quaternius, Blender, VRM…) al nombre Mixamo sin prefijo.
const CORE = [
  [/headtop|head_?end|headend/, 'HeadTop_End'], [/^head$/, 'Head'], [/neck/, 'Neck'],
  [/upperchest|spine2|spine_?03/, 'Spine2'], [/chest|spine1|spine_?02/, 'Spine1'], [/^spine0?$|spine_?01/, 'Spine'],
  [/hips|pelvis/, 'Hips'], [/middle_?(1|01|proximal)|handmiddle1/, 'HandMiddle1'],
  [/shoulder|clavicle/, 'Shoulder'], [/forearm|lowerarm|lower_arm|elbow/, 'ForeArm'], [/upperarm|upper_arm|^arm$/, 'Arm'],
  [/^hand$/, 'Hand'], [/upleg|upperleg|upper_leg|thigh/, 'UpLeg'], [/lowerleg|lower_leg|calf|shin|knee|^leg$/, 'Leg'],
  [/^foot$|ankle/, 'Foot'], [/toebase|^toes?$|ball/, 'ToeBase'],
];
export function canonBone(name) {
  let n = String(name).replace(/^mixamorig\d*[:_]?/i, '').replace(/^(armature|root|def|org|cc_base|j_bip_[clr]|bip0?1|character\d*)[\s_\-.:]*/i, '');
  let side = /^j_bip_l_/i.test(String(name)) ? 'Left' : /^j_bip_r_/i.test(String(name)) ? 'Right' : '';
  if (/^left|left$|[_.\s-]l$|^l[_.]/i.test(n) || /Left/.test(n)) side = 'Left';
  if (/^right|right$|[_.\s-]r$|^r[_.]/i.test(n) || /Right/.test(n)) side = 'Right';
  const core = n.replace(/left|right/ig, '').replace(/^[lr][_.]|[_.\s-][lr]$/i, '').replace(/[\s.\-]/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  if (/end/.test(core) && !/head/.test(core)) return n;
  for (const [re, canon] of CORE) {
    if (re.test(core)) {
      if (canon === 'HandMiddle1' && !side) return n;
      return (['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End'].includes(canon) ? '' : side) + canon;
    }
  }
  return n;
}
const REQUIRED = ['Hips', 'Neck', 'Head', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftUpLeg', 'LeftLeg', 'LeftFoot'];
export function missingBones(scene) {
  const found = new Set();
  scene.traverse((o) => { if (o.isBone) found.add(canonBone(o.name)); });
  return REQUIRED.filter((b) => !found.has(b));
}

// Lee el componente c (x, y, z, w) de un atributo, sea normal o intercalado (interleaved)
const comp = (attr, i, c) => (c === 0 ? attr.getX(i) : c === 1 ? attr.getY(i) : c === 2 ? attr.getZ(i) : attr.getW(i));

function muscleAttribute(mesh, muscles) {
  const g = mesh.geometry;
  const n = g.attributes.position.count;
  const arr = new Float32Array(n);
  if (muscles.length && g.attributes.skinIndex && g.attributes.skinWeight && g.attributes.normal) {
    const names = mesh.skeleton.bones.map((b) => canonBone(b.name));
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, nor = g.attributes.normal;
    const rules = muscles.map((m) => MUSCLE_RULES[m]).filter(Boolean);
    const weightOf = (i, bones) => {
      let w = 0;
      for (let c = 0; c < 4; c++) if (bones.includes(names[comp(si, i, c)])) w += comp(sw, i, c);
      return w;
    };
    for (let i = 0; i < n; i++) {
      let m = 0;
      const nz = nor.getZ(i);
      for (const r of rules) {
        let w = weightOf(i, r.bones);
        if (r.extra) w = Math.max(w, weightOf(i, r.extra.bones) * r.extra.k);
        if (r.side === 'front') w *= THREE.MathUtils.smoothstep(nz, 0.05, 0.5);
        if (r.side === 'back') w *= THREE.MathUtils.smoothstep(-nz, 0.05, 0.5);
        m = Math.max(m, w);
      }
      arr[i] = THREE.MathUtils.smoothstep(m, 0.25, 0.8);
    }
  }
  g.setAttribute('aMuscle', new THREE.BufferAttribute(arr, 1));
}

// Material del cuerpo con el resaltado de músculos. Si el personaje trae texturas (piel, ropa), se conservan.
function bodyMaterial(dark, orig) {
  const mat = orig && orig.map
    ? new THREE.MeshStandardMaterial({
      map: orig.map, normalMap: orig.normalMap || null, color: orig.color ? orig.color.clone() : 0xffffff, roughness: 0.62, metalness: 0,
      transparent: !!orig.transparent, alphaTest: orig.alphaTest || 0, side: orig.side, opacity: orig.opacity ?? 1,
    })
    : new THREE.MeshStandardMaterial({ color: dark ? 0xDCE2EA : 0xEEF1F5, roughness: 0.42, metalness: 0.05 });
  mat.userData.strength = orig && orig.map ? 0.55 : 1;
  mat.userData.pulse = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPulse = mat.userData.pulse;
    sh.uniforms.uAccent = { value: ACCENT };
    sh.vertexShader = 'attribute float aMuscle;\nvarying float vMuscle;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vMuscle = aMuscle;');
    sh.fragmentShader = 'varying float vMuscle;\nuniform float uPulse;\nuniform vec3 uAccent;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, clamp(vMuscle, 0.0, 1.0) * uPulse * ' + mat.userData.strength.toFixed(2) + ');');
  };
  return mat;
}

// ---------- Rig: un modelo posable ----------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();

class Rig {
  constructor(dark) {
    this.root = SkeletonUtils.clone(base.scene);
    this.root.rotation.y = Math.PI / 2; // el modelo mira a +X; su lado derecho queda hacia la cámara
    this.b = {};
    this.meshes = [];
    this.root.traverse((o) => {
      if (o.isBone) { const c = canonBone(o.name); if (!this.b[c]) this.b[c] = o; }
      if (o.isSkinnedMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
        o.geometry = o.geometry.clone();
        this.meshes.push(o);
      }
    });
    for (const m of this.meshes) {
      const joints = /Joints/i.test(m.material.name);
      m.material = joints ? new THREE.MeshStandardMaterial({ color: 0x2B303B, roughness: 0.35, metalness: 0.2 }) : bodyMaterial(dark, m.material);
      m.userData.body = !joints;
    }
    this.root.updateMatrixWorld(true);
    // Puntos auxiliares si el esqueleto no trae punta de cabeza o dedos del pie
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    const helper = (parent, worldPos) => { const h = new THREE.Object3D(); parent.add(h); h.position.copy(parent.worldToLocal(worldPos)); h.updateMatrixWorld(true); return h; };
    if (!this.b.HeadTop_End) this.b.HeadTop_End = helper(this.b.Head, wp(this.b.Head).add(wp(this.b.Head).sub(wp(this.b.Neck)).multiplyScalar(1.1)));
    const legLen = wp(this.b.RightUpLeg).distanceTo(wp(this.b.RightFoot));
    for (const sd of ['Right', 'Left']) {
      if (!this.b[sd + 'ToeBase']) this.b[sd + 'ToeBase'] = helper(this.b[sd + 'Foot'], wp(this.b[sd + 'Foot']).add(new THREE.Vector3(legLen * 0.16, -legLen * 0.05, 0)));
    }
    this.rest = new Map();
    this.root.traverse((o) => { if (o.isBone) this.rest.set(o, o.quaternion.clone()); });
    this.hands = { hn: this.setupHand('Right'), hf: this.setupHand('Left') };
    this.hipsRestPos = this.b.Hips.position.clone();
    this.root.updateMatrixWorld(true);
    const w = (n) => this.b[n].getWorldPosition(new THREE.Vector3());
    this.len = {
      ua: w('RightArm').distanceTo(w('RightForeArm')), fa: w('RightForeArm').distanceTo(w('RightHand')),
      th: w('RightUpLeg').distanceTo(w('RightLeg')), sh: w('RightLeg').distanceTo(w('RightFoot')),
    };
    this.k = (this.len.th + this.len.sh) / 76; // unidades 2D → metros
    this.off = w('RightFoot').y - 2 * this.k;  // el tobillo 2D queda 2 unidades sobre el suelo
    this.muscleKey = null;
  }

  // Dedos: cada hijo de la mano es la base de un dedo; se recorre hasta la punta.
  setupHand(side) {
    const hand = this.b[side + 'Hand'], fore = this.b[side + 'ForeArm'];
    if (!hand) return null;
    const chains = [];
    for (const c of hand.children) {
      if (!c.isBone) continue;
      const bones = [];
      let cur = c;
      while (cur) { bones.push(cur); cur = cur.children.find((x) => x.isBone); }
      chains.push({ bones, name: c.name.toLowerCase(), thumb: /thumb/i.test(c.name) });
    }
    const find = (re) => (chains.find((c) => re.test(c.name)) || {}).bones?.[0];
    const mid = find(/middle/) || chains.find((c) => !c.thumb)?.bones[0];
    const idx = find(/index/) || mid, pky = find(/pinky|little/) || find(/ring/) || mid;
    if (!mid) return null;
    const h = { hand, fore, chains, mid, idx, pky, sign: 1 };
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    h.len = wp(hand).distanceTo(wp(mid));
    // En reposo (pose en T) la palma mira hacia abajo y algo hacia el cuerpo: así se fija el signo de la normal
    const n = this.palm(h).n;
    const inward = new THREE.Vector3(0, 0, -Math.sign(wp(hand).z || 1));
    if (n.dot(new THREE.Vector3(0, -1, 0).add(inward.multiplyScalar(0.4))) < 0) h.sign = -1;
    return h;
  }

  // Normal de la palma (hacia donde mira) y dirección muñeca→nudillos
  palm(h) {
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    const hp = wp(h.hand);
    const along = wp(h.mid).sub(hp).normalize();
    const across = wp(h.idx).sub(wp(h.pky));
    if (across.lengthSq() < 1e-8) across.set(0, 0, 1);
    const n = across.clone().cross(along).normalize().multiplyScalar(h.sign);
    return { n, along, across: across.normalize(), p: hp };
  }

  // Gira un hueso alrededor de un eje del mundo
  rotateWorld(bone, axis, ang) {
    if (!ang || axis.lengthSq() < 1e-10) return;
    const q = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), ang);
    const wq = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pq.multiply(wq));
    bone.updateMatrixWorld(true);
  }

  // Gira el antebrazo sobre su eje (pronación/supinación) para que la palma mire hacia `want`
  twist(h, want) {
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    const axis = wp(h.hand).sub(wp(h.fore)).normalize();
    const n = this.palm(h).n;
    const a = n.clone().sub(axis.clone().multiplyScalar(n.dot(axis)));
    const b = want.clone().sub(axis.clone().multiplyScalar(want.dot(axis)));
    if (a.lengthSq() < 1e-6 || b.lengthSq() < 1e-6) return;
    a.normalize(); b.normalize();
    const ang = Math.atan2(a.clone().cross(b).dot(axis), a.dot(b));
    this.rotateWorld(h.fore, axis, ang);
  }

  // Dobla los dedos hacia la palma (ángulos en radianes por falange)
  curl(h, fingers, thumb) {
    const n = this.palm(h).n;
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    for (const c of h.chains) {
      const angs = c.thumb ? thumb : fingers;
      for (let i = 0; i < c.bones.length - 1 && i < angs.length; i++) {
        const dir = wp(c.bones[i + 1]).sub(wp(c.bones[i])).normalize();
        this.rotateWorld(c.bones[i], dir.clone().cross(n), angs[i]);
      }
    }
  }

  // Centro del puño: ahí se colocan barras, manillas y mancuernas
  grip(name) {
    const h = this.hands[name];
    if (!h) return null;
    const { n, along, across, p } = this.palm(h);
    return { p: p.add(along.multiplyScalar(h.len * 0.85)).add(n.multiplyScalar(h.len * 0.3)), across };
  }

  M(p, z = 0) { return new THREE.Vector3((p[0] - 120) * this.k, (G - p[1]) * this.k + this.off, z); }

  setMuscles(list) {
    const key = list.join(',');
    if (key === this.muscleKey) return;
    this.muscleKey = key;
    for (const m of this.meshes) if (m.userData.body) muscleAttribute(m, list);
  }
  setPulse(v) { for (const m of this.meshes) if (m.userData.body) m.material.userData.pulse.value = v; }

  // Gira un hueso para que la dirección hueso→hijo apunte a `dir` (en coordenadas del mundo)
  aim(bone, child, dir) {
    if (dir.lengthSq() < 1e-10) return;
    const bp = bone.getWorldPosition(tmpV), cp = child.getWorldPosition(tmpV2);
    const cur = cp.sub(bp).normalize();
    const q = tmpQ.setFromUnitVectors(cur, dir.clone().normalize());
    const wq = bone.getWorldQuaternion(tmpQ2).premultiply(q);
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pq.multiply(wq));
    bone.updateMatrixWorld(true);
  }

  // Dos huesos de A hacia T, doblando hacia el punto H (codo/rodilla del 2D)
  ik(A, T, l1, l2, H) {
    const v = T.clone().sub(A);
    let d = v.length();
    const max = l1 + l2 - 1e-4;
    if (d > max) { v.setLength(max); d = max; }
    d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
    const u = v.clone().normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const w = H.clone().sub(A);
    w.sub(u.clone().multiplyScalar(w.dot(u)));
    if (w.lengthSq() < 1e-10) w.set(0, 0, 1).cross(u);
    w.normalize();
    return A.clone().add(u.clone().multiplyScalar(a)).add(w.multiplyScalar(h));
  }

  pose(s, hands = {}) {
    for (const [bone, q] of this.rest) bone.quaternion.copy(q);
    this.b.Hips.position.copy(this.hipsRestPos);
    this.root.updateMatrixWorld(true);
    const B = this.b;

    // Cadera y tronco (rígido): la cadera se coloca en su sitio y el tronco apunta al hombro 2D
    const hipW = this.M(s.hip);
    B.Hips.position.copy(B.Hips.parent.worldToLocal(hipW.clone()));
    B.Hips.updateMatrixWorld(true);
    this.aim(B.Hips, B.Neck, this.M(s.S).sub(this.M(s.hip)));
    // La articulación de la cadera del modelo está algo más abajo que el hueso Hips: se corrige para que coincida con el 2D
    const mid = B.RightUpLeg.getWorldPosition(new THREE.Vector3()).add(B.LeftUpLeg.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
    const fix = hipW.clone().sub(mid);
    B.Hips.position.copy(B.Hips.parent.worldToLocal(B.Hips.getWorldPosition(new THREE.Vector3()).add(fix)));
    B.Hips.updateMatrixWorld(true);
    this.aim(B.Neck, B.HeadTop_End, this.M(s.head).sub(this.M(s.S)));

    // Brazos y piernas con cinemática inversa en el plano de cada articulación
    const limb = (root, mid, end, l1, l2, j2d, arm, hs, leg) => {
      const A = root.getWorldPosition(new THREE.Vector3());
      const T = this.M(j2d[2], A.z), H = this.M(j2d[1], A.z);
      if (leg) {
        // Pie en el suelo: un poco más abierto que la cadera. Rodilla: apunta hacia la línea del pie con un leve "afuera",
        // y el punto de referencia se aleja de la línea cadera-tobillo para que la rodilla nunca se doble hacia un lado.
        const out = Math.sign(A.z || 1);
        const onFloor = j2d[2][1] > G - 14;
        if (onFloor) T.z = A.z * 1.3;
        const bend = Math.max(0, 1 - A.distanceTo(T) / (l1 + l2));
        H.z = T.z + out * (0.02 + bend * 0.12);
        const mid2 = A.clone().lerp(T, 0.5), away = H.clone().sub(mid2);
        H.copy(mid2.add(away.multiplyScalar(3)));
      }
      // Brazos por encima de la cabeza: agarre más abierto que los hombros (como en una barra real)
      if (arm && T.y > A.y + 0.12) { T.z = A.z * 1.7; H.z = A.z * 1.5; }
      // Si la mano agarra algo, la muñeca queda un poco antes para que el objeto quede dentro del puño
      if (hs && hs.state === 'grip' && hs.len) T.sub(T.clone().sub(H).setZ(0).normalize().multiplyScalar(hs.len * 0.85));
      const E = this.ik(A, T, l1, l2, H);
      this.aim(root, mid, E.clone().sub(A));
      this.aim(mid, end, T.clone().sub(E));
    };
    const hsOf = (k) => ({ ...(hands[k] || { state: 'relaxed', type: 'neutral' }), len: this.hands[k]?.len });
    this.hangLift = null;
    if (hands.hang) {
      let need = 0;
      const dirs = [];
      for (const [k, root, j] of [['hn', B.RightArm, s.an], ['hf', B.LeftArm, s.af]]) {
        const A = root.getWorldPosition(new THREE.Vector3());
        const T = this.M(j[2], A.z);
        if (T.y > A.y + 0.12) T.z = A.z * 1.7;
        const reach = this.len.ua + this.len.fa + (this.hands[k]?.len || 0) * 0.85;
        const d = A.distanceTo(T) - reach * 0.985;
        if (d > need) need = d;
        dirs.push(T.sub(A).normalize());
      }
      if (need > 0) {
        const dir = dirs[0].add(dirs[1]).normalize();
        this.hangLift = dir.multiplyScalar(need);
        B.Hips.position.copy(B.Hips.parent.worldToLocal(B.Hips.getWorldPosition(new THREE.Vector3()).add(this.hangLift)));
        B.Hips.updateMatrixWorld(true);
      }
    }
    limb(B.RightArm, B.RightForeArm, B.RightHand, this.len.ua, this.len.fa, s.an, true, hsOf('hn'));
    limb(B.LeftArm, B.LeftForeArm, B.LeftHand, this.len.ua, this.len.fa, s.af, true, hsOf('hf'));
    const lift = this.hangLift || new THREE.Vector3();
    const legPts = (pts) => (lift.lengthSq() ? pts.map((q) => [q[0] + lift.x / this.k, q[1] - lift.y / this.k]) : pts);
    limb(B.RightUpLeg, B.RightLeg, B.RightFoot, this.len.th, this.len.sh, legPts(s.ln), false, null, true);
    limb(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, this.len.th, this.len.sh, legPts(s.lf), false, null, true);

    // Manos: apoyadas (palma plana hacia abajo), agarrando (puño con la palma según el tipo de agarre) o relajadas
    for (const [k, arm, sh] of [['hn', s.an, B.RightArm], ['hf', s.af, B.LeftArm]]) {
      const h = this.hands[k];
      if (!h) continue;
      const hs = hsOf(k);
      const pressing = hs.state !== 'grip' && arm[2][1] > arm[1][1] + 6 && h.hand.getWorldPosition(tmpV).y < sh.getWorldPosition(tmpV2).y - 0.15;
      const f = new THREE.Vector3(arm[2][0] - arm[1][0], -(arm[2][1] - arm[1][1]), 0).normalize(); // antebrazo (codo→muñeca)
      const zSide = Math.sign(h.hand.getWorldPosition(tmpV).z || (k === 'hn' ? 1 : -1));
      const sup = new THREE.Vector3(-f.y, f.x, 0);
      if (sup.lengthSq() < 1e-6) sup.set(1, 0, 0);
      if (pressing) {
        this.twist(h, new THREE.Vector3(0, -1, 0));
        this.aim(h.hand, h.mid, new THREE.Vector3(1, -0.15, 0));
        this.curl(h, [0.05, 0.08, 0.05], [0, 0.05, 0]);
      } else if (hs.state === 'grip') {
        const want = hs.type === 'sup' ? sup : hs.type === 'pron' ? sup.clone().negate() : new THREE.Vector3(0, 0, -zSide);
        this.twist(h, want);
        this.curl(h, [1.25, 1.45, 1.0], [0.7, 0.8, 0.6]);
      } else {
        this.twist(h, new THREE.Vector3(0, 0, -zSide));
        this.curl(h, [0.3, 0.4, 0.3], [0.1, 0.2, 0.1]);
      }
    }

    // Pies: apoyados en el suelo si el tobillo está cerca, si no, siguiendo la pierna
    for (const [foot, toe, leg] of [[B.RightFoot, B.RightToeBase, s.ln], [B.LeftFoot, B.LeftToeBase, s.lf]]) {
      const ank = leg[2];
      const shin = [ank[0] - leg[1][0], ank[1] - leg[1][1]];
      let dir;
      const outZ = Math.sign(foot.getWorldPosition(tmpV).z || 1) * 0.27; // punta del pie ~15° hacia afuera
      if (ank[1] > G - 14 && Math.abs(shin[1]) > Math.abs(shin[0])) dir = new THREE.Vector3(1, -Math.max(0, (G - 2 - ank[1])) * 0.06, outZ);
      else if (shin[0] < -4 && Math.abs(shin[1]) < Math.abs(shin[0]) * 1.4) dir = new THREE.Vector3(shin[0], -shin[1], 0).normalize().add(new THREE.Vector3(0, -0.25, 0)); // empeine apoyado atrás (zancada, búlgara)
      else dir = new THREE.Vector3(shin[1] * 0.6 + 0.4, shin[0] * 0.6, outZ * 0.5); // pie perpendicular a la pierna, apuntando adelante
      this.aim(foot, toe, dir);
    }
  }

  jointWorld(name) {
    if (name === 'hn' || name === 'hf') { const g = this.grip(name); if (g) return g.p; }
    const bone = { hn: this.b.RightHand, hf: this.b.LeftHand, fn: this.b.RightFoot, ff: this.b.LeftFoot }[name];
    return bone.getWorldPosition(new THREE.Vector3());
  }
}

// ---------- Qué hace cada mano en un ejercicio ----------
// grip = agarra algo (barra, manilla, pesa, poste); type: 'pron' (palma adelante/abajo), 'sup' (palma hacia ti/arriba), 'neutral' (palmas enfrentadas)
const GRIP_TYPE = {
  chinup: 'sup', bt_close_pulldown: 'sup', cable_curl: 'sup', db_curl: 'sup', trx_biceps_curl: 'sup', bt_reverse_pushdown: 'sup',
  bt_reverse_curl: 'pron', db_shoulder_press: 'pron', bt_front_raise: 'pron', bt_upright_row: 'pron', triceps_pushdown: 'pron',
  machine_chest_press: 'neutral', bt_single_press: 'neutral', cable_row: 'neutral', bt_one_arm_row: 'neutral', bt_face_pull: 'pron',
};
function segDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]], ap = [p[0] - a[0], p[1] - a[1]];
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / ((ab[0] ** 2 + ab[1] ** 2) || 1)));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t);
}
function handStates(key, spec) {
  const out = {};
  for (const k of ['hn', 'hf']) {
    const pts = spec.poses.map((ps) => (k === 'hf' ? ps.hf || ps.hn : ps.hn));
    let type = null;
    for (const p of spec.props || []) {
      const to = p.w === 'trx' ? p.to : p.to ? (Array.isArray(p.to) ? p.to : [p.to]) : [];
      if ((p.w === 'strap' && !p.band && to.includes(k)) || (p.w === 'trx' && to.includes(k))) type = type || (p.w === 'trx' ? 'neutral' : 'pron');
      else if (p.w === 'weight' && !p.pad && to.includes(k)) type = type || 'neutral';
      else if ((p.w === 'bar' || p.w === 'table') && pts.some((q) => Math.abs(q[1] - p.y) < 9)) type = type || 'pron';
      else if (p.w === 'pbar' && pts.some((q) => (p.y > -40 ? Math.abs(q[1] - p.y) < 9 && Math.abs(q[0] - p.x) < 20 : Math.abs(q[0] - p.x) < 10))) type = type || 'neutral';
      else if (p.w === 'seg' && pts.some((q) => segDist(q, p.a, p.b) < 9)) type = type || (Math.abs(p.a[1] - p.b[1]) < Math.abs(p.a[0] - p.b[0]) ? 'pron' : 'neutral');
    }
    if (!type && GRIP_TYPE[key]) type = GRIP_TYPE[key]; // manillas de la máquina que no están dibujadas como objeto
    out[k] = type ? { state: 'grip', type: GRIP_TYPE[key] || type } : { state: 'relaxed', type: 'neutral' };
  }
  // Si la mano lejana sigue a la cercana (misma posición en el dibujo), hace lo mismo (p. ej. barra de jalón con dos manos)
  if (spec.poses.every((ps) => !ps.hf) && out.hn.state === 'grip') { out.hf = { ...out.hn }; out.sharedBar = true; }
  // Colgado de una barra por encima de la cabeza
  const bar = (spec.props || []).find((p) => p.w === 'bar');
  out.hang = !!(bar && out.hn.state === 'grip' && spec.poses.some((ps) => ps.hip[1] - ps.hn[1] > 70));
  return out;
}

// ---------- Apoyos en 3D ----------
const PROP = {
  wood: new THREE.MeshStandardMaterial({ color: 0xE6DCCB, roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x5B5F68, roughness: 0.35, metalness: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xD9CFBF, roughness: 0.9, transparent: true, opacity: 0.38, depthWrite: false }),
  door: new THREE.MeshStandardMaterial({ color: 0xCDBFA8, roughness: 0.8, transparent: true, opacity: 0.45, depthWrite: false }),
  strap: new THREE.MeshStandardMaterial({ color: 0x23262E, roughness: 0.7 }),
  band: new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.6 }),
  handle: new THREE.MeshStandardMaterial({ color: 0xF5C518, roughness: 0.5 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x2B303B, roughness: 0.6 }),
  plate: new THREE.MeshStandardMaterial({ color: 0x30343C, roughness: 0.45, metalness: 0.3 }),
};
// ---------- Multiestación de una torre (como la Bodytone de las fotos) ----------
const BT_MAT = {
  frame: new THREE.MeshStandardMaterial({ color: 0x2A2D33, roughness: 0.4, metalness: 0.5 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x1B1D22, roughness: 0.7 }),
  grayPad: new THREE.MeshStandardMaterial({ color: 0x62666E, roughness: 0.75 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xF26B1D, roughness: 0.6 }),
};
// Caja que va del punto a al punto b (en el plano del dibujo), con ancho a lo largo de z
function slab(a, b, width, thick, mat) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, d.length(), width), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function wheel(r, at, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 20), mat);
  m.rotation.x = Math.PI / 2; m.position.copy(at); m.castShadow = true;
  return m;
}
// Barra de jalón: larga, con las puntas curvas hacia abajo y puños
function latBar(g, a, b) {
  const meshes = [rod(0.013, BT_MAT.frame), rod(0.013, BT_MAT.frame), rod(0.013, BT_MAT.frame), rod(0.022, BT_MAT.pad), rod(0.022, BT_MAT.pad)];
  meshes.forEach((m) => g.add(m));
  return (p1, p2) => {
    const c = p1.clone().add(p2).multiplyScalar(0.5), half = p2.clone().sub(p1).multiplyScalar(0.5);
    const e1 = c.clone().sub(half.clone().setLength(half.length() + 0.14)), e2 = c.clone().add(half.clone().setLength(half.length() + 0.14));
    const dn = (e, sgn) => e.clone().add(half.clone().setLength(0.1 * sgn)).add(new THREE.Vector3(0, -0.12, 0));
    const t1 = dn(e1, -1), t2 = dn(e2, 1);
    segment(meshes[0], e1, e2); segment(meshes[1], e1, t1); segment(meshes[2], e2, t2);
    segment(meshes[3], e1.clone().lerp(t1, 0.35), t1); segment(meshes[4], e2.clone().lerp(t2, 0.35), t2);
  };
}
const BT_CFG = {
  seat: { colX: 50, dir: 1, beam: 68, seat: true, low: 96 },
  front: { colX: 204, dir: -1, beam: 36, seat: false, low: 40 },
  behind: { colX: 40, dir: 1, beam: 36, seat: false, low: 20 },
};
const BT_FOLLOW = ['machine_chest_press', 'bt_pec_deck', 'bt_single_press'];

function buildBodytone(cfgName, spec, rig, key, g, dyn) {
  const cfg = BT_CFG[cfgName];
  const k = rig.k, M = (x, y, z = 0) => rig.M([x, y], z);
  const X = (o) => cfg.colX + cfg.dir * o;
  const F = BT_MAT.frame;
  // Base en el suelo
  g.add(rod(0.025, F, M(X(-34), 149), M(X(cfg.seat ? 102 : cfg.low + 6), 149)));
  g.add(rod(0.025, F, M(X(-22), 149, -0.36), M(X(-22), 149, 0.36)));
  g.add(rod(0.025, F, M(X(cfg.seat ? 102 : cfg.low + 6), 149, -0.28), M(X(cfg.seat ? 102 : cfg.low + 6), 149, 0.28)));
  // Torre de pesas tapada (negra, con la franja naranja) y la columna con la viga alta
  const shroud = box(30 * k, 192 * k, 0.36, BT_MAT.pad);
  shroud.position.copy(M(X(-20), 54));
  g.add(shroud);
  const stripe = box(5 * k, 120 * k, 0.006, BT_MAT.orange);
  stripe.position.copy(M(X(-14), 60, 0.183));
  g.add(stripe);
  g.add(rod(0.032, F, M(cfg.colX, 150), M(cfg.colX, -74)));
  g.add(rod(0.028, F, M(cfg.colX, -70), M(X(cfg.beam), -70)));
  g.add(wheel(0.05, M(X(cfg.beam), -66), F), wheel(0.045, M(cfg.colX, -66), F));
  g.add(wheel(0.045, M(X(cfg.low), 142), F));
  // Respaldo grande (negro con el centro gris)
  g.add(slab(M(X(15), 100), M(X(9), 24), 0.38, 0.09, BT_MAT.pad));
  g.add(slab(M(X(18), 94), M(X(12.5), 30), 0.2, 0.07, BT_MAT.grayPad));
  // Mariposa: barra transversal sobre el respaldo y dos brazos a los lados con almohadilla y manilla en L
  const x0 = X(14);
  g.add(rod(0.026, F, M(x0, 12, -0.34), M(x0, 12, 0.34)));
  const follow = cfg.seat && BT_FOLLOW.includes(key);
  for (const side of [1, -1]) {
    const A = M(x0, 12, side * 0.24), B = M(X(19), 6, side * 0.42);
    g.add(rod(0.022, F, A, B));
    if (follow) {
      const r1 = rod(0.022, F), r2 = rod(0.022, F), pad = rod(0.05, BT_MAT.pad);
      g.add(r1, r2, pad);
      dyn.push({ arm: { side, B, r1, r2, pad, padOn: key === 'bt_pec_deck' } });
    } else {
      const C = M(X(21), 72, side * 0.42), D = M(X(33), 72, side * 0.42);
      g.add(rod(0.022, F, B, C), rod(0.022, F, C, D), rod(0.05, BT_MAT.pad, M(X(22), 34, side * 0.42), M(X(22), 60, side * 0.42)));
    }
  }
  if (cfg.seat) {
    // Asiento, poste y rodillos de piernas
    const seat = box(56 * k, 8 * k, 0.36, BT_MAT.pad);
    seat.position.copy(M(X(48), 102));
    g.add(seat);
    g.add(rod(0.03, F, M(X(46), 106), M(X(46), 150)));
    g.add(rod(0.02, F, M(X(72), 106), M(X(78), 118)));
    const pads = (spec.props || []).some((q) => q.w === 'weight' && q.pad);
    if (!pads) g.add(rod(0.045, BT_MAT.pad, M(X(78), 118, -0.24), M(X(78), 118, 0.24)));
    g.add(rod(0.02, F, M(X(78), 118), M(X(84), 140)), rod(0.04, BT_MAT.pad, M(X(84), 140, -0.2), M(X(84), 140, 0.2)));
  }
  // Barra de jalón colgando si nadie la está usando
  const usesTop = (spec.props || []).some((q) => q.w === 'strap' && q.from && q.from[1] < 0);
  if (!usesTop) {
    const bx = X(cfg.beam);
    g.add(rod(0.006, PROP.strap, M(bx, -62), M(bx, -24)));
    latBar(g)(M(bx, -24, -0.42), M(bx, -24, 0.42));
  }
}

// Mancuerna: barra corta con dos discos, orientada a lo ancho (eje Z)
function dumbbell() {
  const d = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10), PROP.metal);
  bar.rotation.x = Math.PI / 2;
  d.add(bar);
  for (const z of [-0.08, 0.08]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), PROP.plate);
    disc.rotation.x = Math.PI / 2;
    disc.position.z = z;
    disc.castShadow = true;
    d.add(disc);
  }
  return d;
}
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; };
function segment(mesh, a, b) {
  const d = b.clone().sub(a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(mesh.userData.r, Math.max(d.length(), 1e-4), mesh.userData.r);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}
function rod(r, mat, a, b) {
  const m = new THREE.Mesh(unitCyl, mat);
  m.userData.r = r;
  m.castShadow = true;
  if (a && b) segment(m, a, b);
  return m;
}

function buildProps(spec, rig, hs = {}) {
  const g = new THREE.Group();
  const dyn = [];
  if (hs.sharedBar && (spec.props || []).some((p) => p.w === 'strap' && !p.band && !p.ring)) {
    const topBar = (spec.props || []).some((p) => p.w === 'strap' && p.from && p.from[1] < 0) && (spec.props || []).some((p) => p.w === 'btmachine');
    if (topBar) dyn.push({ latBar: latBar(g) });
    else { const barMesh = rod(0.014, PROP.metal); g.add(barMesh); dyn.push({ cableBar: barMesh }); }
  }
  const k = rig.k, M = (p, z) => rig.M(p, z);
  for (const p of spec.props || []) {
    if (p.w === 'wall' || p.w === 'door') {
      // Se extiende sobre todo hacia el fondo para no tapar a la figura desde la cámara
      const wall = box(p.w === 'door' ? 0.06 : 0.1, 2.6, 1.2, p.w === 'door' ? PROP.door : PROP.wall);
      wall.castShadow = false;
      wall.position.set(M([p.x + 5, 0]).x, 1.3, -0.4);
      g.add(wall);
    } else if (p.w === 'box') {
      const top = M([0, p.y]).y, wd = (p.wd || 40) * k;
      const b = box(wd, top, 0.6, PROP.wood);
      b.position.set(M([p.x, 0]).x + wd / 2, top / 2, 0);
      g.add(b);
    } else if (p.w === 'bar') {
      const y = M([0, p.y]).y, x = M([120, 0]).x;
      g.add(rod(0.018, PROP.metal, new THREE.Vector3(x, y, -0.6), new THREE.Vector3(x, y, 0.6)));
      for (const z of [-0.6, 0.6]) g.add(rod(0.025, PROP.metal, new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 0.6, z)));
    } else if (p.w === 'pbar') {
      if (p.y < 0) { // marco de puerta para apoyarse
        const x = M([p.x, 0]).x;
        g.add(rod(0.03, PROP.wood, new THREE.Vector3(x, 0, 0.35), new THREE.Vector3(x, 2.2, 0.35)));
      } else {
        const y = M([0, p.y]).y, x = M([p.x, 0]).x;
        for (const z of [-0.26, 0.26]) {
          g.add(rod(0.02, PROP.metal, new THREE.Vector3(x - 0.35, y, z), new THREE.Vector3(x + 0.35, y, z)));
          for (const dx of [-0.3, 0.3]) g.add(rod(0.02, PROP.metal, new THREE.Vector3(x + dx, 0, z), new THREE.Vector3(x + dx, y, z)));
        }
      }
    } else if (p.w === 'table') {
      const y = M([0, p.y]).y, x1 = M([p.x1, 0]).x, x2 = M([p.x2, 0]).x;
      const top = box(x2 - x1, 0.04, 0.9, PROP.wood);
      top.position.set((x1 + x2) / 2, y, 0);
      g.add(top);
      for (const x of [x1 + 0.05, x2 - 0.05]) for (const z of [-0.4, 0.4]) g.add(rod(0.02, PROP.wood, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y, z)));
    } else if (p.w === 'anchor') {
      const b = box(30 * k, 0.08, 0.6, PROP.wood);
      b.position.copy(M([p.x + 15, p.y])).setZ(0);
      g.add(b);
    } else if (p.w === 'disc') {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(p.r * k, p.r * k, 0.05, 24), PROP.plate);
      d.rotation.x = Math.PI / 2;
      d.position.copy(M(p.c, 0.08));
      d.castShadow = true;
      g.add(d);
    } else if (p.w === 'btmachine') {
      buildBodytone(p.side, spec, rig, spec.__key, g, dyn);
    } else if (p.w === 'seg') {
      if (p.bt) continue;
      g.add(rod((p.r || 2) * k * 1.1, PROP.metal, M(p.a, 0), M(p.b, 0)));
    } else if (p.w === 'weight') {
      for (const to of p.to) {
        const tip = p.pad ? rod(0.045, PROP.pad) : dumbbell();
        if (p.pad) tip.scale.set(0.045, 0.32, 0.045), tip.rotation.x = Math.PI / 2;
        g.add(tip);
        dyn.push({ to, tip, onlyTip: true });
      }
    } else if (p.w === 'strap' || p.w === 'trx') {
      const targets = p.w === 'trx' ? p.to : [p.to];
      for (const to of targets) {
        if (typeof to !== 'string') continue;
        const from = p.w === 'trx' ? p.anchor : p.from;
        const mesh = rod(p.band ? 0.012 : 0.008, p.band ? PROP.band : PROP.strap);
        g.add(mesh);
        let tip = null;
        if (p.w === 'trx') { tip = box(0.035, 0.035, 0.12, PROP.handle); g.add(tip); }
        if (p.ring) { tip = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), PROP.metal); g.add(tip); }
        dyn.push({ from, to, mesh, tip, single: p.w === 'trx' });
      }
    }
  }
  return {
    group: g,
    update() {
      for (const d of dyn) {
        if (d.latBar) { d.latBar(rig.jointWorld('hn'), rig.jointWorld('hf')); continue; }
        if (d.arm) {
          // Brazo de la mariposa que acompaña a la mano de ese lado
          const hands = [rig.jointWorld('hn'), rig.jointWorld('hf')].sort((p1, p2) => p2.z - p1.z);
          const h = d.arm.side > 0 ? hands[0] : hands[1];
          const top = new THREE.Vector3(h.x, d.arm.B.y, h.z);
          segment(d.arm.r1, d.arm.B, top);
          segment(d.arm.r2, top, h.clone().add(new THREE.Vector3(0, -0.04, 0)));
          const p1 = top.clone().lerp(h, 0.25), p2 = top.clone().lerp(h, d.arm.padOn ? 0.75 : 0.3);
          segment(d.arm.pad, p1, p2);
          d.arm.pad.visible = d.arm.padOn;
          continue;
        }
        if (d.cableBar) {
          const a = rig.jointWorld('hn'), b = rig.jointWorld('hf');
          const c = a.clone().add(b).multiplyScalar(0.5), half = b.clone().sub(a).multiplyScalar(0.5);
          const ext = half.clone().setLength(half.length() + 0.12);
          segment(d.cableBar, c.clone().sub(ext), c.clone().add(ext));
          continue;
        }
        const end = d.to === 'hn' && hs.sharedBar ? rig.jointWorld('hn').add(rig.jointWorld('hf')).multiplyScalar(0.5) : rig.jointWorld(d.to);
        if (d.onlyTip) {
          d.tip.position.copy(end);
          const g = (d.to === 'hn' || d.to === 'hf') && rig.grip(d.to);
          if (g) d.tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.across);
          continue;
        }
        const start = M(d.from, d.single ? 0 : end.z);
        segment(d.mesh, start, end);
        if (d.tip) {
          d.tip.position.copy(end);
          const g = (d.to === 'hn' || d.to === 'hf') && rig.grip(d.to);
          if (g) d.tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.across);
        }
      }
    },
  };
}

// ---------- Escena ----------
function makeScene(dark) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xFFFFFF, dark ? 0x2A2F3C : 0xD9CFC0, dark ? 1.1 : 1.35));
  const key = new THREE.DirectionalLight(0xFFFFFF, dark ? 2.0 : 1.8);
  key.position.set(2.5, 4, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(MOBILE ? 512 : 1024, MOBILE ? 512 : 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 15;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(dark ? 0xFFB37A : 0xFFE3CC, dark ? 1.1 : 0.6);
  rim.position.set(-3, 2.5, -2);
  scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: dark ? 0.45 : 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return { scene, key };
}

// Cámara en 3/4: un poco de frente y desde arriba, encuadrando la caja 2D del ejercicio
function placeCamera(cam, rig, fb, aspect, light) {
  const cx = fb.x0 + fb.w / 2, cy = fb.y0 + fb.h / 2;
  const center = rig.M([cx, cy]);
  const worldH = fb.h * rig.k, worldW = fb.w * rig.k;
  const fov = cam.fov * Math.PI / 180;
  const dist = Math.max(worldH / 2 / Math.tan(fov / 2), worldW / 2 / Math.tan(fov / 2) / aspect) * 1.02;
  const yaw = window.__yaw ?? 0.74, pitch = window.__pitch ?? 0.16;
  cam.position.set(center.x + Math.sin(yaw) * dist, center.y + Math.sin(pitch) * dist, Math.cos(yaw) * dist);
  cam.lookAt(center);
  if (light) { light.target.position.copy(center); light.position.set(center.x + 2.5, 4, 3.5); }
}

// ---------- Reproductor en vivo ----------
class Player3D {
  constructor(container, key, opts) {
    this.container = container;
    this.opts = opts;
    this.offset = opts.offset || 0;
    this.drv = new Driver(key, opts);
    this.handSt = handStates(key, this.drv.spec);
    const dark = container.classList.contains('dark');
    this.rig = new Rig(dark);
    this.rig.setMuscles(this.drv.muscles);
    const { scene, key: light } = makeScene(dark);
    this.scene = scene;
    scene.add(this.rig.root);
    this.drv.spec.__key = key;
    this.props = buildProps(this.drv.spec, this.rig, this.handSt);
    scene.add(this.props.group);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.cam = new THREE.PerspectiveCamera(28, 240 / 202, 0.05, 50);
    this.fb = this.drv.frameBox();
    this.light = light;
    container.innerHTML = '';
    container.classList.add('anim-3d');
    container.appendChild(this.renderer.domElement);
    if (opts.detail) {
      const hud = document.createElement('div');
      hud.className = 'anim-hud';
      hud.innerHTML = '<span class="hud-phase"></span><span class="hud-rep"></span>';
      this.hud = { phase: hud.children[0], rep: hud.children[1] };
      container.appendChild(hud);
      this.cues = opts.cues || [];
      if (this.cues.length) { this.cueEl = document.createElement('div'); this.cueEl.className = 'anim-cue'; container.appendChild(this.cueEl); }
    }
    this.resize();
    this.draw(this.offset);
  }

  resize() {
    const w = this.container.clientWidth || 240, h = this.container.clientHeight || 202;
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    placeCamera(this.cam, this.rig, this.fb, w / h, this.light);
  }

  draw(time) {
    this.resize();
    const { st, s } = this.drv.at(time);
    this.rig.pose(s, this.handSt);
    this.props.update();
    this.rig.setPulse(0.5 + 0.35 * Math.sin(time * 5));
    this.renderer.render(this.scene, this.cam);
    if (this.hud) {
      const h = this.drv.hud(st, time);
      if (this.hud.phase.textContent !== h.phase) this.hud.phase.textContent = h.phase;
      if (this.hud.rep.textContent !== h.rep) this.hud.rep.textContent = h.rep;
      if (this.cueEl) {
        const per = this.drv.spec.hold ? 4 : Math.max(3, this.drv.tl.total);
        const i = Math.floor(time / per) % this.cues.length;
        if (this.cueIdx !== i) { this.cueIdx = i; this.cueEl.textContent = '💡 ' + this.cues[i]; this.cueEl.classList.remove('in'); void this.cueEl.offsetWidth; this.cueEl.classList.add('in'); }
      }
    }
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    for (const m of this.rig.meshes) { m.geometry.dispose(); m.material.dispose(); }
  }
}

// ---------- Miniaturas: imágenes fijas con un renderizador compartido ----------
const snap = { renderer: null, cache: new Map(), queue: [], busy: false, scenes: {} };
const SNAP_W = 360, SNAP_H = 303;

function snapScene(dark) {
  if (!snap.scenes[dark]) {
    const { scene, key } = makeScene(dark);
    const rig = new Rig(dark);
    scene.add(rig.root);
    snap.scenes[dark] = { scene, key, rig, cam: new THREE.PerspectiveCamera(28, SNAP_W / SNAP_H, 0.05, 50) };
  }
  return snap.scenes[dark];
}

function renderSnapshot(key, opts, dark, frame = 1) {
  if (!snap.renderer) {
    snap.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    snap.renderer.setPixelRatio(1);
    snap.renderer.setSize(SNAP_W, SNAP_H, false);
    snap.renderer.shadowMap.enabled = true;
    snap.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    snap.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  const S = snapScene(dark);
  const drv = new Driver(key, { ...opts, detail: false, cues: [] });
  S.rig.setMuscles(drv.muscles);
  S.rig.setPulse(0.75);
  const hsSnap = handStates(key, drv.spec);
  const s0 = drv.tl.steps[0];
  const t = frame === 0 ? (drv.spec.cycle ? 0 : s0.h * 0.5) : drv.keyTime();
  S.rig.pose(drv.at(t).s, hsSnap);
  drv.spec.__key = key;
  const props = buildProps(drv.spec, S.rig, hsSnap);
  S.scene.add(props.group);
  props.update();
  placeCamera(S.cam, S.rig, drv.frameBox(), SNAP_W / SNAP_H, S.key);
  snap.renderer.render(S.scene, S.cam);
  const url = snap.renderer.domElement.toDataURL('image/webp', 0.85);
  S.scene.remove(props.group);
  props.group.traverse((o) => { if (o.geometry && o.geometry !== unitCyl) o.geometry.dispose(); });
  return url;
}

let pumpRetry = null;
['scroll', 'input', 'hashchange'].forEach((ev) => window.addEventListener(ev, () => { clearTimeout(pumpRetry); pumpRetry = setTimeout(pump, 120); }, { passive: true }));
function pump() {
  if (snap.busy || !snap.queue.length) return;
  snap.busy = true;
  const run = () => {
    const t0 = performance.now();
    while (snap.queue.length && performance.now() - t0 < 30) {
      // Primero las imágenes que se ven en pantalla; las escondidas esperan
      snap.queue = snap.queue.filter((j) => j.img.isConnected);
      if (!snap.queue.length) break;
      const vis = (j) => { if (!j.img.parentNode || j.img.parentNode.offsetParent === null) return false; const r = j.img.parentNode.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 400; };
      let i = snap.queue.findIndex(vis);
      if (i < 0) i = snap.queue.findIndex((j) => j.img.parentNode && j.img.parentNode.offsetParent !== null);
      if (i < 0) { snap.busy = false; return; }
      const job = snap.queue.splice(i, 1)[0];
      const ck = job.key + '|' + job.dark + '|' + (job.frame ?? 1);
      let url = snap.cache.get(ck);
      if (!url) { try { url = renderSnapshot(job.key, job.opts, job.dark, job.frame ?? 1); snap.cache.set(ck, url); } catch (e) { console.warn(e); continue; } }
      job.img.src = url;
      job.img.classList.add('in');
    }
    if (snap.queue.length) setTimeout(run, 16); else snap.busy = false;
  };
  setTimeout(run, 0);
}

class Still3D {
  constructor(container, key, opts) {
    this.container = container;
    this.opts = { ...opts, static: true };
    container.innerHTML = '';
    container.classList.add('anim-3d');
    const dark = container.classList.contains('dark');
    const img = new Image();
    img.className = 'anim-img';
    img.alt = opts.label || '';
    container.appendChild(img);
    snap.queue.push({ img, key, opts, dark, frame: 1 });
    // Segunda imagen (posición de inicio) que aparece y desaparece encima: se ve el movimiento sin abrir el ejercicio
    if (!opts.static || container.classList.contains('flip')) {
      const img0 = new Image();
      img0.className = 'anim-img flip0';
      img0.alt = '';
      container.appendChild(img0);
      snap.queue.push({ img: img0, key, opts, dark, frame: 0 });
    }
    pump();
  }
  draw() {}
}

function mount(container, key, opts) {
  try {
    return opts.detail || container.classList.contains('live') ? new Player3D(container, key, opts) : new Still3D(container, key, opts);
  } catch (e) {
    console.warn('3D no disponible, se usa 2D', e);
    R3.ready = false;
    return null;
  }
}

// ---------- Arranque ----------
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

// Personaje propio: el archivo .glb se guarda en IndexedDB del dispositivo (funciona en web y APK).
const DB = { name: 'calistenia-assets', store: 'files' };
function idb(mode, fn) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB.name, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(DB.store);
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const tx = rq.result.transaction(DB.store, mode);
      const r = fn(tx.objectStore(DB.store));
      tx.oncomplete = () => res(r && r.result);
      tx.onerror = () => rej(tx.error);
    };
  });
}
// Revisa un .glb antes de guardarlo: debe tener un esqueleto humanoide reconocible
async function validateCharacter(buffer) {
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  let skinned = 0;
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned++; });
  const missing = skinned ? missingBones(gltf.scene) : ['malla con esqueleto'];
  return { ok: !missing.length, missing };
}
window.CharacterStore = {
  async save(file) {
    const buf = await file.arrayBuffer();
    const v = await validateCharacter(buf);
    if (!v.ok) return v;
    await idb('readwrite', (st) => st.put({ name: file.name, data: buf }, 'character'));
    return v;
  },
  load: () => idb('readonly', (st) => st.get('character')),
  clear: () => idb('readwrite', (st) => st.delete('character')),
};

async function characterURL(choice) {
  if (choice === 'custom') {
    try {
      const rec = await window.CharacterStore.load();
      if (rec && rec.data) return URL.createObjectURL(new Blob([rec.data], { type: 'model/gltf-binary' }));
    } catch (e) { console.warn('No se pudo leer el personaje propio', e); }
  }
  // En la web pública no van los personajes de Mixamo (su licencia no permite publicar los archivos).
  if (window.NUBE?.sinMixamo && (choice === 'human' || choice === 'mannequin')) return CHARACTERS.man;
  return CHARACTERS[choice === '3d' ? 'man' : choice] || CHARACTERS.man;
}

// Personajes incluidos (esqueleto Mixamo). Se elige en el inicio de la app.
export const CHARACTERS = { human: 'models/Michelle.glb', man: 'models/Hombre_Claro.glb', man2: 'models/Hombre_Moreno.glb', mannequin: 'models/Xbot.glb' };
let pref = null;
try { pref = localStorage.getItem('calistenia.anim'); } catch (e) { /* sin almacenamiento */ }
if (webglOK() && pref !== '2d') {
  characterURL(pref).then((url) => new GLTFLoader().loadAsync(url)).then((gltf) => {
    if (missingBones(gltf.scene).length) throw new Error('El personaje no tiene un esqueleto humanoide completo');
    base = gltf;
    R3.ready = true;
    EA.remountAll();
    window.dispatchEvent(new Event('anim3d-ready'));
  }).catch((e) => console.warn('No se pudo cargar el modelo 3D', e));
}
