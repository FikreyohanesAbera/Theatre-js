import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a16);
scene.fog = new THREE.Fog(0x0b1020, 12, 42);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 3, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.style.margin = "0";
document.body.style.overflowY = "scroll";
document.body.style.height = "500vh";
document.body.appendChild(renderer.domElement);

// ---------- UI ----------
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

// ---------- LIGHTING ----------
const hemiLight = new THREE.HemisphereLight(0x7aa2ff, 0x05070f, 0.85);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(8, 14, 10);
dirLight.castShadow = true;
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

// ---------- FLOOR ----------
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
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// subtle guide lines
const grid = new THREE.GridHelper(250, 80, 0x203a70, 0x14203e);
grid.position.y = 0.02;
(grid.material as THREE.Material).transparent = true;
(grid.material as THREE.Material).opacity = 0.25;
scene.add(grid);

// ---------- PATH ----------
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

// ---------- HELPERS ----------
function prepareModel(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          m.fog = true;
        });
      } else {
        child.material.fog = true;
      }
    }
  });
}

function setModelOpacity(root: THREE.Object3D, opacity: number) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          m.transparent = true;
          m.opacity = opacity;
        });
      } else {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    }
  });
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

const bikeRoot = new THREE.Group();
scene.add(bikeRoot);

const bikeVisual = new THREE.Group();
bikeRoot.add(bikeVisual);

let bikeModel: THREE.Object3D | null = null;
const loader = new GLTFLoader();
loader.load(
  "/static/scc.glb",
  (gltf) => {
    bikeModel = gltf.scene;
    prepareModel(bikeModel);

    // center the raw model first
    const box = new THREE.Box3().setFromObject(bikeModel);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    bikeModel.position.sub(center);
    bikeModel.position.y += size.y / 2;

    // put model inside correction wrapper
    bikeVisual.add(bikeModel);

    // ---- correction values: tweak these for your model ----
    bikeVisual.scale.setScalar(0.6);     // try 0.3, 0.5, 0.8, 1.2
    bikeVisual.rotation.y = Math.PI;     // flip forward direction if backwards
    bikeVisual.rotation.x = 0;           // use if model points up/down weirdly
    bikeVisual.rotation.z = 0;           // use if model is tilted sideways
    bikeVisual.position.set(0, 0, 0);    // local offset inside root
  },
  undefined,
  (err) => console.error("Error loading bike:", err)
);

// ---------- PLACEHOLDER SCHOOLS ----------
type School = {
  id: string;
  title: string;
  details: string[];
  anchorT: number;
  side: number;
  object: THREE.Group;
  discovered: boolean;
};

function createSchool(color: number) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2, 5),
    new THREE.MeshStandardMaterial({
      color: 0x1a2238,
      roughness: 0.7,
      metalness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.08,
      fog: true,
    })
  );
  base.position.y = 1;
  g.add(base);

  const tower1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 4, 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x26314f,
      roughness: 0.6,
      metalness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.18,
      fog: true,
    })
  );
  tower1.position.set(-1.4, 3, 0.8);
  g.add(tower1);

  const tower2 = tower1.clone();
  tower2.position.set(1.3, 2.6, -0.9);
  g.add(tower2);

  const beacon = new THREE.PointLight(color, 8, 18, 2);
  beacon.position.set(0, 5, 0);
  g.add(beacon);

  return g;
}

const schools: School[] = [
  {
    id: "school1",
    title: "School One",
    details: ["First discovery", "Early foundation", "Appears from the fog"],
    anchorT: 0.22,
    side: -10,
    object: createSchool(0x00eaff),
    discovered: false,
  },
  {
    id: "school2",
    title: "School Two",
    details: ["Second discovery", "STEM growth phase", "Further along the path"],
    anchorT: 0.55,
    side: 10,
    object: createSchool(0xff2fd1),
    discovered: false,
  },
  {
    id: "school3",
    title: "School Three",
    details: ["Final discovery", "Advanced stage", "Deep in the journey"],
    anchorT: 0.86,
    side: -11,
    object: createSchool(0x5b8cff),
    discovered: false,
  },
];

for (const school of schools) {
  const p = path.getPointAt(school.anchorT);
  const tangent = path.getTangentAt(school.anchorT).normalize();
  const sideVec = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  school.object.position.copy(p.clone().add(sideVec.multiplyScalar(school.side)));
  school.object.position.y = 0;

  setModelOpacity(school.object, 0.05);
  scene.add(school.object);
}

// ---------- SCROLL ----------
function getScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

let scrollT = 0;
let activeSchoolId: string | null = null;

// ---------- ANIMATE ----------
function animate() {
  requestAnimationFrame(animate);

  const targetT = getScrollProgress();
  scrollT = THREE.MathUtils.lerp(scrollT, targetT, 0.06);

  const bikePos = path.getPointAt(scrollT);
  const aheadPos = path.getPointAt(Math.min(scrollT + 0.01, 1));

  bikeRoot.position.copy(bikePos);
  bikeRoot.position.y += Math.sin(performance.now() * 0.003) * 0.08;
  bikeRoot.lookAt(aheadPos);

  // camera behind and above the bike
  const backward = new THREE.Vector3();
  bikeRoot.getWorldDirection(backward);

  const camPos = bikePos
    .clone()
    .add(backward.clone().multiplyScalar(-7.5))
    .add(new THREE.Vector3(0, 3.2, 0));

  camera.position.lerp(camPos, 0.08);
  camera.lookAt(aheadPos.clone().add(new THREE.Vector3(0, 1.2, 0)));

  let nearestSchool: School | null = null;
  let nearestDist = Infinity;

  for (const school of schools) {
    const dist = bikeRoot.position.distanceTo(school.object.position);

    const reveal = 1 - smoothstep(10, 28, dist);
    const opacity = THREE.MathUtils.clamp(0.03 + reveal * 0.97, 0.03, 1);
    setModelOpacity(school.object, opacity);

    if (dist < 16 && dist < nearestDist) {
      nearestDist = dist;
      nearestSchool = school;
    }
  }

  if (nearestSchool && activeSchoolId !== nearestSchool.id) {
    activeSchoolId = nearestSchool.id;
    setInfo(nearestSchool.title, nearestSchool.details);
  } else if (!nearestSchool && activeSchoolId !== null) {
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

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});