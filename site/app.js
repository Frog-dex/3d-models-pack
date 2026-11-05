// Gallery page: model grid with filters/search, and the Model Viewer dialog (hash-routed: #model/desk).
import { MODELS, GROUPS, modelUrl, thumbUrl, formatBytes } from './catalog.js';

const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const chips = $('#chips');
const search = $('#search');
const empty = $('#empty');
const nf = new Intl.NumberFormat('en');

let activeGroup = 'all';

/* ---------- toast & clipboard ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Copy failed: select the text instead'); }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (b) copy(document.querySelector(b.dataset.copy).textContent);
});

/* ---------- grid ---------- */
function renderChips() {
  const counts = { all: MODELS.length };
  for (const m of MODELS) counts[m.group] = (counts[m.group] || 0) + 1;
  const entries = [['all', 'All'], ...Object.entries(GROUPS)];
  chips.innerHTML = entries.map(([k, label]) =>
    `<button type="button" class="chip" data-group="${k}" aria-pressed="${k === activeGroup}">${label}<span class="n">${counts[k] || 0}</span></button>`).join('');
}
chips.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  activeGroup = b.dataset.group;
  renderChips();
  applyFilter();
});

function renderGrid() {
  grid.innerHTML = MODELS.map((m) => `
    <li data-id="${m.id}" data-group="${m.group}">
      <button type="button" class="card" data-open="${m.id}" aria-label="Open ${m.name} in the viewer">
        <div class="card-art">
          ${m.triangles > 50000 ? '<span class="badge">High detail</span>' : ''}
          <img src="${thumbUrl(m)}" alt="" loading="lazy" width="512" height="512">
        </div>
        <div class="card-body">
          <div class="card-name">${m.name}</div>
          <div class="card-file">${m.file}</div>
          <div class="card-meta"><span class="tag">${nf.format(m.triangles)} tris</span><span class="tag">${formatBytes(m.bytes)}</span></div>
        </div>
      </button>
    </li>`).join('');
}
grid.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) location.hash = `model/${b.dataset.open}`;
});

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  for (const li of grid.children) {
    const m = MODELS.find((x) => x.id === li.dataset.id);
    const hay = `${m.name} ${m.file} ${m.blurb} ${GROUPS[m.group]}`.toLowerCase();
    const ok = (activeGroup === 'all' || m.group === activeGroup) && (!q || hay.includes(q));
    li.hidden = !ok;
    if (ok) shown++;
  }
  empty.hidden = shown > 0;
}
search.addEventListener('input', applyFilter);

renderChips();
renderGrid();

/* ---------- viewer ---------- */
const dialog = $('#viewer');
let viewer; // lazily created: three.js only downloads when someone opens a model
let current = null;

async function ensureViewer() {
  if (viewer) return viewer;
  const { createStage, loadModel, normalize, setWireframe, THREE } = await import('./stage.js');
  const stage = createStage($('#viewer-canvas'), { transparent: true });
  stage.controls.autoRotate = true;
  viewer = { stage, loadModel, normalize, setWireframe, THREE, object: null, token: 0, wire: false };
  return viewer;
}

function setPressed(btn, on) { btn.setAttribute('aria-pressed', String(on)); }

async function show(id) {
  const m = MODELS.find((x) => x.id === id);
  if (!m) return;
  current = m;
  $('#viewer-file').textContent = m.file;
  $('#viewer-name').textContent = m.name;
  $('#viewer-group').textContent = GROUPS[m.group];
  $('#viewer-blurb').textContent = m.blurb;
  $('#s-tris').textContent = nf.format(m.triangles);
  $('#s-size').textContent = formatBytes(m.bytes);
  $('#s-meshes').textContent = '…';
  $('#s-tex').textContent = '…';
  const dl = $('#a-download');
  dl.href = modelUrl(m);
  dl.setAttribute('download', m.file);
  document.title = `${m.name} · 3D Models Pack`;
  if (!dialog.open) dialog.showModal();

  const loading = $('#viewer-loading');
  const bar = $('#viewer-progress');
  loading.hidden = false;
  bar.style.width = '5%';

  let v;
  try {
    v = await ensureViewer();
  } catch (err) {
    console.error(err);
    loading.querySelector('span').textContent = 'Could not load the 3D engine. Check your connection.';
    return;
  }
  const token = ++v.token;
  v.stage.start();
  try {
    const raw = await v.loadModel(modelUrl(m), (e) => { if (e.total) bar.style.width = `${Math.max(5, (e.loaded / e.total) * 100)}%`; });
    if (token !== v.token) return; // a newer model was requested meanwhile
    if (v.object) v.stage.scene.remove(v.object);
    const obj = v.normalize(raw, { fit: 1 });
    v.object = obj;
    v.setWireframe(obj, v.wire);
    v.stage.scene.add(obj);
    v.stage.frame(obj, { distance: 1.05 });
    let meshes = 0;
    const tex = new Set();
    obj.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const mats = Array.isArray(o.userData.solid || o.material) ? (o.userData.solid || o.material) : [o.userData.solid || o.material];
      for (const mat of mats) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) if (mat[k]) tex.add(mat[k].uuid);
    });
    $('#s-meshes').textContent = meshes;
    $('#s-tex').textContent = tex.size;
    bar.style.width = '100%';
    loading.hidden = true;
  } catch (err) {
    console.error(err);
    if (token === v.token) loading.querySelector('span').textContent = `Could not load ${m.file}.`;
  }
}

function step(dir) {
  const i = MODELS.indexOf(current);
  const next = MODELS[(i + dir + MODELS.length) % MODELS.length];
  history.replaceState(null, '', `#model/${next.id}`);
  show(next.id);
}

function close() {
  if (dialog.open) dialog.close();
}
dialog.addEventListener('close', () => {
  viewer?.stage.stop();
  document.title = '3D Models Pack';
  // Clear the model from the URL without adding a history entry (Back still revisits models).
  if (location.hash.startsWith('#model/')) history.replaceState(null, '', location.pathname + location.search);
  const card = current && grid.querySelector(`[data-open="${current.id}"]`);
  card?.focus({ preventScroll: true });
});
dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }); // backdrop click
$('#viewer-close').addEventListener('click', close);
$('#viewer-prev').addEventListener('click', () => step(-1));
$('#viewer-next').addEventListener('click', () => step(1));
dialog.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
});
$('#viewer-full').addEventListener('click', () => {
  const el = $('#viewer-stage');
  if (document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen?.().catch(() => toast('Full screen is not available here'));
});

$('#t-spin').addEventListener('click', (e) => {
  if (!viewer) return;
  viewer.stage.controls.autoRotate = !viewer.stage.controls.autoRotate;
  setPressed(e.currentTarget, viewer.stage.controls.autoRotate);
});
$('#t-wire').addEventListener('click', (e) => {
  if (!viewer) return;
  viewer.wire = !viewer.wire;
  if (viewer.object) viewer.setWireframe(viewer.object, viewer.wire);
  viewer.stage.ground.visible = !viewer.wire && $('#t-shadow').getAttribute('aria-pressed') === 'true';
  $('#viewer-stage').classList.toggle('wire', viewer.wire);
  setPressed(e.currentTarget, viewer.wire);
});
$('#t-shadow').addEventListener('click', (e) => {
  if (!viewer) return;
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  viewer.stage.ground.visible = on && !viewer.wire;
  setPressed(e.currentTarget, on);
});
$('#t-reset').addEventListener('click', () => { if (viewer?.object) viewer.stage.frame(viewer.object, { distance: 1.05 }); });

$('#a-copy').addEventListener('click', () => {
  if (!current) return;
  copy(`import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.loadAsync('models/${current.file}');
// ${current.name}, CC BY 4.0, credit "Blu Inman, Spirit Strikers"`);
});
$('#a-snap').addEventListener('click', () => {
  if (!viewer || !current) return;
  const { renderer, scene, camera } = viewer.stage;
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `${current.id}-snapshot.png`;
  a.click();
  toast('Snapshot saved');
});

/* ---------- routing ---------- */
function route() {
  const m = location.hash.match(/^#model\/([\w-]+)$/);
  if (m) show(m[1]);
  else close();
}
window.addEventListener('hashchange', route);
route();
