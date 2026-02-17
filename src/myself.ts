import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "10";
renderer.domElement.style.display = "block";
renderer.domElement.style.pointerEvents = "auto";

// IMPORTANT for matching image colors
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

// -------------------- Scene --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// -------------------- Lights --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(6, 10, 6);
scene.add(dir);

// -------------------- Camera --------------------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 2, 14);
camera.lookAt(0, 0, 0);

/**
 * Inline shaders
 * Fixes:
 * - black pattern: soften circle edge + overlap a bit more + optional micro-jitter
 * - picture clarity: sample original rgb, no brightness-based shrink
 */
const particlesVertexShader = /* glsl */ `
uniform float uPixelRatio;
uniform float uSize;
uniform sampler2D uDisplacementTexture;

attribute float aIntensity;
attribute float aAngle;

varying vec2 vUv;

void main()
{
    vUv = uv;

    // Displacement
    vec3 newPosition = position;
    float displacementIntensity = texture2D(uDisplacementTexture, uv).r;
    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    vec3 displacement = vec3(
        cos(aAngle) * 0.2,
        sin(aAngle) * 0.2,
        1.0
    );
    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    displacement *= 3.0;
    displacement *= aIntensity;

    newPosition += displacement;

    // Small jitter to break perfect grid (reduces moire/black pattern)
    newPosition.x += (aIntensity - 0.5) * 0.02;
    newPosition.y += (sin(aAngle) - 0.5) * 0.02;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size (constant; overlap helps remove black gaps)
    gl_PointSize = uSize * uPixelRatio;
    gl_PointSize *= (1.0 / -viewPosition.z);
}
`;

const particlesFragmentShader = /* glsl */ `
uniform sampler2D uPictureTexture;
varying vec2 vUv;

void main()
{
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, d);
    if(alpha <= 0.0) discard;

    vec3 col = texture2D(uPictureTexture, vUv).rgb;
    
    // BOOST BRIGHTNESS HERE
    // Multiplying by 1.5 or 2.0 will make the colors pop
    col *= 1.5; 

    gl_FragColor = vec4(col, alpha);
}

`;

// -------------------- Sizes --------------------
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

// -------------------- Controls --------------------
// Always attach controls to renderer.domElement (reliable)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// -------------------- Loaders --------------------
const textureLoader = new THREE.TextureLoader();

// -------------------- Displacement --------------------
const displacement: any = {};

// 2D canvas (debug view)
displacement.canvas = document.createElement("canvas");
displacement.canvas.width = 128;
displacement.canvas.height = 128;
displacement.canvas.style.position = "fixed";
displacement.canvas.style.width = "256px";
displacement.canvas.style.height = "256px";
displacement.canvas.style.top = "0";
displacement.canvas.style.left = "0";
displacement.canvas.style.zIndex = "10";
// So OrbitControls still work even if you drag over this debug canvas
displacement.canvas.style.pointerEvents = "none";
document.body.append(displacement.canvas);

// Context
displacement.context = displacement.canvas.getContext("2d");
if (!displacement.context) throw new Error("Could not get 2D context.");
displacement.context.fillStyle = "black";
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

// Glow image
displacement.glowImage = new Image();
displacement.glowImage.src = "../static/glow.png";

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: "red", side: THREE.DoubleSide })
);
displacement.interactivePlane.visible = false;
scene.add(displacement.interactivePlane);

// Raycaster
displacement.raycaster = new THREE.Raycaster();

// Coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

window.addEventListener("pointermove", (event) => {
  displacement.screenCursor.x = (event.clientX / sizes.width) * 2 - 1;
  displacement.screenCursor.y = -(event.clientY / sizes.height) * 2 + 1;
});

// Texture
displacement.texture = new THREE.CanvasTexture(displacement.canvas);
displacement.texture.minFilter = THREE.LinearFilter;
displacement.texture.magFilter = THREE.LinearFilter;
displacement.texture.colorSpace = THREE.SRGBColorSpace;

// -------------------- Particles --------------------
// More subdivisions = denser points = less black gaps/pattern
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128); // 1. Try increasing this to 256, 256 for better quality
particlesGeometry.setIndex(null);
particlesGeometry.deleteAttribute("normal");

const count = particlesGeometry.attributes.position.count;
const positions = particlesGeometry.attributes.position.array; // <--- Get access to positions

const intensitiesArray = new Float32Array(count);
const anglesArray = new Float32Array(count);

for (let i = 0; i < count; i++) {
  intensitiesArray[i] = Math.random();
  anglesArray[i] = Math.random() * Math.PI * 2;

  // ---------------------------------------------------------
  // 2. THE FIX: Randomly offset positions to break the grid
  // ---------------------------------------------------------
  const i3 = i * 3;
  
  // We offset x and y by a tiny random amount
  // (10.0 / 128.0) is roughly the size of one grid cell
  positions[i3]     += (Math.random() - 0.5) * (10.0 / 128.0); 
  positions[i3 + 1] += (Math.random() - 0.5) * (10.0 / 128.0); 
}

particlesGeometry.setAttribute("aIntensity", new THREE.BufferAttribute(intensitiesArray, 1));
particlesGeometry.setAttribute("aAngle", new THREE.BufferAttribute(anglesArray, 1));

// IMPORTANT: Since we changed positions, we don't need to flag update because it's initial load,
// but if you did this later, you'd need particlesGeometry.attributes.position.needsUpdate = true;

const pictureTexture = textureLoader.load("../static/picture-6.jpg");
pictureTexture.colorSpace = THREE.SRGBColorSpace;

const particlesMaterial = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uPixelRatio: new THREE.Uniform(sizes.pixelRatio),
    // Bigger size overlaps more -> clearer picture, less black pattern
    uSize: new THREE.Uniform(39.0),
    uPictureTexture: new THREE.Uniform(pictureTexture),
    uDisplacementTexture: new THREE.Uniform(displacement.texture),
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// -------------------- Resize --------------------
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  particlesMaterial.uniforms.uPixelRatio.value = sizes.pixelRatio;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

// -------------------- Animate --------------------
const tick = () => {
  controls.update();

  // Raycaster
  displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
  const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane);

  if (intersections.length) {
    const uv = intersections[0].uv;
    if (uv) {
      displacement.canvasCursor.x = uv.x * displacement.canvas.width;
      displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;
    }
  }

  // Fade out
  displacement.context.globalCompositeOperation = "source-over";
  displacement.context.globalAlpha = 0.02;
  displacement.context.fillStyle = "black";
  displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

  // Speed alpha
  const cursorDistance = displacement.canvasCursorPrevious.distanceTo(displacement.canvasCursor);
  displacement.canvasCursorPrevious.copy(displacement.canvasCursor);
  const alpha = Math.min(cursorDistance * 0.05, 1);

  // Draw glow (guard against broken image)
  const glowSize = displacement.canvas.width * 0.25;
  displacement.context.globalCompositeOperation = "lighten";
  displacement.context.globalAlpha = alpha;

  const img = displacement.glowImage as HTMLImageElement;
  if (img.complete && img.naturalWidth > 0) {
    displacement.context.drawImage(
      img,
      displacement.canvasCursor.x - glowSize * 0.5,
      displacement.canvasCursor.y - glowSize * 0.5,
      glowSize,
      glowSize
    );
  }

  // Update displacement texture
  displacement.texture.needsUpdate = true;

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
