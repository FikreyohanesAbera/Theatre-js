import * as THREE from "three";
import "./style.css";

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false; // keep it cheap (fog + bloom-like feel comes from lighting)
document.body.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3d8e4); // soft pink sky
scene.fog = new THREE.FogExp2(0xf3d8e4, 0.135); // dial density

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1.6, 6);

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

// warm key from front-right
const key = new THREE.DirectionalLight(0xfff0d8, 1.2);
key.position.set(8, 10, 6);
scene.add(key);

// cool rim from left
const rim = new THREE.DirectionalLight(0xd6f0ff, 0.65);
rim.position.set(-10, 6, -6);
scene.add(rim);

// horizon glow (makes fog “breathe”)
const horizonGlow = new THREE.PointLight(0xffd1e6, 1.2, 80, 2);
horizonGlow.position.set(0, 2.5, -45);
scene.add(horizonGlow);

// ---------- Helpers: Path Curve ----------
const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(-1.2, 0, -8),
    new THREE.Vector3(0.8, 0, -20),
    new THREE.Vector3(0.2, 0, -34),
    new THREE.Vector3(-0.8, 0, -48),
  ],
  false,
  "catmullrom",
  0.25
);

const pathLength = 60; // how far camera will travel
const PATH_WIDTH = 2.2;

// ---------- Ground (simple plane) ----------
const groundGeo = new THREE.PlaneGeometry(60, 120, 1, 1);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0xf6dbe7,
  roughness: 1,
  metalness: 0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.set(0, -0.02, -30);
scene.add(ground);

// ---------- Path Mesh (simple ribbon following curve) ----------
function buildPathRibbon(curve: THREE.CatmullRomCurve3, width: number, segments = 200) {
  const pts = curve.getPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // build a camera-facing-ish ribbon on XZ plane
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const t = i / (pts.length - 1);

    const tangent = curve.getTangent(t).normalize();
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();

    const a = new THREE.Vector3().copy(p).addScaledVector(left, width * 0.5);
    const b = new THREE.Vector3().copy(p).addScaledVector(left, -width * 0.5);

    positions.push(a.x, a.y + 0.01, a.z, b.x, b.y + 0.01, b.z);
    uvs.push(0, t, 1, t);

    if (i < pts.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xd8d8de, // concrete-ish
    roughness: 0.95,
    metalness: 0,
  });

  return new THREE.Mesh(geo, mat);
}

const path = buildPathRibbon(curve, PATH_WIDTH, 220);
scene.add(path);

// ---------- Path Lights (small emissive dots) ----------
const dotGeo = new THREE.SphereGeometry(0.035, 8, 8);
const dotMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffd7ef,
  emissiveIntensity: 2.2,
  roughness: 1,
});

const DOT_COUNT = 120;
const dots = new THREE.InstancedMesh(dotGeo, dotMat, DOT_COUNT);
dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(dots);

{
  const dummy = new THREE.Object3D();
  for (let i = 0; i < DOT_COUNT; i++) {
    const t = i / (DOT_COUNT - 1);
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();

    const side = i % 2 === 0 ? 1 : -1;
    const offset = (PATH_WIDTH * 0.5 - 0.08) * side;

    dummy.position.set(p.x + left.x * offset, 0.05, p.z + left.z * offset);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    dots.setMatrixAt(i, dummy.matrix);
  }
  dots.instanceMatrix.needsUpdate = true;
}

// ---------- Pink Leaf Carpet (instanced low-poly “chips”) ----------
const leafGeo = new THREE.IcosahedronGeometry(0.06, 0); // cheap low-poly leaf chunk
const leafMat = new THREE.MeshStandardMaterial({
  color: 0xff7fb0,
  roughness: 1,
  metalness: 0,
});

const LEAF_COUNT = 9000;
const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_COUNT);
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(leaves);

function isNearPath(x: number, z: number) {
  // approximate distance to curve by sampling nearest t (cheap enough for build-time)
  // for speed, we just estimate using a few samples.
  let best = Infinity;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = curve.getPoint(t);
    const dx = x - p.x;
    const dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  const dist = Math.sqrt(best);
  return dist < PATH_WIDTH * 0.62; // inside/near the path
}

{
  const dummy = new THREE.Object3D();
  let placed = 0;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  // scatter in a corridor volume around the path
  while (placed < LEAF_COUNT) {
    const x = rand(-10, 10);
    const z = rand(6, -60);

    // reject samples that land on the walking path
    if (isNearPath(x, z)) continue;

    dummy.position.set(x, rand(-0.01, 0.05), z);
    dummy.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    const s = rand(0.6, 1.5);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  leaves.instanceMatrix.needsUpdate = true;
}

// ---------- Palms (basic shapes, instanced) ----------
const trunkGeo = new THREE.CylinderGeometry(0.07, 0.12, 3.2, 6);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 1 });
const frondGeo = new THREE.ConeGeometry(0.9, 1.4, 6, 1);
const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f7a55, roughness: 1 });

const PALM_COUNT = 16;
const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, PALM_COUNT);
const fronds = new THREE.InstancedMesh(frondGeo, frondMat, PALM_COUNT * 3);
scene.add(trunks, fronds);

{
  const dummy = new THREE.Object3D();
  const fDummy = new THREE.Object3D();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  for (let i = 0; i < PALM_COUNT; i++) {
    // place palms along sides with variation
    const t = (i + 2) / (PALM_COUNT + 3);
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();

    const side = i % 2 === 0 ? 1 : -1;
    const dist = rand(2.6, 6.5);
    const x = p.x + left.x * dist * side + rand(-0.6, 0.6);
    const z = p.z + left.z * dist * side + rand(-0.6, 0.6);

    const lean = rand(-0.18, 0.18);
    dummy.position.set(x, 1.6, z);
    dummy.rotation.set(0, rand(-0.4, 0.4), lean);
    dummy.scale.setScalar(rand(0.85, 1.25));
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    // fronds: 3 cones around top
    for (let k = 0; k < 3; k++) {
      const idx = i * 3 + k;
      fDummy.position.set(x, 3.3, z);
      fDummy.rotation.set(rand(-0.9, -0.2), (k / 3) * Math.PI * 2 + rand(-0.4, 0.4), rand(-0.4, 0.4));
      fDummy.scale.set(rand(0.65, 1.05), rand(0.9, 1.2), rand(0.65, 1.05));
      fDummy.updateMatrix();
      fronds.setMatrixAt(idx, fDummy.matrix);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  fronds.instanceMatrix.needsUpdate = true;
}

// ---------- Floating Particles (Points) ----------
const particleCount = 22000;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleSpd = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const ix = i * 3;
  particlePos[ix + 0] = (Math.random() - 0.5) * 28;
  particlePos[ix + 1] = Math.random() * 8.5;
  particlePos[ix + 2] = 6 - Math.random() * 70;
  particleSpd[i] = 0.2 + Math.random() * 3.8;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

const particleMat = new THREE.PointsMaterial({
  size: 0.03,
  color: 0xffffff,
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// ---------- Optional Hero Glow Orb (cheap “sun”) ----------
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(1.6, 18, 18),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffc2de,
    emissiveIntensity: 1.6,
    roughness: 1,
  })
);
orb.position.set(0.8, 2.8, -42);
scene.add(orb);

// ---------- Scroll -> Camera progression ----------
let targetT = 0; // 0..1 along curve
let currentT = 0;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

window.addEventListener(
  "wheel",
  (e) => {
    // scroll forward/back along the curve
    const delta = Math.sign(e.deltaY) * 0.02;
    targetT = clamp01(targetT + delta);
  },
  { passive: true }
);

// touch / trackpad friendly
let touchY = 0;
window.addEventListener("touchstart", (e) => (touchY = e.touches[0]?.clientY ?? 0), { passive: true });
window.addEventListener(
  "touchmove",
  (e) => {
    const y = e.touches[0]?.clientY ?? touchY;
    const dy = y - touchY;
    touchY = y;
    targetT = clamp01(targetT + Math.sign(dy) * 0.02);
  },
  { passive: true }
);

// ---------- Animate ----------
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // smooth camera progression
  currentT = THREE.MathUtils.lerp(currentT, targetT, 1 - Math.pow(0.0001, dt));

  const camPos = curve.getPoint(currentT);
  const camLookT = clamp01(currentT + 0.02);
  const camLook = curve.getPoint(camLookT);

  camera.position.set(camPos.x, 1.6, camPos.z);
  camera.lookAt(camLook.x, 1.35, camLook.z);

  // particles drift (simple wind)
  const posAttr = particleGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < particleCount; i++) {
    const ix = i * 3;
    posAttr.array[ix + 0] += Math.sin(t * 0.3 + i) * 0.0006 * particleSpd[i];
    posAttr.array[ix + 1] += 0.0009 * particleSpd[i];

    // recycle
    if (posAttr.array[ix + 1] > 9.0) posAttr.array[ix + 1] = 0.2;
  }
  posAttr.needsUpdate = true;

  // subtle orb pulse
  (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(t * 0.9) * 0.15;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
