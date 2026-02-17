import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import holographicVertexShader from "./shaders/holographic/vertex.glsl?raw";
import holographicFragmentShader from "./shaders/holographic/fragment.glsl?raw";

// Debug
const gui = new GUI();

// Scene
const scene = new THREE.Scene();

// Camera
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
camera.position.set(7, 7, 7);
scene.add(camera);

// Renderer
const rendererParameters = { clearColor: "#1d1f2a" };
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(rendererParameters.clearColor);
document.body.appendChild(renderer.domElement);

// Controls (use renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// GUI clear color
gui.addColor(rendererParameters, "clearColor").onChange(() => {
  renderer.setClearColor(rendererParameters.clearColor);
});

// Material
const materialParameters = { color: "#70c1ff" };

const material = new THREE.ShaderMaterial({
  vertexShader: holographicVertexShader,
  fragmentShader: holographicFragmentShader,
  uniforms: {
    uTime: new THREE.Uniform(0),
    uColor: new THREE.Uniform(new THREE.Color(materialParameters.color)),
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// GUI color (after material exists)
gui.addColor(materialParameters, "color").onChange(() => {
  material.uniforms.uColor.value.set(materialParameters.color);
});

// Objects
const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32), material);
torusKnot.position.x = 3;
scene.add(torusKnot);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
sphere.position.x = -3;
scene.add(sphere);

// Suzanne
const gltfLoader = new GLTFLoader();
let suzanne = null;

gltfLoader.load("../static/suzanne.glb", (gltf) => {
  suzanne = gltf.scene;
  suzanne.traverse((child) => {
    if (child.isMesh) child.material = material;
  });
  scene.add(suzanne);
});

// Resize
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animate
const clock = new THREE.Clock();

function tick() {
  const elapsedTime = clock.getElapsedTime();

  material.uniforms.uTime.value = elapsedTime;

  if (suzanne) {
    suzanne.rotation.x = -elapsedTime * 0.1;
    suzanne.rotation.y = elapsedTime * 0.2;
  }

  sphere.rotation.x = -elapsedTime * 0.1;
  sphere.rotation.y = elapsedTime * 0.2;

  torusKnot.rotation.x = -elapsedTime * 0.1;
  torusKnot.rotation.y = elapsedTime * 0.2;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
