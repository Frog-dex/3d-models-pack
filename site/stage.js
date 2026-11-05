// Shared three.js stage: renderer, lights, soft ground shadow, orbit controls and a GLB loader
// that understands the pack's meshopt + WebP compression. Used by the gallery, the Study scene
// and the thumbnail renderer.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/** Load a GLB once; every call returns a fresh clone of the scene graph (materials shared). */
export function loadModel(url, onProgress) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), onProgress, reject)));
  }
  return cache.get(url).then((s) => s.clone(true));
}

/**
 * Wrap a model so it stands on y=0, centred on x/z, scaled to `height` (or to fit a unit cube).
 * Returns a Group; its userData.size is the final bounding-box size.
 */
export function normalize(object, { height, fit = 1 } = {}) {
  object.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = height ? height / size.y : fit / Math.max(size.x, size.y, size.z);
  const center = box.getCenter(new THREE.Vector3());
  object.position.set(-center.x, -box.min.y, -center.z);
  const pivot = new THREE.Group();
  pivot.add(object);
  pivot.scale.setScalar(scale);
  pivot.userData.size = size.multiplyScalar(scale);
  return pivot;
}

export function createStage(canvas, { transparent = false, shadows = true, exposure = 1.05 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
  camera.position.set(1.6, 1.1, 2.2);

  const hemi = new THREE.HemisphereLight(0xfff2dc, 0x3a2414, 0.6);
  const key = new THREE.DirectionalLight(0xffe6c0, 2.2);
  key.position.set(2.5, 4, 2);
  key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xffc27a, 0.9);
  rim.position.set(-3, 2, -2.5);
  scene.add(hemi, key, key.target, rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.visible = shadows;
  scene.add(ground);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotateSpeed = 1.2;
  controls.maxPolarAngle = Math.PI * 0.53;

  /** Point the camera at `object` from a pleasant three-quarter angle. */
  function frame(object, { distance = 1.0, azimuth = 0.6, elevation = 0.32 } = {}) {
    const box = new THREE.Box3().setFromObject(object);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(sphere.radius, 0.001);
    const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * distance;
    const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
    controls.target.copy(sphere.center);
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    camera.near = r / 50;
    camera.far = r * 60;
    camera.updateProjectionMatrix();
    controls.minDistance = r * 0.6;
    controls.maxDistance = r * 8;
    // fit the shadow camera to the object
    const s = key.shadow.camera;
    s.left = s.bottom = -r * 1.6;
    s.right = s.top = r * 1.6;
    s.near = 0.01;
    s.far = r * 20;
    key.target.position.copy(sphere.center);
    key.position.copy(sphere.center).add(new THREE.Vector3(2.5, 4, 2).normalize().multiplyScalar(r * 6));
    s.updateProjectionMatrix();
    controls.update();
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  let running = false;
  const tickers = new Set();
  function loop() {
    if (!running) return;
    resize();
    for (const t of tickers) t();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  const start = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  const stop = () => { running = false; };

  return { renderer, scene, camera, controls, lights: { hemi, key, rim }, ground, frame, resize, start, stop, tickers };
}

/** Swap every material on `root` for a glowing green wireframe (the box-art "Model Viewer" look) or back. */
export function setWireframe(root, on) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      if (!o.userData.solid) o.userData.solid = o.material;
      o.material = wireMaterial;
    } else if (o.userData.solid) {
      o.material = o.userData.solid;
    }
  });
}
const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x5dff7a, wireframe: true, transparent: true, opacity: 0.6 });
