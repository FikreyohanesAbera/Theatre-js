// src/main.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Creates everything in TypeScript:
 * - Creates the canvas element in code (no canvas in HTML)
 * - Loads your transparent WebM (VP9 + alpha) as a VideoTexture
 * - Renders it on a plane with real transparency
 */

// ------------------------- Canvas (created in code) -------------------------
const canvas = document.createElement("canvas");
canvas.style.position = "fixed";
canvas.style.inset = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
canvas.style.zIndex = "1";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(canvas);

// Optional: page background (so you can clearly see alpha works)
document.body.style.background = "#0b0710";

// ------------------------- Renderer -------------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true, // allow transparent canvas
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // transparent clear

// ------------------------- Scene + Camera -------------------------
const scene = new THREE.Scene();
// Important: do NOT set scene.background if you want the page background to show through

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.25, 2.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ------------------------- Video element -------------------------
/**
 * Put the file in Vite's /public folder so it is accessible at:
 * "/transparent_alpha_3s.webm"
 */
const video = document.createElement("video");
video.src = "/op_alpha.webm";
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true; // required for autoplay in most browsers
video.playsInline = true;
video.preload = "auto";
video.autoplay = true;

// Try to play; if blocked, a user gesture will be needed
async function tryPlay() {
  try {
    await video.play();
  } catch {
    // Autoplay blocked: user interaction required
  }
}
void tryPlay();

// One click anywhere will start the video if autoplay is blocked
window.addEventListener("pointerdown", () => void tryPlay(), { once: true });

// ------------------------- Video texture -------------------------
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;
videoTexture.colorSpace = THREE.SRGBColorSpace;

// ------------------------- Plane with transparency -------------------------
const geometry = new THREE.PlaneGeometry(1, 1);

const material = new THREE.MeshBasicMaterial({
  map: videoTexture,
  transparent: true, // must be true for alpha to show
  depthWrite: false, // helps avoid sorting artifacts
  // If edges look noisy, you can try:
  // alphaTest: 0.02,
});

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Scale plane to match the video aspect ratio when metadata loads
video.addEventListener("loadedmetadata", () => {
  const w = video.videoWidth || 1;
  const h = video.videoHeight || 1;
  const aspect = w / h;

  // Keep height = 1, set width by aspect
  plane.scale.set(aspect, 1, 1);
});

// ------------------------- Resize -------------------------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ------------------------- Animate -------------------------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Small motion so you can see it in 3D space
  // plane.rotation.y = 0.25 * Math.sin(t * 0.7);
  // plane.position.y = 0.05 * Math.sin(t * 0.9);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();