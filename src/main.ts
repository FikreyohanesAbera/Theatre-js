import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// -------------------- Scroll spacer --------------------
document.body.style.margin = "0";
document.body.style.overflowX = "hidden";

const spacer = document.createElement("div");
spacer.style.height = "400vh";
spacer.style.width = "1px";
document.body.appendChild(spacer);

// (Vite HMR safety) kill old triggers if file re-runs
ScrollTrigger.getAll().forEach((t) => t.kill());

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
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "0";
renderer.domElement.style.display = "block";

// -------------------- Lights --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(6, 10, 6);
scene.add(dir);

// Helpers
scene.add(new THREE.GridHelper(40, 40));
scene.add(new THREE.AxesHelper(5));

// -------------------- Controls --------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false; // keep wheel for page scroll

// -------------------- Path --------------------
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
const gauge = 1.0;
const railRadius = 0.05;
const railSegments = 500;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const tangent = new THREE.Vector3();

// -------------------- Build rail curves --------------------
const leftPts: THREE.Vector3[] = [];
const rightPts: THREE.Vector3[] = [];

for (let i = 0; i <= railSegments; i++) {
  const t = i / railSegments;
  const p = centerCurve.getPointAt(t);
  centerCurve.getTangentAt(t, tangent).normalize();

  tmpRight.crossVectors(WORLD_UP, tangent);
  if (tmpRight.lengthSq() < 1e-8) tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
  tmpRight.normalize();

  leftPts.push(p.clone().addScaledVector(tmpRight, +gauge / 2));
  rightPts.push(p.clone().addScaledVector(tmpRight, -gauge / 2));
}

const leftCurve = new THREE.CatmullRomCurve3(leftPts, true);
const rightCurve = new THREE.CatmullRomCurve3(rightPts, true);

const railMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a2f,
  metalness: 0.85,
  roughness: 0.25,
});

scene.add(new THREE.Mesh(new THREE.TubeGeometry(leftCurve, railSegments, railRadius, 12, true), railMat));
scene.add(new THREE.Mesh(new THREE.TubeGeometry(rightCurve, railSegments, railRadius, 12, true), railMat));

// -------------------- Sleepers --------------------
const sleeperCount = 100;
const sleeperSize = new THREE.Vector3(gauge * 1.0, 0.03, 0.25);

const sleepers = new THREE.InstancedMesh(
  new THREE.BoxGeometry(sleeperSize.x, sleeperSize.y, sleeperSize.z),
  new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.95 }),
  sleeperCount
);
scene.add(sleepers);

const m4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < sleeperCount; i++) {
  const t = i / sleeperCount;
  const p = centerCurve.getPointAt(t);
  centerCurve.getTangentAt(t, tangent).normalize();

  tmpRight.crossVectors(WORLD_UP, tangent);
  if (tmpRight.lengthSq() < 1e-8) tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
  tmpRight.normalize();

  tmpUp.crossVectors(tangent, tmpRight).normalize();
  const basis = new THREE.Matrix4().makeBasis(tmpRight, tmpUp, tangent);
  quat.setFromRotationMatrix(basis);

  const pos = p.clone().addScaledVector(tmpUp, -0.06);
  m4.compose(pos, quat, scl);
  sleepers.setMatrixAt(i, m4);
}
sleepers.instanceMatrix.needsUpdate = true;

// -------------------- Mover (optional) --------------------
const mover = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.6),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
scene.add(mover);

// -------------------- Look helpers --------------------
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
function pulse(a: number, b: number, c: number, d: number, x: number) {
  const up = smoothstep(a, b, x);
  const down = 1 - smoothstep(c, d, x);
  return Math.min(up, down);
}

// -------------------- Camera look targets --------------------
const centerPoint = new THREE.Vector3(0, 0, 0);
const forwardLook = new THREE.Vector3();
const centerLook = new THREE.Vector3();
const finalLook = new THREE.Vector3();
const lift = new THREE.Vector3(0, 0.35, 0);
const lookAhead = 2.0;

// -------------------- State: scroll vs cutscene --------------------
const ride = {
  t: 0,        // actual camera progress
  scrollT: 0,  // scroll-driven progress
};

let inCutscene = false;
let cutscenePlayed = false;

// pick the segment range for cutscene:
const CUT_START = 0.45;
const CUT_END = 0.62;

// Create ScrollTrigger ONCE.
// Only apply scroll to ride.t if not in cutscene.
const st = ScrollTrigger.create({
  trigger: spacer,
  start: "top top",
  end: "bottom bottom",
  scrub: 1,
  markers: true,
  onUpdate: (self) => {
    ride.scrollT = self.progress;
    if (!inCutscene) ride.t = ride.scrollT;
  },
});
ScrollTrigger.refresh();

// Helper to sync scroll position to a given progress (prevents jump on return)
function setScrollToProgress(p: number) {
  const maxScroll = ScrollTrigger.maxScroll(window);
  window.scrollTo(0, p * maxScroll);
  // Force ScrollTrigger to recalc its progress immediately
  ScrollTrigger.update();
}

// -------------------- Trigger the cutscene at the right time --------------------
function tryStartCutscene() {
  if (cutscenePlayed) return;

  // We trigger when user scroll reaches CUT_START
  if (ride.scrollT >= CUT_START) {
    cutscenePlayed = true;
    inCutscene = true;

    // Start cutscene exactly at CUT_START (no mismatch)
    ride.t = CUT_START;

    // Optional: stop user scroll changes from affecting experience (but allow them to scroll page)
    // We just ignore scroll updates while inCutscene.

    gsap.to(ride, {
      t: CUT_END,
      duration: 4.0,
      ease: "power2.inOut",
      onComplete: () => {
        // Return control:
        inCutscene = false;

        // Sync the user's scroll position to match where the cutscene ended
        // so there is no jump when scroll takes over again.
        setScrollToProgress(CUT_END);

        // Now ride.t will follow scroll again via onUpdate
      },
    });
  }
}

// -------------------- Render loop --------------------
function animate() {
  requestAnimationFrame(animate);

  // if not in cutscene, ride.t already follows scroll
  // if in cutscene, ride.t is driven by GSAP tween

  // Start cutscene when scroll hits the trigger
  tryStartCutscene();

  const tMove = ((ride.t % 1) + 1) % 1;

  const p = centerCurve.getPointAt(tMove);
  centerCurve.getTangentAt(tMove, tangent).normalize();

  camera.position.copy(p).add(lift);

  // forward target
  forwardLook.copy(p).addScaledVector(tangent, lookAhead).add(lift);

  // center target
  centerLook.copy(centerPoint);

  // During the cutscene range, blend looking toward center, then back
  // This is independent of who drives tMove (scroll or cutscene)
  const w = pulse(0.48, 0.52, 0.58, 0.62, tMove);
  finalLook.lerpVectors(forwardLook, centerLook, w);

  camera.lookAt(finalLook);

  mover.position.copy(p).add(lift);
  mover.lookAt(forwardLook);

  renderer.render(scene, camera);
}

animate();

// -------------------- Resize --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
