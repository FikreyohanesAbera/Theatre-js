import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// -------------------- Scroll spacer --------------------
document.body.style.margin = "0";
document.body.style.overflowX = "hidden";

const spacer = document.createElement("div");
spacer.style.height = "1000vh";
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
  if (tmpRight.lengthSq() < 1e-8) {
    tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
  }
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

scene.add(
  new THREE.Mesh(
    new THREE.TubeGeometry(leftCurve, railSegments, railRadius, 12, true),
    railMat
  )
);
scene.add(
  new THREE.Mesh(
    new THREE.TubeGeometry(rightCurve, railSegments, railRadius, 12, true),
    railMat
  )
);

// -------------------- Sleepers (recycled pool) --------------------
// Only a small number of sleepers exist.
// They get repositioned in front of the camera as you move forward.

const SLEEPERS_AHEAD = 2; // meters shown ahead
const SLEEPERS_BEHIND = 2; // meters kept behind (helps avoid gaps on turns)
const SLEEPER_SPACING = 0.45; // meters between sleepers

const sleeperPoolCount = Math.ceil(
  (SLEEPERS_AHEAD + SLEEPERS_BEHIND) / SLEEPER_SPACING
);

const sleeperSize = new THREE.Vector3(gauge * 1.0, 0.03, 0.25);

const sleepers = new THREE.InstancedMesh(
  new THREE.BoxGeometry(sleeperSize.x, sleeperSize.y, sleeperSize.z),
  new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.95 }),
  sleeperPoolCount
);
sleepers.frustumCulled = false;
sleepers.instanceColor = new THREE.InstancedBufferAttribute(
  new Float32Array(sleeperPoolCount * 3),
  3
);

scene.add(sleepers);

// Precompute curve length so we can work in meters
const curveLength = centerCurve.getLength();

// Reusable temps (avoid creating new objects every update)
const sleeperM4 = new THREE.Matrix4();
const sleeperQuat = new THREE.Quaternion();
const sleeperScale = new THREE.Vector3();
const sleeperPos = new THREE.Vector3();
const sleeperBasis = new THREE.Matrix4();

let lastSleeperStep = -1;

// Convert distance along the loop to a t for getPointAt / getTangentAt
function distToT(dist: number) {
  const d = ((dist % curveLength) + curveLength) % curveLength; // wrap [0, L)
  const u = d / curveLength; // normalized [0,1)
  return u;
}


function updateSleepers(tMove: number) {
  const currentDist = tMove * curveLength;

  // Only update when you cross a sleeper spacing step
  const step = Math.floor(currentDist / SLEEPER_SPACING);
  if (step === lastSleeperStep) return;
  lastSleeperStep = step;

  for (let i = 0; i < sleeperPoolCount; i++) {
    // i starts behind and goes forward
    const localOffset = i * SLEEPER_SPACING - SLEEPERS_BEHIND;
    const sleeperDist = currentDist + localOffset;

    const t = distToT(sleeperDist);

    const p = centerCurve.getPointAt(t);
    centerCurve.getTangentAt(t, tangent).normalize();

    tmpRight.crossVectors(WORLD_UP, tangent);
    if (tmpRight.lengthSq() < 1e-8) {
      tmpRight.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
    }
    tmpRight.normalize();

    tmpUp.crossVectors(tangent, tmpRight).normalize();
    const isNewest = i === sleeperPoolCount - 1;

    // brown normally
    const base = new THREE.Color(0x35af23);

    // bright red for the newest one
    const debug = new THREE.Color(0xff3333);

    sleepers.setColorAt(i, isNewest ? debug : base);


    sleeperBasis.makeBasis(tmpRight, tmpUp, tangent);
    sleeperQuat.setFromRotationMatrix(sleeperBasis);

    sleeperPos.copy(p).addScaledVector(tmpUp, -0.06);

    // Small "animate in" feel: sleepers far ahead are smaller, near are full
    const ahead01 = THREE.MathUtils.clamp(
      (localOffset + SLEEPERS_BEHIND) / (SLEEPERS_AHEAD + SLEEPERS_BEHIND),
      0,
      1
    );
    const pop = THREE.MathUtils.smoothstep(ahead01, 0.0, 0.25);
    const s = THREE.MathUtils.lerp(0.2, 1.0, pop);
    sleeperScale.set(1, 1, 1);

    sleeperM4.compose(sleeperPos, sleeperQuat, sleeperScale);
    sleepers.setMatrixAt(i, sleeperM4);
  }
  sleepers.instanceColor!.needsUpdate = true;


  sleepers.instanceMatrix.needsUpdate = true;
}


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
  t: 0, // actual camera progress
  scrollT: 0, // scroll-driven progress
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
  ScrollTrigger.update();
}

// -------------------- Trigger the cutscene at the right time --------------------
function tryStartCutscene() {
  if (cutscenePlayed) return;

  if (ride.scrollT >= CUT_START) {
    cutscenePlayed = true;
    inCutscene = true;

    ride.t = CUT_START;

    gsap.to(ride, {
      t: CUT_END,
      duration: 4.0,
      ease: "power2.inOut",
      onComplete: () => {
        inCutscene = false;
        setScrollToProgress(CUT_END);
      },
    });
  }
}

// -------------------- Render loop --------------------
function animate() {
  requestAnimationFrame(animate);

  tryStartCutscene();

  const tMove = ((ride.t % 1) + 1) % 1;

  // Update sleepers pool based on movement
  updateSleepers(tMove);

  const p = centerCurve.getPointAt(tMove);
  centerCurve.getTangentAt(tMove, tangent).normalize();

  camera.position.copy(p).add(lift);

  // forward target
  forwardLook.copy(p).addScaledVector(tangent, lookAhead).add(lift);

  // center target
  centerLook.copy(centerPoint);

  // During the cutscene range, blend looking toward center, then back
  const w = pulse(0.48, 0.52, 0.58, 0.62, tMove);
  finalLook.lerpVectors(forwardLook, centerLook, w);

  camera.lookAt(finalLook);

  mover.position.copy(p).add(lift);
  mover.lookAt(forwardLook);

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
