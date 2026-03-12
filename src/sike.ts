import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a16);
scene.fog = new THREE.Fog(0x0b1020, 3, 20);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

document.body.style.margin = "0";
document.body.style.overflowY = "scroll";
document.body.style.height = "500vh";
document.body.appendChild(renderer.domElement);

// =========================
// UI
// =========================
const infoPanel = document.createElement("div");
infoPanel.style.position = "fixed";
infoPanel.style.right = "24px";
infoPanel.style.bottom = "24px";
infoPanel.style.width = "320px";
infoPanel.style.padding = "16px";
infoPanel.style.background = "rgba(5,10,25,0.78)";
infoPanel.style.border = "1px solid rgba(0,234,255,0.6)";
infoPanel.style.boxShadow = "0 0 20px rgba(0,234,255,0.18)";
infoPanel.style.backdropFilter = "blur(10px)";
infoPanel.style.color = "#dff8ff";
infoPanel.style.fontFamily = "Arial, sans-serif";
infoPanel.style.zIndex = "10";
infoPanel.innerHTML = `
  <div style="color:#00eaff;font-weight:bold;font-size:18px;margin-bottom:8px;">TRAVEL MODE</div>
  <div style="opacity:0.9;line-height:1.5;">
    Scroll to move through the fog.<br>
    Schools will be discovered along the route.
  </div>
`;
document.body.appendChild(infoPanel);

function setInfo(title: string, lines: string[]) {
  infoPanel.innerHTML = `
    <div style="color:#00eaff;font-weight:bold;font-size:18px;margin-bottom:8px;">${title}</div>
    <div style="opacity:0.92;line-height:1.6;">
      ${lines.map((l) => `• ${l}`).join("<br>")}
    </div>
  `;
}

// =========================
// LIGHTING
// =========================
scene.add(new THREE.HemisphereLight(0x7aa2ff, 0x05070f, 0.85));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(8, 14, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

const cyanLight = new THREE.PointLight(0x00eaff, 12, 30, 2);
cyanLight.position.set(8, 5, 10);
scene.add(cyanLight);

const magentaLight = new THREE.PointLight(0xff2fd1, 10, 26, 2);
magentaLight.position.set(-8, 4, -5);
scene.add(magentaLight);

const blueBackLight = new THREE.PointLight(0x3b5bff, 10, 40, 2);
blueBackLight.position.set(0, 6, -40);
scene.add(blueBackLight);

// =========================
// FLOOR
// =========================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(250, 250),
  new THREE.MeshStandardMaterial({
    color: 0x10182c,
    roughness: 0.95,
    metalness: 0.05,
    fog: true,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(250, 80, 0x203a70, 0x14203e);
grid.position.y = 0.02;
if (Array.isArray(grid.material)) {
  grid.material.forEach((m) => {
    m.transparent = true;
    m.opacity = 0.25;
  });
} else {
  grid.material.transparent = true;
  grid.material.opacity = 0.25;
}
scene.add(grid);

// =========================
// PATH
// =========================
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 2.0, 10),
  new THREE.Vector3(4, 2.2, -8),
  new THREE.Vector3(-6, 2.1, -28),
  new THREE.Vector3(8, 2.3, -50),
  new THREE.Vector3(-7, 2.0, -74),
  new THREE.Vector3(6, 2.2, -98),
  new THREE.Vector3(0, 2.0, -125),
]);

const pathPoints = path.getPoints(300);
const pathLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(pathPoints),
  new THREE.LineBasicMaterial({
    color: 0x1d4ed8,
    transparent: true,
    opacity: 0.35,
  })
);
scene.add(pathLine);

// =========================
// HELPERS
// =========================
function prepareModel(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => {
          const cloned = m.clone();
          cloned.fog = true;
          return cloned;
        });
      } else {
        child.material = child.material.clone();
        child.material.fog = true;
      }
    }
  });
}

function setModelOpacity(root: THREE.Object3D, opacity: number) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const fullOpaque = opacity >= 0.999;

    if (Array.isArray(child.material)) {
      child.material.forEach((m) => {
        m.opacity = opacity;
        m.transparent = !fullOpaque;
        m.depthWrite = fullOpaque;
        m.needsUpdate = true;
      });
    } else {
      child.material.opacity = opacity;
      child.material.transparent = !fullOpaque;
      child.material.depthWrite = fullOpaque;
      child.material.needsUpdate = true;
    }
  });
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function pulse(a: number, b: number, c: number, d: number, x: number) {
  const up = smoothstep(a, b, x);
  const down = 1 - smoothstep(c, d, x);
  return Math.min(up, down);
}

function getScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

// =========================
// HOVER BIKE
// =========================
const loader = new GLTFLoader();

const bikeRoot = new THREE.Group();
scene.add(bikeRoot);

const bikeVisual = new THREE.Group();
bikeRoot.add(bikeVisual);

const cameraRig = new THREE.Object3D();
bikeRoot.add(cameraRig);

const BIKE_SCALE = 0.03;
const BIKE_ROT_X = 0;
const BIKE_ROT_Y = -Math.PI / 2;
const BIKE_ROT_Z = 0;
const BIKE_OFFSET_X = 0;
const BIKE_OFFSET_Y = 0;
const BIKE_OFFSET_Z = 0;

loader.load(
  "/static/cha.glb",
  (gltf) => {
    const rawBike = gltf.scene;
    prepareModel(rawBike);

    rawBike.position.set(0, 0, 0);
    rawBike.rotation.set(0, 0, 0);
    rawBike.scale.set(1, 1, 1);

    const box = new THREE.Box3().setFromObject(rawBike);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    rawBike.position.sub(center);
    rawBike.position.y += size.y / 2;

    bikeVisual.add(rawBike);
    bikeVisual.scale.setScalar(BIKE_SCALE);
    bikeVisual.rotation.set(BIKE_ROT_X, BIKE_ROT_Y, BIKE_ROT_Z);
    bikeVisual.position.set(BIKE_OFFSET_X, BIKE_OFFSET_Y, BIKE_OFFSET_Z);

    // FPP position
    cameraRig.position.set(0, 2.9, -1.5);
    cameraRig.rotation.set(0, Math.PI, 0);

    console.log("Bike size:", size);
  },
  undefined,
  (err) => console.error("Error loading bike:", err)
);

const bikeGlow1 = new THREE.PointLight(0x00eaff, 4, 12, 2);
bikeGlow1.position.set(0, 1.8, 2.5);
bikeRoot.add(bikeGlow1);

const bikeGlow2 = new THREE.PointLight(0xff2fd1, 3, 10, 2);
bikeGlow2.position.set(0, 1.6, -2.0);
bikeRoot.add(bikeGlow2);

// =========================
// SCHOOLS
// =========================
type School = {
  id: string;
  title: string;
  details: string[];
  anchorT: number;
  side: number;
  object: THREE.Group | null;
};

const schools: School[] = [
  {
    id: "school1",
    title: "School One",
    details: ["First discovery", "Early foundation", "Appears from the fog"],
    anchorT: 0.22,
    side: -10,
    object: null,
  },
  {
    id: "school2",
    title: "School Two",
    details: ["Second discovery", "STEM growth phase", "Further along the path"],
    anchorT: 0.55,
    side: 10,
    object: null,
  },
  {
    id: "school3",
    title: "School Three",
    details: ["Final discovery", "Advanced stage", "Deep in the journey"],
    anchorT: 0.86,
    side: -11,
    object: null,
  },
];

const SCHOOL_URL = "/static/school.glb";
const SCHOOL_SCALE = 2.2;
const SCHOOL_ROT_Y = 0;

loader.load(
  SCHOOL_URL,
  (gltf) => {
    const schoolTemplate = gltf.scene;
    prepareModel(schoolTemplate);

    schoolTemplate.position.set(0, 0, 0);
    schoolTemplate.rotation.set(0, 0, 0);
    schoolTemplate.scale.set(1, 1, 1);

    const templateBox = new THREE.Box3().setFromObject(schoolTemplate);
    const templateCenter = new THREE.Vector3();
    const templateSize = new THREE.Vector3();
    templateBox.getCenter(templateCenter);
    templateBox.getSize(templateSize);

    schoolTemplate.position.sub(templateCenter);
    schoolTemplate.position.y += templateSize.y / 2;

    for (const school of schools) {
      const schoolInstance = clone(schoolTemplate) as THREE.Group;
      prepareModel(schoolInstance);

      schoolInstance.scale.setScalar(SCHOOL_SCALE);
      schoolInstance.rotation.y = SCHOOL_ROT_Y;

      const p = path.getPointAt(school.anchorT);
      const tangent = path.getTangentAt(school.anchorT).normalize();
      const sideVec = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      schoolInstance.position.copy(p.clone().add(sideVec.multiplyScalar(school.side)));
      schoolInstance.position.y = 7;

      setModelOpacity(schoolInstance, 0);
      scene.add(schoolInstance);

      school.object = schoolInstance;
    }
  },
  undefined,
  (err) => {
    console.error("Error loading school GLB:", err);
  }
);

// =========================
// ANIMATION HELPERS
// =========================
let scrollT = 0;
let activeSchoolId: string | null = null;

const camWorldPos = new THREE.Vector3();
const forwardLook = new THREE.Vector3();
const schoolLook = new THREE.Vector3();
const finalLook = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const targetQuat = new THREE.Quaternion();
const lookMatrix = new THREE.Matrix4();

// =========================
// ANIMATE
// =========================
function animate() {
  requestAnimationFrame(animate);

  const targetT = getScrollProgress();
  scrollT = THREE.MathUtils.lerp(scrollT, targetT, 0.04);

  const bikePos = path.getPointAt(scrollT);
  const aheadPos = path.getPointAt(Math.min(scrollT + 0.01, 1));

  bikeRoot.position.copy(bikePos);
  bikeRoot.position.y += Math.sin(performance.now() * 0.003) * 0.01;
  bikeRoot.lookAt(aheadPos);

  let nearestSchool: School | null = null;
  let nearestDist = Infinity;

  for (const school of schools) {
    if (!school.object) continue;

    const dist = bikeRoot.position.distanceTo(school.object.position);

    const reveal = 1 - smoothstep(10, 28, dist);
    const opacity = THREE.MathUtils.clamp(reveal, 0, 1);
    setModelOpacity(school.object, opacity);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestSchool = school;
    }
  }

  cameraRig.getWorldPosition(camWorldPos);
  camera.position.copy(camWorldPos);

  // normal forward target
  forwardLook.copy(path.getPointAt(Math.min(scrollT + 0.03, 1)));
  forwardLook.y += 1.4;

  // default school target = same as forward
  schoolLook.copy(forwardLook);

  // smooth focus weight exactly like the reference idea
  let focusWeight = 0;

  if (nearestSchool && nearestSchool.object) {
    nearestSchool.object.getWorldPosition(schoolLook);
    schoolLook.y += 2.5;

    const a = Math.max(0, nearestSchool.anchorT - 0.08);
    const b = Math.max(0, nearestSchool.anchorT - 0.03);
    const c = Math.min(1, nearestSchool.anchorT + 0.03);
    const d = Math.min(1, nearestSchool.anchorT + 0.10);

    focusWeight = pulse(a, b, c, d, scrollT);
  }

  finalLook.lerpVectors(forwardLook, schoolLook, focusWeight);

  lookMatrix.lookAt(camWorldPos, finalLook, up);
  targetQuat.setFromRotationMatrix(lookMatrix);
  camera.quaternion.slerp(targetQuat, 0.06);

  // info panel can still switch normally
  if (nearestSchool && focusWeight > 0.35 && activeSchoolId !== nearestSchool.id) {
    activeSchoolId = nearestSchool.id;
    setInfo(nearestSchool.title, nearestSchool.details);
  } else if (focusWeight < 0.1 && activeSchoolId !== null) {
    activeSchoolId = null;
    setInfo("TRAVEL MODE", [
      "Cruising through the fog",
      "Scanning for next school",
      "Keep scrolling forward",
    ]);
  }

  renderer.render(scene, camera);
}

animate();

// =========================
// RESIZE
// =========================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});