import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// -------------------- Scene --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// -------------------- Camera --------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 6, 14);

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// -------------------- Lights --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 6);
scene.add(dir);

// Helpers (optional)
scene.add(new THREE.GridHelper(40, 40));
scene.add(new THREE.AxesHelper(5));

// -------------------- Controls --------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// -------------------- Path (centerline) --------------------
const points = [
  new THREE.Vector3(-6, 0, -3),
  new THREE.Vector3(-3, 2, 3),
  new THREE.Vector3(0, 0, 6),
  new THREE.Vector3(3, 2, 3),
  new THREE.Vector3(6, 0, -3),
  new THREE.Vector3(0, 1, -6),
];

const centerCurve = new THREE.CatmullRomCurve3(points, true);
centerCurve.curveType = "catmullrom";
centerCurve.tension = 0.5;

// -------------------- Track settings --------------------
const gauge = 1.0;        // distance between rails
const railRadius = 0.05;  // rail thickness
const railSegments = 500; // smoothness

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();

// -------------------- Build rail curves (stable, no Frenet twist) --------------------
const leftPts = [];
const rightPts = [];
const tangent = new THREE.Vector3();

for (let i = 0; i <= railSegments; i++) {
  const t = i / railSegments;
  const p = centerCurve.getPointAt(t);
  centerCurve.getTangentAt(t, tangent).normalize();

  // right = WORLD_UP x tangent
  tmpRight.crossVectors(WORLD_UP, tangent);

  // handle near-parallel case (tangent almost vertical)
  if (tmpRight.lengthSq() < 1e-8) {
    tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
  }
  tmpRight.normalize();

  leftPts.push(p.clone().addScaledVector(tmpRight, +gauge / 2));
  rightPts.push(p.clone().addScaledVector(tmpRight, -gauge / 2));
}

const leftCurve = new THREE.CatmullRomCurve3(leftPts, true);
const rightCurve = new THREE.CatmullRomCurve3(rightPts, true);

// Rails (tubes)
const railMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a2f,
  metalness: 0.85,
  roughness: 0.25,
});

const leftRail = new THREE.Mesh(
  new THREE.TubeGeometry(leftCurve, railSegments, railRadius, 12, true),
  railMat
);

const rightRail = new THREE.Mesh(
  new THREE.TubeGeometry(rightCurve, railSegments, railRadius, 12, true),
  railMat
);

scene.add(leftRail);
scene.add(rightRail);

// -------------------- Sleepers (instanced) --------------------
const sleeperCount = 100;
const sleeperSize = new THREE.Vector3(gauge * 1.0, 0.03, 0.25);

const sleeperGeo = new THREE.BoxGeometry(
  sleeperSize.x,
  sleeperSize.y,
  sleeperSize.z
);

const sleeperMat = new THREE.MeshStandardMaterial({
  color: 0x7a4a2a,
  roughness: 0.95,
  metalness: 0.0,
});

const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
scene.add(sleepers);

const m4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < sleeperCount; i++) {
  const t = i / sleeperCount;

  const p = centerCurve.getPointAt(t);
  centerCurve.getTangentAt(t, tangent).normalize();

  // right = WORLD_UP x tangent
  tmpRight.crossVectors(WORLD_UP, tangent);
  if (tmpRight.lengthSq() < 1e-8) {
    tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
  }
  tmpRight.normalize();

  // up = tangent x right  (keeps an orthonormal frame)
  tmpUp.crossVectors(tangent, tmpRight).normalize();

  // basis: x=right, y=up, z=forward
  const basis = new THREE.Matrix4().makeBasis(tmpRight, tmpUp, tangent);
  quat.setFromRotationMatrix(basis);

  // slightly drop sleepers so rails sit above
  const pos = p.clone().addScaledVector(tmpUp, -0.06);

  m4.compose(pos, quat, scale);
  sleepers.setMatrixAt(i, m4);
}
sleepers.instanceMatrix.needsUpdate = true;

// -------------------- Moving cube (optional) --------------------
const mover = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.6),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
scene.add(mover);

// -------------------- Animate --------------------
const clock = new THREE.Clock();
let tMove = 0;
const speed = 0.03;

const lookTarget = new THREE.Vector3();
const lift = new THREE.Vector3(0, 0.35, 0);

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  tMove = (tMove + dt * speed) % 1;

  const p = centerCurve.getPointAt(tMove);
  centerCurve.getTangentAt(tMove, tangent).normalize();

  camera.position.copy(p).add(lift);
  lookTarget.copy(p).addScaledVector(tangent, 2).add(lift);
  camera.lookAt(lookTarget);

  // controls.update();
  renderer.render(scene, camera);
}

animate();

// -------------------- Resize --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
