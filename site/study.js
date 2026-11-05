// The Observatory Study: every model in the pack placed in one room under the brass dome.
// Hover (or tap) a prop to name it, click again to open it in the Model Viewer.
import { createStage, loadModel, normalize, THREE } from './stage.js';
import { MODELS, GROUPS, modelUrl } from './catalog.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#study-canvas');
const stage = createStage(canvas, { exposure: 1.0 });
const { scene, camera, controls, lights } = stage;
const ROOM_R = 4.6;
const WALL_H = 2.7;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the room ---------- */
scene.background = new THREE.Color(0x1a0f07);
stage.ground.visible = false;

function plankTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#6b4024';
  g.fillRect(0, 0, 1024, 1024);
  const rnd = mulberry(7);
  for (let x = 0; x < 1024; x += 64) {
    let y = -rnd() * 300;
    while (y < 1024) {
      const len = 220 + rnd() * 320;
      const l = 30 + rnd() * 14;
      g.fillStyle = `hsl(${22 + rnd() * 8} 45% ${l}%)`;
      g.fillRect(x + 1, y + 1, 62, len - 2);
      g.globalAlpha = 0.18;
      for (let i = 0; i < 6; i++) { g.fillStyle = '#2a160a'; g.fillRect(x + 4 + rnd() * 54, y, 1.5, len); }
      g.globalAlpha = 1;
      y += len;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.anisotropy = 8;
  return t;
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function wallTexture() {
  const t = plankTexture();
  t.repeat.set(12, 0.8);
  return t;
}

// A painted star chart on the ceiling, under the dome (the dome model has a closed base).
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(512, 512, 40, 512, 512, 512);
  grad.addColorStop(0, '#1d2a4a');
  grad.addColorStop(0.85, '#0d1426');
  grad.addColorStop(1, '#3a2410');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1024);
  const rnd = mulberry(42);
  for (let i = 0; i < 700; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 470;
    g.fillStyle = `rgba(255, ${220 + rnd() * 35}, ${170 + rnd() * 60}, ${0.35 + rnd() * 0.65})`;
    g.beginPath();
    g.arc(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, rnd() < 0.06 ? 2.6 : 0.6 + rnd() * 1.1, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(246, 207, 106, .55)';
  g.lineWidth = 2;
  for (const r of [160, 300, 440]) { g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(512 + Math.cos(a) * 160, 512 + Math.sin(a) * 160); g.lineTo(512 + Math.cos(a) * 470, 512 + Math.sin(a) * 470); g.stroke();
  }
  // a few constellations
  g.strokeStyle = 'rgba(255, 236, 190, .5)';
  g.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    let a = rnd() * Math.PI * 2, r = 120 + rnd() * 300;
    g.beginPath();
    g.moveTo(512 + Math.cos(a) * r, 512 + Math.sin(a) * r);
    for (let j = 0; j < 4; j++) {
      a += (rnd() - 0.5) * 0.5; r += (rnd() - 0.5) * 120;
      const x = 512 + Math.cos(a) * r, y = 512 + Math.sin(a) * r;
      g.lineTo(x, y);
      g.fillStyle = '#fff3d0'; g.fillRect(x - 2, y - 2, 4, 4);
    }
    g.stroke();
  }
  g.fillStyle = '#c98b2a';
  g.beginPath(); g.arc(512, 512, 40, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R + 0.05, 96), new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.62, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), new THREE.MeshStandardMaterial({ color: 0x7a2418, roughness: 0.95 }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.004, -0.9);
rug.receiveShadow = true;
const rugBorder = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.82, 64), new THREE.MeshStandardMaterial({ color: 0xc98b2a, roughness: 0.8 }));
rugBorder.rotation.x = -Math.PI / 2;
rugBorder.position.set(0, 0.006, -0.9);
scene.add(rug, rugBorder);

const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(ROOM_R, ROOM_R, WALL_H, 96, 1, true),
  new THREE.MeshStandardMaterial({ map: wallTexture(), color: 0x7a5c46, roughness: 0.85, side: THREE.BackSide }),
);
wall.position.y = WALL_H / 2;
wall.receiveShadow = true;
scene.add(wall);
const ceiling = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 96), new THREE.MeshBasicMaterial({ map: starTexture(), color: 0xb8b0a0 }));
ceiling.rotation.x = Math.PI / 2; // faces down: visible from inside, invisible from above
ceiling.position.y = WALL_H - 0.01;
scene.add(ceiling);
// brass rails around the wall
for (const y of [0.9, WALL_H - 0.04]) {
  const rail = new THREE.Mesh(new THREE.TorusGeometry(ROOM_R - 0.02, 0.035, 8, 128), new THREE.MeshStandardMaterial({ color: 0xc98b2a, metalness: 0.9, roughness: 0.35 }));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = y;
  scene.add(rail);
}

/* ---------- lights ---------- */
lights.hemi.intensity = 0.35;
lights.key.intensity = 1.4;
lights.key.color.set(0xb9c8ff); // moonlight through the dome vent
lights.key.position.set(1.5, 9, 1.5);
lights.key.target.position.set(0, 0, -1);
const sc = lights.key.shadow.camera;
sc.left = sc.bottom = -5; sc.right = sc.top = 5; sc.near = 1; sc.far = 20;
sc.updateProjectionMatrix();
lights.rim.intensity = 0.5;
scene.environmentIntensity = 0.45;
const lampLight = new THREE.PointLight(0xffa64a, 6, 6, 1.6);
scene.add(lampLight);
const fill = new THREE.PointLight(0xff8a3c, 2.5, 7, 1.8);
fill.position.set(-2.4, 1.8, 0.5);
scene.add(fill);

/* ---------- the layout ---------- */
// x/z in metres, rotation in degrees around y; `on` places it on top of another prop.
const LAYOUT = {
  desk:            { x: 0,    z: -3.2, rot: -90 },
  lamp:            { on: 'desk', surface: 0.6, dx: -0.42, dz: 0.18 },
  books:           { on: 'desk', surface: 0.6, dx: 0.4, dz: 0.16, rot: -20, height: 0.34 },
  clock:           { on: 'desk', surface: 1, dx: 0.05, dz: -0.05, rot: -90, height: 0.36 },
  globe:           { x: 1.45, z: -2.75, rot: -30, height: 0.75 },
  telescope:       { x: -1.7, z: -2.3, rot: 40, height: 1.55 },
  lizard:          { x: 0.55, z: -1.55, rot: -15 },
  terminal:        { x: 2.45, z: -1.75, rot: -135 },
  signalscope:     { x: 3.05, z: 0.55, rot: -95, height: 0.55 },
  'retro-computer':{ x: -2.5, z: -0.6, rot: 20, height: 0.55 },
  tunnelA:         { x: -4.3, z: 1.4, rot: 20, y: 0, height: 1.9 },
  tunnelB:         { x: 4.15, z: 2.35, rot: -32, y: 2.05, height: 0.42 },
};
const placed = new Map();
const pickables = [];

function surfaceY(base, fraction) {
  const box = new THREE.Box3().setFromObject(base);
  return box.min.y + (box.max.y - box.min.y) * fraction;
}

async function place(m) {
  const spec = { ...(LAYOUT[m.id] || {}) };
  const obj = normalize(await loadModel(modelUrl(m)), { height: spec.height ?? m.height });
  obj.userData.model = m;
  if (spec.on) {
    const base = placed.get(spec.on) || (await placing.get(spec.on));
    base.updateMatrixWorld(true);
    // dx/dz are world-space offsets from the base's centre (the desk faces +z)
    obj.position.set(base.position.x + (spec.dx || 0), surfaceY(base, spec.surface ?? 1), base.position.z + (spec.dz || 0));
    obj.rotation.y = THREE.MathUtils.degToRad(spec.rot || 0);
  } else {
    obj.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
    obj.rotation.y = THREE.MathUtils.degToRad(spec.rot || 0);
  }
  scene.add(obj);
  placed.set(m.id, obj);
  pickables.push(obj);
  if (m.id === 'lamp') {
    const box = new THREE.Box3().setFromObject(obj);
    lampLight.position.set((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * 0.55, (box.min.z + box.max.z) / 2 + 0.05);
  }
  return obj;
}

async function placeDome() {
  const m = MODELS.find((x) => x.id === 'dome');
  const raw = await loadModel(modelUrl(m));
  const obj = normalize(raw, { fit: 1 });
  const s = (ROOM_R * 2.04) / Math.max(obj.userData.size.x, obj.userData.size.z);
  obj.scale.multiplyScalar(s);
  obj.position.y = WALL_H - 0.02;
  obj.userData.model = m;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.material = o.material.clone();
    o.material.side = THREE.DoubleSide;
  });
  scene.add(obj);
  placed.set('dome', obj);
  pickables.push(obj);
}

const loadingEl = $('#study-loading');
const bar = $('#study-progress');
let done = 0;
const total = MODELS.length;
const tick = () => { done++; bar.style.width = `${(done / total) * 100}%`; };
const placing = new Map();
for (const m of MODELS) {
  if (m.id === 'dome') continue;
  if (!LAYOUT[m.id]?.on) placing.set(m.id, place(m).then((o) => { tick(); return o; }));
}
for (const m of MODELS) {
  if (LAYOUT[m.id]?.on) placing.set(m.id, place(m).then((o) => { tick(); return o; }));
}
placing.set('dome', placeDome().then(tick));
Promise.allSettled([...placing.values()]).then((results) => {
  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error(r.reason));
  loadingEl.hidden = true;
  document.body.classList.add('ready');
  if (failed.length) $('#study-hint').textContent = `${failed.length} model(s) could not load.`;
  buildTour();
});

/* ---------- camera ---------- */
const HOME = { pos: new THREE.Vector3(0.2, 1.75, 3.1), target: new THREE.Vector3(0, 0.85, -1.6) };
camera.fov = 50;
// Portrait screens get a wider lens so the whole desk corner still fits.
stage.tickers.add(() => {
  const fov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 60 : 50;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
});
camera.near = 0.05;
camera.far = 40;
camera.position.copy(HOME.pos);
controls.target.copy(HOME.target);
controls.minDistance = 0.6;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotateSpeed = 0.35;
controls.update();

// Keep the camera inside the room (unless we're looking at the dome from outside).
let outside = false;
function setOutside(on) {
  outside = on;
  controls.maxDistance = on ? 16 : 6.5;
  controls.minDistance = on ? 6 : 0.6;
}
stage.tickers.add(() => {
  if (outside) return;
  const p = camera.position;
  const r = Math.hypot(p.x, p.z);
  const max = ROOM_R - 0.35;
  if (r > max) { p.x *= max / r; p.z *= max / r; }
  p.y = THREE.MathUtils.clamp(p.y, 0.25, WALL_H + 1.4);
});

let flight = null;
function flyTo(pos, target, ms = 1100) {
  const from = { pos: camera.position.clone(), target: controls.target.clone() };
  const t0 = performance.now();
  flight = (now) => {
    const k = prefersReducedMotion ? 1 : Math.min(1, (now - t0) / ms);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(from.pos, pos, e);
    controls.target.lerpVectors(from.target, target, e);
    if (k >= 1) flight = null;
  };
}
stage.tickers.add(() => flight?.(performance.now()));
controls.addEventListener('start', () => { flight = null; });

function focus(id) {
  const obj = placed.get(id);
  if (!obj) return;
  const box = new THREE.Box3().setFromObject(obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  if (id === 'dome') {
    // Step outside: the near wall is back-face culled, so the room reads as a cutaway under its dome.
    setOutside(true);
    flyTo(new THREE.Vector3(4.2, 6.2, 13), new THREE.Vector3(0, 1.4, 0), 1400);
    select(id);
    return;
  }
  setOutside(false);
  // look from the room centre towards the prop
  const toward = new THREE.Vector3(center.x, 0, center.z);
  const dir = toward.lengthSq() > 0.01 ? toward.clone().normalize() : new THREE.Vector3(0, 0, -1);
  const dist = Math.max(sphere.radius * 3.0, 0.9);
  const pos = center.clone().addScaledVector(dir, -dist);
  pos.y = center.y + Math.max(sphere.radius * 0.9, 0.35);
  flyTo(pos, center);
  select(id);
}

/* ---------- hover & select ---------- */
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const label = $('#study-label');
let hovered = null;
let selected = null;

function pick(e) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(pickables, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.model) o = o.parent;
  return o;
}
function highlight(obj, on) {
  obj?.traverse((o) => {
    if (!o.isMesh) return;
    if (on && !o.userData.baseEmissive) {
      o.material = o.material.clone();
      o.userData.baseEmissive = o.material.emissive.clone();
    }
    if (o.userData.baseEmissive) o.material.emissive.copy(on ? new THREE.Color(0x3a2208) : o.userData.baseEmissive);
  });
}
function select(id) {
  const obj = placed.get(id);
  if (selected && selected !== obj) highlight(selected, false);
  selected = obj;
  highlight(obj, true);
  const m = obj.userData.model;
  $('#study-card-group').textContent = GROUPS[m.group];
  $('#study-card-name').textContent = m.name;
  $('#study-card-blurb').textContent = m.blurb;
  $('#study-card-open').href = `index.html#model/${m.id}`;
  $('#study-card').hidden = false;
  for (const b of document.querySelectorAll('#tour button')) b.setAttribute('aria-current', String(b.dataset.id === id));
}

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const obj = pick(e);
  if (obj !== hovered) {
    if (hovered && hovered !== selected) highlight(hovered, false);
    hovered = obj;
    if (obj && obj !== selected) highlight(obj, true);
    canvas.style.cursor = obj ? 'pointer' : '';
  }
  if (obj) {
    label.textContent = obj.userData.model.name;
    label.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    label.hidden = false;
  } else label.hidden = true;
});
canvas.addEventListener('pointerleave', () => { label.hidden = true; });
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return; // it was a drag
  const obj = pick(e);
  if (obj) focus(obj.userData.model.id);
});

/* ---------- tour & controls ---------- */
function buildTour() {
  const order = ['desk', 'lamp', 'books', 'clock', 'globe', 'telescope', 'lizard', 'terminal', 'signalscope', 'retro-computer', 'tunnelA', 'tunnelB', 'dome'];
  $('#tour').innerHTML = order.filter((id) => placed.has(id)).map((id) => {
    const m = MODELS.find((x) => x.id === id);
    return `<button type="button" data-id="${id}"><img src="docs/thumbs/${id}.webp" alt="" width="40" height="40">${m.name}</button>`;
  }).join('');
}
$('#tour').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) focus(b.dataset.id);
});
$('#study-home').addEventListener('click', () => {
  setOutside(false);
  flyTo(HOME.pos.clone(), HOME.target.clone());
  $('#study-card').hidden = true;
  highlight(selected, false);
  selected = null;
});
$('#study-card-close').addEventListener('click', () => { $('#study-card').hidden = true; });
$('#study-spin').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
});
let night = true;
$('#study-light').addEventListener('click', (e) => {
  night = !night;
  e.currentTarget.textContent = night ? 'Lights up' : 'Lamp only';
  lights.hemi.intensity = night ? 0.35 : 0.9;
  lights.key.color.set(night ? 0xb9c8ff : 0xfff0d8);
  lights.key.intensity = night ? 1.4 : 2.4;
  scene.environmentIntensity = night ? 0.45 : 0.95;
  scene.background.set(night ? 0x1a0f07 : 0x2f1d0f);
});
// Flicker the oil lamp a little.
stage.tickers.add(() => {
  if (prefersReducedMotion) return;
  const t = performance.now() / 1000;
  lampLight.intensity = 6 + Math.sin(t * 7.3) * 0.35 + Math.sin(t * 13.1) * 0.25;
});

stage.start();
window.__study = { placed, focus, stage };
