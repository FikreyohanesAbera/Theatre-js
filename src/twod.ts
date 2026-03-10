import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./style.css";

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app element");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0710);

// Camera
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.01,
  2000
);
camera.position.set(2.2, 1.6, 3.5);

// Renderer (no canvas in HTML; we create it here)
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

app.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.9);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(5, 8, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.4);
fill.position.set(-6, 3, -4);
scene.add(fill);

// Ground reference (optional; helps you see scale)
const grid = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
grid.position.y = 0;
scene.add(grid);

// Load GLB
const loader = new GLTFLoader();

// If your model is at: public/models/character.glb
const url = "/static/character.glb";

let mixer: THREE.AnimationMixer | null = null;
const clock = new THREE.Clock();

loader.load(
  url,
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // If you exported emission/cyan in Blender, it should come through.
    // If you want to force a cyan glow look in Three.js, uncomment below:
    
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material;
        if (Array.isArray(mat)) return;
        // Make it emissive cyan
        if ("emissive" in mat) {
          (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x00e5ff);
          (mat as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;
        }
      }
    });
    

    // Play first animation if exists
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }

    // Auto-frame the camera to the model
    frameObject(model, camera, controls);
  },
  (evt) => {
    // Progress
    // console.log(`Loading: ${((evt.loaded / (evt.total || 1)) * 100).toFixed(1)}%`);
  },
  (err) => {
    console.error("Failed to load GLB:", err);
  }
);

// Helper: frame object
function frameObject(object: THREE.Object3D, cam: THREE.PerspectiveCamera, ctrls: OrbitControls) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Controls look at center
  ctrls.target.copy(center);

  // Fit camera distance
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (cam.fov * Math.PI) / 180;
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));

  cameraZ *= 1.4; // padding
  cam.position.set(center.x + cameraZ * 0.6, center.y + cameraZ * 0.35, center.z + cameraZ);
  cam.near = Math.max(0.01, cameraZ / 100);
  cam.far = cameraZ * 100;
  cam.updateProjectionMatrix();

  ctrls.update();
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Render loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  controls.update();
  renderer.render(scene, camera);
}
animate();