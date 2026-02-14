import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.style.margin = "0";
    document.body.appendChild(renderer.domElement);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(6, 10, 6);
    scene.add(dir);

    // // Object that will move
    const mover = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial()
    );
    scene.add(mover);

    // Create a path (you can change these points)
    const points = [
      new THREE.Vector3(-6, 0, -3),
      new THREE.Vector3(-3, 2,  3),
      new THREE.Vector3( 0, 0,  6),
      new THREE.Vector3( 3, 2,  3),
      new THREE.Vector3( 6, 0, -3),
      new THREE.Vector3( 0, 1, -6),
    ];

    // CatmullRomCurve3 makes a smooth curve through the points
    const curve = new THREE.CatmullRomCurve3(points, true); // true = closed loop

    // --- Ribbon "plane" that follows the curve (top = red, bottom = blue) ---

    const samples = 200;          // how smooth the ribbon is
    const halfWidth = 0.35;       // half of ribbon width

    const positions = new Float32Array(samples * 2 * 3); // 2 vertices per sample, xyz
    const colors = new Float32Array(samples * 2 * 3);    // rgb per vertex
    const indices = [];

    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const topColor = new THREE.Color(0xff0000);   // red (up edge)
    const bottomColor = new THREE.Color(0x0000ff); // blue (down edge)

    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);

      curve.getPointAt(t, p);
      curve.getTangentAt(t, tan).normalize();

      // Build a "right" vector perpendicular to tangent and world up
      right.crossVectors(up, tan).normalize();

      // If tangent is parallel to up, cross product becomes zero; handle that
      if (right.lengthSq() < 1e-10) {
        right.set(1, 0, 0); // fallback
      }

      const top = new THREE.Vector3().copy(p).addScaledVector(right, +halfWidth);
      const bottom = new THREE.Vector3().copy(p).addScaledVector(right, -halfWidth);

      // Write positions
      const vTop = i * 2;
      const vBot = i * 2 + 1;

      positions[vTop * 3 + 0] = top.x;
      positions[vTop * 3 + 1] = top.y;
      positions[vTop * 3 + 2] = top.z;

      positions[vBot * 3 + 0] = bottom.x;
      positions[vBot * 3 + 1] = bottom.y;
      positions[vBot * 3 + 2] = bottom.z;

      // Write colors: top = red, bottom = blue
      colors[vTop * 3 + 0] = topColor.r;
      colors[vTop * 3 + 1] = topColor.g;
      colors[vTop * 3 + 2] = topColor.b;

      colors[vBot * 3 + 0] = bottomColor.r;
      colors[vBot * 3 + 1] = bottomColor.g;
      colors[vBot * 3 + 2] = bottomColor.b;

      // Create triangles between this segment and the next
      if (i < samples - 1) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;

        // Two triangles: a-b-c and b-d-c
        indices.push(a, b, c,  b, d, c);
      }
    }

    const ribbonGeo = new THREE.BufferGeometry();
ribbonGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
// (colors not needed for the two-sided material approach)
// ribbonGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
ribbonGeo.setIndex(indices);
ribbonGeo.computeVertexNormals();

const matTop = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  side: THREE.FrontSide,
});

const matBottom = new THREE.MeshBasicMaterial({
  color: 0x0000ff,
  side: THREE.BackSide,
});

const ribbonTop = new THREE.Mesh(ribbonGeo, matTop);
const ribbonBottom = new THREE.Mesh(ribbonGeo, matBottom);

scene.add(ribbonTop);
scene.add(ribbonBottom);




// const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
// scene.add(ribbonMesh);


// Animate along the curve
const clock = new THREE.Clock();
const speed = 0.08; // higher = faster
let t = 0;

// Helper objects reused each frame (for performance)
const tangent = new THREE.Vector3();
const tangent2 = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const lookTarget2 = new THREE.Vector3();
let i = 0;

const tangentArrow = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),  // direction (placeholder)
  new THREE.Vector3(0, 0, 0),  // origin
  2,                           // length
  0xffffff                     // red
);
scene.add(tangentArrow);

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

function animate() {
  

  requestAnimationFrame(animate);
      const dt = clock.getDelta();
      t = (t + dt * speed) % 1; // keep it in [0, 1)

        // Position on the curve
      const pos = curve.getPointAt(t);
      // const pos2 = curve.getPointAt((t - 0.01) % 1); // a bit ahead for orientation
      curve.getTangentAt(t, tangent).normalize();
      // curve.getTangentAt((t - 0.01) % 1, tangent2).normalize();

      // tangentArrow.position.copy(pos);
      // tangentArrow.setDirection(tangent);
      // tangentArrow.setLength(1);

      // move camera above the path a bit
      // camera.position.copy(pos2);
      camera.position.copy(pos).add(new THREE.Vector3(0, 0.3, 0)); // lift it up a bit

      // look forward
      lookTarget.copy(pos).add(tangent).add(new THREE.Vector3(0, 0.3, 0)); // look slightly above the path
      // lookTarget2.copy(pos2).add(tangent2);
      camera.lookAt(lookTarget);
      // camera.lookAt(lookTarget2);




  // controls.update();
  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
