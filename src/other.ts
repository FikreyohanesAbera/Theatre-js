// src/main.ts
import * as THREE from "three";
import "./style.css";

/**
 * Projects World (single canvas, single renderer) with:
 * - ONE rectangle (plane) per project
 * - Project title as aligned 3D plane text ABOVE the rectangle
 * - Click rectangle to ENTER focus: camera moves in and centers it
 * - While focused: the rectangle cycles through multiple images
 * - Cards face the ROAD by default; when camera approaches they tilt ~45° toward camera (stable, no shaking)
 * - Fixes "shaking" by:
 *    1) using baseCardQuat (not current) for sign decision
 *    2) dead zone + stored tiltSign per station
 *
 * Put your images in /public:
 *   public/projects/efoyta-1.jpg
 *   public/projects/efoyta-2.jpg
 *   public/projects/lockout-1.jpg
 *   public/projects/lockout-2.jpg
 *   public/projects/opinion-1.jpg
 *   public/projects/opinion-2.jpg
 */

// --------------------------------------------
// Renderer
// --------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// --------------------------------------------
// Scene
// --------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.FogExp2(0x090614, 0.07);

// --------------------------------------------
// Camera
// --------------------------------------------
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 1.65, 6);

// --------------------------------------------
// Lights
// --------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

const purpleRim = new THREE.DirectionalLight(0xb45cff, 0.95);
purpleRim.position.set(-10, 10, 6);
scene.add(purpleRim);

const cyanRim = new THREE.DirectionalLight(0x2de2ff, 0.75);
cyanRim.position.set(10, 7, -10);
scene.add(cyanRim);

const pinkGlow = new THREE.PointLight(0xff3ea5, 2.6, 90, 2);
pinkGlow.position.set(0, 2.2, -65);
scene.add(pinkGlow);

const cyanGlow = new THREE.PointLight(0x2de2ff, 1.35, 60, 2);
cyanGlow.position.set(1.5, 1.6, -30);
scene.add(cyanGlow);

// --------------------------------------------
// Helpers
// --------------------------------------------
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function makeEmissiveMaterial(emissiveHex: number, intensity: number) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: emissiveHex,
    emissiveIntensity: intensity,
    roughness: 1,
    metalness: 0,
  });
}

const tmpMat = new THREE.Matrix4();
const tmpUp = new THREE.Vector3(0, 1, 0);
const tmpQuat = new THREE.Quaternion();
function lookAtQuaternion(from: THREE.Vector3, to: THREE.Vector3) {
  tmpMat.lookAt(from, to, tmpUp);
  tmpQuat.setFromRotationMatrix(tmpMat);
  return tmpQuat.clone();
}

function expMoveVec3(current: THREE.Vector3, target: THREE.Vector3, dt: number, speed: number) {
  const t = 1 - Math.pow(1 - speed, dt * 60);
  current.lerp(target, t);
}

function expMoveNumber(current: number, target: number, dt: number, speed: number) {
  const t = 1 - Math.pow(1 - speed, dt * 60);
  return current + (target - current) * t;
}

// --------------------------------------------
// Curve (camera travel path)
// --------------------------------------------
const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(-1.3, 0, -10),
    new THREE.Vector3(1.2, 0, -24),
    new THREE.Vector3(0.4, 0, -38),
    new THREE.Vector3(-1.0, 0, -58),
    new THREE.Vector3(-0.2, 0, -82),
    new THREE.Vector3(0.6, 0, -104),
    new THREE.Vector3(-0.5, 0, -128),
  ],
  false,
  "catmullrom",
  0.25
);

const PATH_WIDTH = 3.0;

function approximateDistanceToPath(x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const p = curve.getPoint(t);
    const dx = x - p.x;
    const dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

function isOnRoad(x: number, z: number) {
  return approximateDistanceToPath(x, z) < PATH_WIDTH * 0.6;
}

// --------------------------------------------
// Ground and Road
// --------------------------------------------
const groundGeo = new THREE.PlaneGeometry(160, 260, 1, 1);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x07050d, roughness: 1.0, metalness: 0.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.set(0, -0.06, -85);
scene.add(ground);

function buildRoadRibbon(c: THREE.CatmullRomCurve3, width: number, segments = 320) {
  const pts = c.getPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const t = i / (pts.length - 1);

    const tangent = c.getTangent(t).normalize();
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
    color: 0x14101f,
    roughness: 0.22,
    metalness: 0.35,
  });

  return new THREE.Mesh(geo, mat);
}
scene.add(buildRoadRibbon(curve, PATH_WIDTH, 320));

// --------------------------------------------
// Neon edge dots
// --------------------------------------------
const dotGeo = new THREE.SphereGeometry(0.06, 10, 10);
const dotMatCyan = makeEmissiveMaterial(0x2de2ff, 4.8);
const dotMatPink = makeEmissiveMaterial(0xff3ea5, 4.8);

const DOT_COUNT = 210;
const dotsCyan = new THREE.InstancedMesh(dotGeo, dotMatCyan, Math.ceil(DOT_COUNT / 2));
const dotsPink = new THREE.InstancedMesh(dotGeo, dotMatPink, Math.floor(DOT_COUNT / 2));
scene.add(dotsCyan, dotsPink);

{
  const dummy = new THREE.Object3D();
  let c = 0;
  let p = 0;

  for (let i = 0; i < DOT_COUNT; i++) {
    const t = i / (DOT_COUNT - 1);
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize();

    const side = i % 2 === 0 ? 1 : -1;
    const offset = (PATH_WIDTH * 0.5 - 0.12) * side;

    dummy.position.set(pt.x + left.x * offset, 0.06, pt.z + left.z * offset);
    dummy.updateMatrix();

    if (i % 2 === 0) dotsCyan.setMatrixAt(c++, dummy.matrix);
    else dotsPink.setMatrixAt(p++, dummy.matrix);
  }
  dotsCyan.instanceMatrix.needsUpdate = true;
  dotsPink.instanceMatrix.needsUpdate = true;
}

// --------------------------------------------
// Buildings
// (static scatter; replace with curve-sampled if you want the whole city to "follow" the road)
// --------------------------------------------
const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x0c0913, roughness: 1, metalness: 0 });

const BUILDING_COUNT = 220;
const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, BUILDING_COUNT);
scene.add(buildings);

{
  const d = new THREE.Object3D();

  for (let i = 0; i < BUILDING_COUNT; i++) {
    let x = 0;
    let z = 0;

    for (let tries = 0; tries < 30; tries++) {
      const side = i % 2 === 0 ? 1 : -1;
      x = side * rand(5.0, 19.0);
      z = rand(6, -150);
      if (!isOnRoad(x, z)) break;
    }

    const h = rand(4, 28);
    const sx = rand(1.2, 5.0);
    const sz = rand(1.2, 7.0);

    d.scale.set(sx, h, sz);
    d.position.set(x, h * 0.5 - 0.02, z);
    d.rotation.y = rand(-0.35, 0.35);
    d.updateMatrix();
    buildings.setMatrixAt(i, d.matrix);
  }

  buildings.instanceMatrix.needsUpdate = true;
}

// --------------------------------------------
// Fog particles
// --------------------------------------------
const particleCount = 3600;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
const particleSpd = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const ix = i * 3;
  particlePos[ix + 0] = (Math.random() - 0.5) * 46;
  particlePos[ix + 1] = Math.random() * 12;
  particlePos[ix + 2] = 10 - Math.random() * 170;
  particleSpd[i] = 0.15 + Math.random() * 0.9;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

const particleMat = new THREE.PointsMaterial({
  size: 0.035,
  color: 0xffffff,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// --------------------------------------------
// Distant glow orb
// --------------------------------------------
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(1.9, 18, 18),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff3ea5,
    emissiveIntensity: 2.2,
    roughness: 1,
    metalness: 0,
  })
);
orb.position.set(0.6, 3.2, -112);
scene.add(orb);


// ============================================================
// TRANSPARENT VIDEO GATE (placed ON the path, camera passes through it)
// - Put /op_alpha.webm in /public
// - VP9 + alpha (WebM) recommended
// ============================================================

const VIDEO_T = 0.42; // 0..1 along the curve (move this to reposition the gate)
const VIDEO_CENTER_Y = 1.55; // around camera height (camera is ~1.65)
const VIDEO_BASE_H = 3.0; // world height of the gate (big enough to pass through)

// ---- Video element ----
const video = document.createElement("video");
video.src = "/op_alpha.webm";
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true; // required for autoplay
video.playsInline = true;
video.preload = "auto";
video.autoplay = true;

// Try to play; if blocked, a user gesture will be needed
async function tryPlay() {
  try {
    await video.play();
  } catch {
    // autoplay blocked
  }
}
void tryPlay();

// One click anywhere will start the video if autoplay is blocked
window.addEventListener("pointerdown", () => void tryPlay(), { once: true });

// ---- Video texture ----
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;
videoTexture.colorSpace = THREE.SRGBColorSpace;
const VIDEO_BRIGHTNESS = 1.6; // 1 = original, 2 = twice as bright, etc.
const videoMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: {
    uMap: { value: videoTexture },
    uBrightness: { value: VIDEO_BRIGHTNESS },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uMap;
    uniform float uBrightness;

    void main() {
      vec4 c = texture2D(uMap, vUv);

      // brighten RGB, keep alpha as-is
      c.rgb *= uBrightness;

      // optional: prevent blowing out too hard
      c.rgb = min(c.rgb, vec3(1.0));

      gl_FragColor = c;
    }
  `,
});
(videoMat as THREE.ShaderMaterial).toneMapped = false;

const videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), videoMat);

// Place it ON the road center at VIDEO_T
const gatePos = curve.getPoint(VIDEO_T);
videoPlane.position.set(gatePos.x, VIDEO_CENTER_Y, gatePos.z);

// Orient it like a "gate" across the road so the camera drives through it
// (plane normal aligned with path tangent in XZ)
const gateTangent = curve.getTangent(VIDEO_T).normalize();
gateTangent.y = 0;
if (gateTangent.lengthSq() > 1e-6) gateTangent.normalize();

videoPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), gateTangent);

// Scale to match video aspect ratio once metadata is available
video.addEventListener("loadedmetadata", () => {
  const w = video.videoWidth || 1;
  const h = video.videoHeight || 1;
  const aspect = w / h;

  // Keep height = VIDEO_BASE_H, width = aspect * height
  videoPlane.scale.set(aspect * VIDEO_BASE_H, VIDEO_BASE_H, 1);
});

scene.add(videoPlane);

// ============================================================
// PROJECT STATIONS
// ============================================================

/**
 * Transition types (integer codes used in shader):
 * 0 = Crossfade
 * 1 = Noise dissolve
 * 2 = Diagonal wipe
 * 3 = Scanline reveal
 * 4 = Glitch RGB split
 * 5 = Ripple distortion
 */
type TransitionType = 0 | 1 | 2 | 3 | 4 | 5;

type Project = {
  id: string;
  title: string;
  dates: string;
  tech: string;
  bullets: string[];
  imageUrls: string[];
  stationT: number; // 0..1 on curve
  side: 1 | -1;
  accent: number;
  transitions: TransitionType[];
};

const projects: Project[] = [
  {
    id: "efoyta",
    title: "Efoyta Doctor Appointment Website",
    dates: "Oct 2023 – Jan 2024",
    tech: "React, Node.js (Express), PostgreSQL, Stripe",
    bullets: [
      "Built a telemedicine platform allowing patients to find doctors, book appointments, and pay online, improving booking efficiency by 40% compared to manual scheduling.",
      "Designed and deployed an admin dashboard for monitoring doctor availability and patient activity, reducing admin overhead by 25%.",
    ],
    imageUrls: ["/ok.png", "/track_tile.png"],
    stationT: 0.28,
    side: 1,
    accent: 0x2de2ff,
    transitions: [3, 1, 4, 0, 5],
  },
  {
    id: "lockout",
    title: "Competitive Programming Lockout Web App",
    dates: "Jun 2025 – Sep 2025",
    tech: "Go, React, WebSockets, PostgreSQL",
    bullets: [
      "Built a real-time competitive programming platform supporting 1v1, 2v2, and rated lockout modes, with screen sharing, chat, and spectator functionalities.",
      "Implemented concurrency controls and WebSockets, enabling 100+ simultaneous players with under 200ms latency.",
    ],
    imageUrls: ["/projects/lockout-1.jpg", "/projects/lockout-2.jpg"],
    stationT: 0.56,
    side: -1,
    accent: 0xff3ea5,
    transitions: [4, 1, 2, 5, 0, 3],
  },
  {
    id: "opinion",
    title: "Multimodal Social Media Brand Opinion Mining",
    dates: "Oct 2025 – Dec 2025",
    tech: "Next.js, FastAPI, PyTorch",
    bullets: [
      "Built an end-to-end social media analytics pipeline for brand opinion mining, aggregating content from YouTube, Instagram, and Facebook and producing actionable sentiment and trend insights.",
      "Implemented data cleaning and topic/theme extraction to summarize key drivers of positive/negative sentiment across platforms.",
    ],
    imageUrls: ["/projects/opinion-1.jpg", "/projects/opinion-2.jpg"],
    stationT: 0.83,
    side: 1,
    accent: 0xb45cff,
    transitions: [5, 3, 1, 4, 0],
  },
];

// --------------------------------------------
// Texture loading + placeholders
// --------------------------------------------
const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin("anonymous");

function makeNeonPlaceholderTexture(label: string, accentHex: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  const accent = `#${accentHex.toString(16).padStart(6, "0")}`;

  ctx.fillStyle = "#07050d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const g = ctx.createRadialGradient(660, 180, 60, 660, 180, 950);
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 10;
  ctx.strokeStyle = accent;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("ADD PROJECT IMAGE", 64, 120);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(label, 64, 175);

  ctx.fillStyle = accent;
  ctx.font = "700 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Place files in /public/…", 64, canvas.height - 72);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

function loadImageTexture(url: string, fallback: THREE.Texture) {
  return new Promise<THREE.Texture>((resolve) => {
    texLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        resolve(tex);
      },
      undefined,
      () => resolve(fallback)
    );
  });
}

// --------------------------------------------
// Title plane (aligned with rectangle)
// --------------------------------------------
function makeTitlePlane(text: string, accentHex: number, worldWidth: number, worldHeight: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const accent = `#${accentHex.toString(16).padStart(6, "0")}`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = accent;
  ctx.font = "900 72px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(text, canvas.width / 2 + 6, canvas.height / 2 + 6);

  ctx.globalAlpha = 1.0;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = accent;
  ctx.fillRect(canvas.width / 2 - 360, canvas.height / 2 + 54, 720, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), mat);
}

// ============================================================
// Shader for image transitions
// ============================================================
const transitionVertex = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const transitionFragment = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;

uniform float uProgress;
uniform float uTime;
uniform float uTransition;
uniform float uNoiseScale;
uniform float uGlitchStrength;

uniform vec3 uTint;
uniform float uVignette;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec4 sampleTex(sampler2D t, vec2 uv) {
  return texture2D(t, uv);
}

vec3 applyVignette(vec3 col, vec2 uv, float strength) {
  vec2 p = uv * 2.0 - 1.0;
  float v = 1.0 - strength * dot(p, p);
  v = clamp(v, 0.0, 1.0);
  return col * v;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float tr = floor(uTransition + 0.5);
  vec2 uv = vUv;
  float vign = uVignette;

  vec4 a = sampleTex(uTexA, uv);
  vec4 b = sampleTex(uTexB, uv);

  // 0 Crossfade
  if (tr < 0.5) {
    vec3 col = mix(a.rgb, b.rgb, p);
    float n = noise(uv * 220.0 + uTime * 0.8) * 0.03;
    col += n;
    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // 1 Noise dissolve
  if (tr < 1.5) {
    float n = noise(uv * (uNoiseScale * 2.0) + uTime * 0.4);
    float thresh = smoothstep(p - 0.08, p + 0.08, n);
    vec3 col = mix(a.rgb, b.rgb, thresh);
    float grain = noise(uv * 380.0 + uTime * 1.2) * 0.04;
    col += grain * (0.4 + 0.6 * thresh);
    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // 2 Diagonal wipe
  if (tr < 2.5) {
    float diag = uv.x * 0.9 + uv.y * 0.9;
    float edge = smoothstep(p - 0.07, p + 0.07, diag);
    vec3 col = mix(a.rgb, b.rgb, edge);
    float line = smoothstep(p - 0.01, p + 0.01, diag) - smoothstep(p + 0.01, p + 0.03, diag);
    col += line * (0.25 * uTint + vec3(0.10));
    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // 3 Scanline reveal
  if (tr < 3.5) {
    float y = uv.y;
    float edge = smoothstep(p - 0.06, p + 0.06, y);
    vec3 col = mix(a.rgb, b.rgb, edge);
    float scan = sin((uv.y + uTime * 0.8) * 240.0) * 0.02;
    col += scan * (0.4 + 0.6 * edge);
    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // 4 Glitch RGB split
  if (tr < 4.5) {
    float g = noise(vec2(uTime * 2.0, uv.y * 8.0));
    float burst = smoothstep(0.78, 0.98, g);
    float shift = burst * uGlitchStrength * (0.02 + 0.02 * sin(uTime * 25.0));

    vec2 uvR = uv + vec2( shift, 0.0);
    vec2 uvG = uv + vec2(-shift * 0.5, 0.0);
    vec2 uvB = uv + vec2(-shift, 0.0);

    vec3 aCol = vec3(sampleTex(uTexA, uvR).r, sampleTex(uTexA, uvG).g, sampleTex(uTexA, uvB).b);
    vec3 bCol = vec3(sampleTex(uTexB, uvR).r, sampleTex(uTexB, uvG).g, sampleTex(uTexB, uvB).b);

    float edge = smoothstep(p - 0.08, p + 0.08, noise(uv * (uNoiseScale * 1.6) + uTime));
    vec3 col = mix(aCol, bCol, edge);

    float crack = (noise(vec2(uv.y * 60.0, uTime * 4.0)) - 0.5) * 0.06 * burst;
    col += crack;

    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // 5 Ripple distortion
  {
    vec2 center = vec2(0.5, 0.5);
    vec2 d = uv - center;
    float dist = length(d);

    float wave = sin(18.0 * dist - uTime * 5.0) * 0.012;
    float amp = smoothstep(0.0, 1.0, p) * smoothstep(1.0, 0.0, dist * 1.4);
    vec2 rip = uv + normalize(d + 1e-6) * wave * amp;

    vec3 colA = sampleTex(uTexA, rip).rgb;
    vec3 colB = sampleTex(uTexB, rip).rgb;

    float edge = smoothstep(p - 0.08, p + 0.08, dist + noise(uv * (uNoiseScale * 1.2) + uTime * 0.7) * 0.08);
    vec3 col = mix(colA, colB, edge);

    col = applyVignette(col, uv, vign);
    col *= (0.92 + 0.08 * uTint);
    gl_FragColor = vec4(col, 1.0);
    return;
  }
}
`;

// --------------------------------------------
// Station runtime
// --------------------------------------------
type StationRuntime = {
  project: Project;

  group: THREE.Group; // positioned in world
  card: THREE.Group; // rotated

  basePos: THREE.Vector3;
  anchor: THREE.Vector3;

  baseCardQuat: THREE.Quaternion; // faces the road by default
  tiltSign: 1 | -1; // stable sign (prevents jitter)

  plane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  title: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  frame1: THREE.Mesh;
  frame2: THREE.Mesh;
  beacon: THREE.Mesh;

  textures: THREE.Texture[];
  imageIndex: number;
  transitionIndex: number;

  progress: number;
  swapping: boolean;
  nextSwapAt: number;
};

const stations: StationRuntime[] = [];
const interactables: THREE.Object3D[] = [];

// --------------------------------------------
// Focus system
// --------------------------------------------
type FocusMode = {
  stationId: string;
  object: THREE.Object3D;
  camPos: THREE.Vector3;
  lookAt: THREE.Vector3;
  returnT: number;
};

let focus: FocusMode | null = null;

// --------------------------------------------
// Create project stations
// --------------------------------------------
function makeGlowFrame(width: number, height: number, accentHex: number, opacity: number) {
  const frameGeo = new THREE.PlaneGeometry(width * 1.12, height * 1.12);
  const frameMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(frameGeo, frameMat);
}

async function createStations() {
  for (const p of projects) {
    const group = new THREE.Group();
    group.name = `ProjectStation_${p.id}`;

    const card = new THREE.Group();
    card.name = `Card_${p.id}`;
    group.add(card);

    const t = p.stationT;
    const anchor = curve.getPoint(t);
    const tang = curve.getTangent(t).normalize();
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tang).normalize();

    // Where the station lives (to the side of the path)
    const sideOffset = p.side * (PATH_WIDTH * 0.5 + 3.0);
    const basePos = new THREE.Vector3().copy(anchor).addScaledVector(left, sideOffset);
    basePos.y = 1.9;

    // Plane size
    const planeW = 3.25;
    const planeH = 2.05;

    // Load images
    const fallbackA = makeNeonPlaceholderTexture(`${p.title} (A)`, p.accent);
    const fallbackB = makeNeonPlaceholderTexture(`${p.title} (B)`, p.accent);

    const texA = await loadImageTexture(p.imageUrls[0] ?? "", fallbackA);
    const texB = await loadImageTexture(p.imageUrls[1] ?? "", fallbackB);

    const textures = [texA, texB];

    // Shader material
    const shaderMat = new THREE.ShaderMaterial({
      vertexShader: transitionVertex,
      fragmentShader: transitionFragment,
      transparent: false,
      depthWrite: true,
      uniforms: {
        uTexA: { value: textures[0] },
        uTexB: { value: textures[1] },
        uProgress: { value: 0.0 },
        uTime: { value: 0.0 },
        uTransition: { value: p.transitions[0] ?? 0 },
        uNoiseScale: { value: 6.0 },
        uGlitchStrength: { value: 1.0 },
        uTint: { value: new THREE.Color(p.accent).multiplyScalar(0.35) },
        uVignette: { value: 0.35 },
      },
    });
    shaderMat.toneMapped = false;
    shaderMat.side = THREE.DoubleSide;

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), shaderMat);
    plane.userData = { stationId: p.id, kind: "projectPlane" };
    card.add(plane);

    const title = makeTitlePlane(p.title, p.accent, planeW, 0.55) as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshBasicMaterial
    >;
    title.position.set(0, planeH * 0.5 + 0.42, 0.01);
    card.add(title);

    const frame1 = makeGlowFrame(planeW, planeH, p.accent, 0.10);
    frame1.position.set(0, 0, -0.03);
    card.add(frame1);

    const frame2 = makeGlowFrame(planeW, planeH, p.accent, 0.06);
    frame2.position.set(0, 0, -0.07);
    card.add(frame2);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 14), makeEmissiveMaterial(p.accent, 6.0));
    beacon.position.set(-p.side * 0.55, planeH * 0.55, 0.12);
    card.add(beacon);

    // Position the station
    group.position.copy(basePos);

    // Base orientation: face road (look back toward the anchor on the road)
    const lookTarget = new THREE.Vector3(anchor.x, basePos.y, anchor.z);
    card.lookAt(lookTarget);
    const baseCardQuat = card.quaternion.clone();

    scene.add(group);

    stations.push({
      project: p,
      group,
      card,
      basePos: basePos.clone(),
      anchor: anchor.clone(),

      baseCardQuat,
      tiltSign: p.side, // default stable sign

      plane,
      title,
      frame1,
      frame2,
      beacon,

      textures,
      imageIndex: 0,
      transitionIndex: 0,
      progress: 0,
      swapping: false,
      nextSwapAt: 0,
    });

    interactables.push(plane);
  }
}
createStations().catch((e) => console.error("Station creation failed:", e));

// ============================================================
// Scroll travel (path progress)
// ============================================================
let targetT = 0;
let currentT = 0;

window.addEventListener(
  "wheel",
  (e) => {
    if (focus) return;
    targetT = clamp01(targetT + Math.sign(e.deltaY) * 0.02);
  },
  { passive: true }
);

let touchY = 0;
window.addEventListener("touchstart", (e) => (touchY = e.touches[0]?.clientY ?? 0), { passive: true });
window.addEventListener(
  "touchmove",
  (e) => {
    if (focus) return;
    const y = e.touches[0]?.clientY ?? touchY;
    const dy = y - touchY;
    touchY = y;
    targetT = clamp01(targetT + Math.sign(dy) * 0.02);
  },
  { passive: true }
);

// ============================================================
// Raycasting (hover + click)
// ============================================================
const raycaster = new THREE.Raycaster();
const mouseNdc = new THREE.Vector2();

function updateMouseNdcFromEvent(ev: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (ev.clientX - rect.left) / rect.width;
  const y = (ev.clientY - rect.top) / rect.height;
  mouseNdc.set(x * 2 - 1, -(y * 2 - 1));
}

function pickObject(): THREE.Intersection<THREE.Object3D> | null {
  raycaster.setFromCamera(mouseNdc, camera);
  const hits = raycaster.intersectObjects(interactables, false);
  return hits.length > 0 ? hits[0] : null;
}

function setCursorPointer(isPointer: boolean) {
  document.body.style.cursor = isPointer ? "pointer" : "default";
}

window.addEventListener(
  "pointermove",
  (ev) => {
    updateMouseNdcFromEvent(ev);
    const hit = pickObject();
    setCursorPointer(!!hit?.object);
  },
  { passive: true }
);

function findStationById(id: string) {
  return stations.find((s) => s.project.id === id) ?? null;
}

function exitFocus() {
  focus = null;
}

function enterFocus(stationId: string, obj: THREE.Object3D) {
  const station = findStationById(stationId);
  if (!station) return;

  const returnT = currentT;

  const worldPos = new THREE.Vector3();
  station.plane.getWorldPosition(worldPos);

  const worldQuat = new THREE.Quaternion();
  station.plane.getWorldQuaternion(worldQuat);

  // Plane forward normal (local +Z)
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();

  // Frame distance from plane based on plane height + camera FOV
  const planeHeight = 2.05;
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const padding = 1.22;
  const dist = ((planeHeight * 0.5) / Math.tan(fovRad * 0.5)) * padding;

  const camPos = worldPos.clone().addScaledVector(normal, dist);
  camPos.y += 0.06;

  const lookAt = worldPos.clone();
  lookAt.y += 0.02;

  focus = { stationId, object: obj, camPos, lookAt, returnT };

  station.nextSwapAt = clock.getElapsedTime() + 0.65;
}

window.addEventListener(
  "pointerdown",
  (ev) => {
    updateMouseNdcFromEvent(ev);
    const hit = pickObject();

    // click empty space -> exit focus
    if (!hit?.object) {
      if (focus) exitFocus();
      return;
    }

    const stationId = hit.object.userData?.stationId as string | undefined;
    if (!stationId) return;

    enterFocus(stationId, hit.object);
  },
  { passive: true }
);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") exitFocus();
});

// ============================================================
// Image swap logic
// ============================================================
function startSwap(station: StationRuntime) {
  if (station.textures.length < 2) return;
  if (station.swapping) return;

  const nextImageIndex = (station.imageIndex + 1) % station.textures.length;

  station.plane.material.uniforms.uTexA.value = station.textures[station.imageIndex];
  station.plane.material.uniforms.uTexB.value = station.textures[nextImageIndex];

  const list = station.project.transitions.length > 0 ? station.project.transitions : ([0] as TransitionType[]);
  station.plane.material.uniforms.uTransition.value = list[station.transitionIndex % list.length];

  station.progress = 0;
  station.plane.material.uniforms.uProgress.value = 0;

  station.swapping = true;
}

function updateSwap(station: StationRuntime, dt: number) {
  if (!station.swapping) return;

  station.progress = expMoveNumber(station.progress, 1.0, dt, 0.10);
  station.plane.material.uniforms.uProgress.value = station.progress;

  if (station.progress > 0.985) {
    station.imageIndex = (station.imageIndex + 1) % station.textures.length;
    station.transitionIndex = (station.transitionIndex + 1) % Math.max(1, station.project.transitions.length);
    station.swapping = false;
    station.progress = 1.0;
    station.plane.material.uniforms.uProgress.value = 1.0;
  }
}

// ============================================================
// Animate
// ============================================================
const clock = new THREE.Clock();

const railPos = new THREE.Vector3();
const railLook = new THREE.Vector3();
const forwardLook = new THREE.Vector3();

const stationWorldPos = new THREE.Vector3();
const toCam = new THREE.Vector3();
const baseForward = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const qYaw = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();

function animate() {
  const dt = clock.getDelta();
  const time = clock.getElapsedTime();

  // Update shader time for all stations
  for (const s of stations) {
    s.plane.material.uniforms.uTime.value = time;
  }

  // Camera travel along path if not focused
  if (!focus) {
    currentT = THREE.MathUtils.lerp(currentT, targetT, 1 - Math.pow(0.0001, dt));

    railPos.copy(curve.getPoint(currentT));
    railLook.copy(curve.getPoint(clamp01(currentT + 0.02)));

    camera.position.set(railPos.x, 1.65, railPos.z);
    forwardLook.set(railLook.x, 1.45, railLook.z);

    const q = lookAtQuaternion(camera.position, forwardLook);
    camera.quaternion.slerp(q, 1 - Math.pow(0.00005, dt));
  } else {
    // Focus mode
    expMoveVec3(camera.position, focus.camPos, dt, 0.10);
    const q = lookAtQuaternion(camera.position, focus.lookAt);
    camera.quaternion.slerp(q, 1 - Math.pow(0.00005, dt));
  }

  // Particles drift
  const posAttr = particleGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < particleCount; i++) {
    const ix = i * 3;
    posAttr.array[ix + 0] += Math.sin(time * 0.25 + i) * 0.00065 * particleSpd[i];
    posAttr.array[ix + 1] += 0.00055 * particleSpd[i];
    if (posAttr.array[ix + 1] > 12.5) posAttr.array[ix + 1] = 0.2;
  }
  posAttr.needsUpdate = true;

  // Orb pulse + light flicker
  (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(time * 0.9) * 0.25;
  pinkGlow.intensity = 2.4 + Math.sin(time * 2.2) * 0.25;
  cyanGlow.intensity = 1.3 + Math.sin(time * 2.0 + 1.0) * 0.15;

  // Stations: reveal, tilt, focus highlight, image cycling
  for (const s of stations) {
    // Float motion WITHOUT drifting downward: keep basePos.y + float
    const floatY = Math.sin(time * 0.8 + s.project.stationT * 10.0) * 0.06;
    s.group.position.set(s.basePos.x, s.basePos.y + floatY, s.basePos.z);

    // Reveal based on distance to anchor
    const distToAnchor = camera.position.distanceTo(s.anchor);
    const reveal = smoothstep(18, 7, distToAnchor); // 0 far -> 1 near

    // Fade title and frames with reveal
    s.title.material.opacity = 0.08 + reveal * 0.92;
    (s.frame1.material as THREE.MeshBasicMaterial).opacity = 0.02 + reveal * 0.18;
    (s.frame2.material as THREE.MeshBasicMaterial).opacity = 0.015 + reveal * 0.14;

    // Beacon intensity
    const beaconMat = s.beacon.material as THREE.MeshStandardMaterial;
    const isFocused = focus?.stationId === s.project.id ? 1 : 0;
    beaconMat.emissiveIntensity = 6.0 + isFocused * 6.0;

    // Plane scaling highlight
    s.plane.scale.setScalar(1.0);
    if (isFocused) s.plane.scale.setScalar(1.05);

    // ---------------------------
    // Stable tilt toward camera
    // ---------------------------
    s.card.getWorldPosition(stationWorldPos);

    // direction card -> camera flattened
    toCam.copy(camera.position).sub(stationWorldPos);
    toCam.y = 0;

    if (toCam.lengthSq() > 1e-6) toCam.normalize();

    // forward direction from BASE orientation (NOT current)
    baseForward.set(0, 0, 1).applyQuaternion(s.baseCardQuat);
    baseForward.y = 0;
    if (baseForward.lengthSq() > 1e-6) baseForward.normalize();

    // cross sign in XZ plane (stable because it uses baseForward)
    const crossY = baseForward.x * toCam.z - baseForward.z * toCam.x;

    // dead zone: keep previous sign near 0 to prevent flipping
    const deadZone = 0.04; // try 0.02..0.10
    if (crossY > deadZone) s.tiltSign = -1;
    else if (crossY < -deadZone) s.tiltSign = 1;

    // tilt amount: 0 far, 45° near
    const maxTilt = Math.PI / 4;
    const tilt = reveal * maxTilt * s.tiltSign;

    qYaw.setFromAxisAngle(up, tilt);
    qTarget.copy(s.baseCardQuat).multiply(qYaw);

    // smooth slerp
    s.card.quaternion.slerp(qTarget, 1 - Math.pow(0.00008, dt));

    // Focused: cycle images automatically every few seconds
    if (focus?.stationId === s.project.id) {
      if (!s.swapping && time >= s.nextSwapAt) {
        startSwap(s);
        s.nextSwapAt = time + 3.2;
      }
    }

    // Update swap animation
    updateSwap(s, dt);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// --------------------------------------------
// Resize
// --------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
});