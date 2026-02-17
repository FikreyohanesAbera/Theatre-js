import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";


// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "10";
renderer.domElement.style.display = "block";
renderer.domElement.style.pointerEvents = "auto";

// -------------------- Scene --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// -------------------- Lights --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(6, 10, 6);
scene.add(dir);

// -------------------- Camera --------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 2, 14);
camera.lookAt(0, 0, 0);

/**
 * Inline shaders (your last two shaders, with stable point sizing)
 */
const particlesVertexShader = /* glsl */ `
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uSize;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

attribute float aIntensity;
attribute float aAngle;

varying vec3 vColor;

void main()
{
    // Displacement
    vec3 newPosition = position;
    float displacementIntensity = texture(uDisplacementTexture, uv).r;
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

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    float pictureIntensity = texture(uPictureTexture, uv).r;

    // Point size (stable replacement for: 0.15 * pictureIntensity * uResolution.y)
    gl_PointSize = uSize * uPixelRatio * pictureIntensity;
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    vColor = vec3(pow(pictureIntensity, 2.0));
}
`;

const particlesFragmentShader = /* glsl */ `
varying vec3 vColor;

void main()
{
    vec2 uv = gl_PointCoord;
    float distanceToCenter = length(uv - vec2(0.5));

    if(distanceToCenter > 0.5)
        discard;

    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;

/**
 * Base
 */
// Canvas (no canvas in HTML)
let canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement | null;

if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.className = "webgl";
  document.body.appendChild(canvas);

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
  });
}



// Loaders
const textureLoader = new THREE.TextureLoader();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};



// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */

/**
 * Displacement
 */
const displacement: any = {};

// 2D canvas (debug view like your original)
displacement.canvas = document.createElement("canvas");
displacement.canvas.width = 128;
displacement.canvas.height = 128;
displacement.canvas.style.position = "fixed";
displacement.canvas.style.width = "256px";
displacement.canvas.style.height = "256px";
displacement.canvas.style.top = "0";
displacement.canvas.style.left = "0";
displacement.canvas.style.zIndex = "10";
document.body.append(displacement.canvas);

// Context
displacement.context = displacement.canvas.getContext("2d");
if (!displacement.context) throw new Error("Could not get 2D context.");
displacement.context.fillStyle = "black";
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

// Glow image (put glow.png in public/)
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

/**
 * Particles
 */
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
particlesGeometry.setIndex(null);
particlesGeometry.deleteAttribute("normal");

const count = particlesGeometry.attributes.position.count;
const intensitiesArray = new Float32Array(count);
const anglesArray = new Float32Array(count);

for (let i = 0; i < count; i++) {
  intensitiesArray[i] = Math.random();
  anglesArray[i] = Math.random() * Math.PI * 2;
}

particlesGeometry.setAttribute("aIntensity", new THREE.BufferAttribute(intensitiesArray, 1));
particlesGeometry.setAttribute("aAngle", new THREE.BufferAttribute(anglesArray, 1));

const pictureTexture = textureLoader.load("../static/picture-1.png");
pictureTexture.colorSpace = THREE.SRGBColorSpace;

const particlesMaterial = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uResolution: new THREE.Uniform(
      new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)
    ),
    uPixelRatio: new THREE.Uniform(sizes.pixelRatio),
    uSize: new THREE.Uniform(80.0), // <— tweak this: 30..120
    uPictureTexture: new THREE.Uniform(pictureTexture),
    uDisplacementTexture: new THREE.Uniform(displacement.texture),
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

/**
 * Resize
 */
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  particlesMaterial.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio
  );
  particlesMaterial.uniforms.uPixelRatio.value = sizes.pixelRatio;

  // Camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  /**
   * Raycaster
   */
  displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
  const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane);

  if (intersections.length) {
    const uv = intersections[0].uv;
    if (uv) {
      displacement.canvasCursor.x = uv.x * displacement.canvas.width;
      displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;
    }
  }

  /**
   * Displacement
   */
  // Fade out
  displacement.context.globalCompositeOperation = "source-over";
  displacement.context.globalAlpha = 0.02;
  displacement.context.fillStyle = "black";
  displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

  // Speed alpha
  const cursorDistance = displacement.canvasCursorPrevious.distanceTo(displacement.canvasCursor);
  displacement.canvasCursorPrevious.copy(displacement.canvasCursor);
  const alpha = Math.min(cursorDistance * 0.05, 1);

  // Draw glow
  const glowSize = displacement.canvas.width * 0.25;
  displacement.context.globalCompositeOperation = "lighten";
  displacement.context.globalAlpha = alpha;

  if (displacement.glowImage.complete) {
    displacement.context.drawImage(
      displacement.glowImage,
      displacement.canvasCursor.x - glowSize * 0.5,
      displacement.canvasCursor.y - glowSize * 0.5,
      glowSize,
      glowSize
    );
  }

  // Texture
  displacement.texture.needsUpdate = true;

  // Render
  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
};

tick();
  