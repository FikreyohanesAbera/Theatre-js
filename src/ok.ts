// main.ts (Vite + TypeScript)
// One canvas, one renderer, multiple worlds (scenes) with a transition system scaffold.
// Uses only: three + gsap (optional but used here).

import * as THREE from "three";
import gsap from "gsap";

/* ----------------------------------------------
   Small utilities
---------------------------------------------- */

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function damp(current: number, target: number, lambda: number, dt: number) {
  // Exponential smoothing (stable, frame-rate independent)
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function setCanvasFullScreen(canvas: HTMLCanvasElement) {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
}

/* ----------------------------------------------
   Scroll controller (virtual scroll progress 0..1)
---------------------------------------------- */

class ScrollController {
  public enabled = true;

  // The “progress” the camera uses (smoothed)
  public progress = 0;

  // The “target” progress from wheel input
  private target = 0;

  // Sensitivity and smoothing
  private wheelStrength = 0.0009; // reasonable default for most mice
  private smoothing = 10; // higher = snappier, lower = floatier

  constructor() {
    window.addEventListener(
      "wheel",
      (e) => {
        if (!this.enabled) return;
        // Wheel delta is device dependent, so keep conservative strength and clamp
        this.target = clamp01(this.target + e.deltaY * this.wheelStrength);
      },
      { passive: true }
    );
  }

  public setInstant(v: number) {
    const c = clamp01(v);
    this.target = c;
    this.progress = c;
  }

  public setTarget(v: number) {
    this.target = clamp01(v);
  }

  public getTarget() {
    return this.target;
  }

  public update(dt: number) {
    this.progress = damp(this.progress, this.target, this.smoothing, dt);
  }
}

/* ----------------------------------------------
   World interface and base class
---------------------------------------------- */

type WorldId = "education" | "work" | "tools" | "projects";

interface World {
  readonly id: WorldId;

  /** The scene is the environment for this world. */
  readonly scene: THREE.Scene;

  /** Called when this world becomes active (for cinematic entry, setup, etc). */
  onEnter(ctx: WorldContext): void;

  /** Called when this world becomes inactive. */
  onExit(ctx: WorldContext): void;

  /** Update world logic and camera pose. */
  update(ctx: WorldContext, dt: number): void;

  /** Render is optional; default render uses the world's scene. */
  render?(ctx: WorldContext): void;
}

interface WorldContext {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scroll: ScrollController;
  time: {
    elapsed: number;
  };
}

abstract class WorldBase implements World {
  public abstract readonly id: WorldId;
  public readonly scene = new THREE.Scene();

  public onEnter(_ctx: WorldContext) {}
  public onExit(_ctx: WorldContext) {}

  public abstract update(ctx: WorldContext, dt: number): void;
}

/* ----------------------------------------------
   Education world (real environment, placeholder meshes)
---------------------------------------------- */

class EducationWorld extends WorldBase {
  public readonly id: WorldId = "education";

  // Camera ride path
  private curve: THREE.CatmullRomCurve3;
  private curveLine?: THREE.Line;
  private curveTube?: THREE.Mesh;

  // Visual anchors
  private lookTarget = new THREE.Vector3(0, 2, 0);

  // Simple animation
  private floatingBooks: THREE.Mesh[] = [];

  // Cinematic control
  private hasPlayedEntryCinematic = false;

  constructor() {
    super();

    // Environment settings (unique per world)
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 10, 75);

    // Lighting (own setup)
    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x0a0a12, 0.8);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(8, 14, 6);
    key.castShadow = false;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x6ea8ff, 0.6);
    rim.position.set(-10, 6, -12);
    this.scene.add(rim);

    // Common element idea: a “rail ride” spine is present in each world.
    // Here we place a visible glowing guide that later can line up with your trolley and rails.
    this.curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 2.2, 18),
        new THREE.Vector3(3, 2.6, 10),
        new THREE.Vector3(-2, 2.1, 2),
        new THREE.Vector3(2, 2.9, -7),
        new THREE.Vector3(0, 2.4, -16),
        new THREE.Vector3(-3, 2.8, -26),
      ],
      false,
      "catmullrom",
      0.3
    );

    this.buildGround();
    this.buildGuideRail();
    this.buildEducationLandmarks();
    this.buildAtmosphere();
  }

  private buildGround() {
    // Floor
    const groundGeo = new THREE.PlaneGeometry(220, 220, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    // Subtle grid “education blueprint vibe”
    const grid = new THREE.GridHelper(220, 60, 0x2b3a66, 0x12182e);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  private buildGuideRail() {
    // Line along the curve (cheap and clean)
    const points = this.curve.getPoints(240);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6ea8ff,
      transparent: true,
      opacity: 0.55,
    });
    this.curveLine = new THREE.Line(lineGeo, lineMat);
    this.curveLine.position.y += 0.02;
    this.scene.add(this.curveLine);

    // Slight tube underneath to feel “physical”, still placeholder
    const tubeGeo = new THREE.TubeGeometry(this.curve, 220, 0.08, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x162242,
      roughness: 0.6,
      metalness: 0.15,
      emissive: new THREE.Color(0x0a1022),
      emissiveIntensity: 0.9,
    });
    this.curveTube = new THREE.Mesh(tubeGeo, tubeMat);
    this.curveTube.position.y -= 0.08;
    this.scene.add(this.curveTube);
  }

  private buildEducationLandmarks() {
    // “Campus blocks” and “book towers” as placeholders
    const campusGroup = new THREE.Group();
    this.scene.add(campusGroup);

    // Main monument (a stylized “degree arch”)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -8);

    const pillarGeo = new THREE.BoxGeometry(0.9, 5.5, 0.9);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1a2b55,
      roughness: 0.5,
      metalness: 0.15,
    });

    const p1 = new THREE.Mesh(pillarGeo, pillarMat);
    p1.position.set(-2.2, 2.75, 0);

    const p2 = new THREE.Mesh(pillarGeo, pillarMat);
    p2.position.set(2.2, 2.75, 0);

    const topGeo = new THREE.BoxGeometry(5.4, 0.7, 0.9);
    const top = new THREE.Mesh(topGeo, pillarMat);
    top.position.set(0, 5.5, 0);

    archGroup.add(p1, p2, top);
    campusGroup.add(archGroup);

    // Floating “books” (simple boxes) placed along the path
    const bookGeo = new THREE.BoxGeometry(0.6, 0.18, 0.9);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0xf2efe9,
      roughness: 0.75,
      metalness: 0.05,
      emissive: new THREE.Color(0x070a12),
      emissiveIntensity: 0.3,
    });

    const placements = [
      { t: 0.12, side: 1 },
      { t: 0.22, side: -1 },
      { t: 0.35, side: 1 },
      { t: 0.48, side: -1 },
      { t: 0.62, side: 1 },
      { t: 0.78, side: -1 },
    ];

    for (const p of placements) {
      const pos = this.curve.getPointAt(p.t);
      const tan = this.curve.getTangentAt(p.t).normalize();

      // Create a sideways offset from tangent
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(up, tan).normalize().multiplyScalar(2.4 * p.side);

      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.copy(pos).add(side);
      book.position.y += 1.5;

      // Rotate to face along the ride
      const forward = tan.clone();
      const yaw = Math.atan2(forward.x, forward.z);
      book.rotation.y = yaw + Math.PI; // face towards camera direction
      book.rotation.z = (Math.random() * 0.25 - 0.125) * p.side;

      this.floatingBooks.push(book);
      campusGroup.add(book);
    }

    // Small “sign posts” with year-like markers (placeholder)
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 10);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x223058,
      roughness: 0.6,
      metalness: 0.2,
    });

    const signGeo = new THREE.BoxGeometry(1.4, 0.5, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x6ea8ff,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0x0f1b3d),
      emissiveIntensity: 1.0,
    });

    const signTs = [0.18, 0.42, 0.66, 0.86];
    for (let i = 0; i < signTs.length; i++) {
      const t = signTs[i];
      const pos = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize().multiplyScalar(4.2);

      const post = new THREE.Mesh(postGeo, postMat);
      post.position.copy(pos).add(side);
      post.position.y = 1.1;

      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 1.0, 0);
      sign.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI; // face the ride
      post.add(sign);

      campusGroup.add(post);
    }
  }

  private buildAtmosphere() {
    // Simple “stars” using points
    const starCount = 800;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 120 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const y = 10 + Math.random() * 70;
      pos[i * 3 + 0] = Math.cos(theta) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(theta) * r;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xa9c7ff,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  public onEnter(ctx: WorldContext) {
    // Start at beginning of the ride (app start)
    // We play a short cinematic once, then give scroll control.
    if (!this.hasPlayedEntryCinematic) {
      this.hasPlayedEntryCinematic = true;

      ctx.scroll.enabled = false;
      ctx.scroll.setInstant(0);

      // Cinematic: animate progress forward gently, then hand control back.
      gsap.to(
        { p: 0 },
        {
          p: 0.18,
          duration: 2.4,
          ease: "power2.inOut",
          onUpdate: function () {
            ctx.scroll.setInstant((this.targets()[0] as any).p);
          },
          onComplete: () => {
            ctx.scroll.enabled = true;
            // Keep the target aligned so first wheel input feels natural
            ctx.scroll.setTarget(ctx.scroll.progress);
          },
        }
      );
    }
  }

  public update(ctx: WorldContext, dt: number) {
    // Small floating animation on books
    const t = ctx.time.elapsed;
    for (let i = 0; i < this.floatingBooks.length; i++) {
      const b = this.floatingBooks[i];
      b.position.y += Math.sin(t * 1.2 + i) * 0.003;
      b.rotation.x = Math.sin(t * 0.8 + i * 0.7) * 0.08;
    }

    // Ride camera along curve based on scroll progress
    const u = clamp01(ctx.scroll.progress);

    const pos = this.curve.getPointAt(u);
    const tan = this.curve.getTangentAt(u).normalize();

    // Put camera slightly above the rail and offset sideways a tiny bit for cinematic composition
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, tan).normalize();

    const cameraOffset = new THREE.Vector3()
      .addScaledVector(up, 0.8)
      .addScaledVector(side, 0.65);

    ctx.camera.position.copy(pos).add(cameraOffset);

    // Look ahead on the curve
    const lookU = clamp01(u + 0.02);
    const lookPos = this.curve.getPointAt(lookU);

    // Blend between “look ahead” and a soft world anchor so it feels guided, not stiff
    this.lookTarget.lerpVectors(lookPos, new THREE.Vector3(0, 2.2, -10), 0.12);

    ctx.camera.lookAt(this.lookTarget);

    // Subtle field of view breathing based on speed (difference to target)
    const speedApprox = Math.abs(ctx.scroll.getTarget() - ctx.scroll.progress);
    const targetFov = THREE.MathUtils.clamp(55 + speedApprox * 260, 55, 72);
    ctx.camera.fov = damp(ctx.camera.fov, targetFov, 8, dt);
    ctx.camera.updateProjectionMatrix();
  }
}

/* ----------------------------------------------
   Work world (stub for later, but real scene for transitions)
---------------------------------------------- */

class WorkWorldStub extends WorldBase {
  public readonly id: WorldId = "work";

  private curve: THREE.CatmullRomCurve3;

  constructor() {
    super();

    this.scene.background = new THREE.Color(0x08130f);
    this.scene.fog = new THREE.Fog(0x08130f, 10, 75);

    const hemi = new THREE.HemisphereLight(0xb6ffd9, 0x08130f, 0.75);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(10, 14, 5);
    this.scene.add(key);

    // Minimal industrial placeholders
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: 0x06100d, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(220, 60, 0x2a6b4e, 0x0e241a);
    grid.position.y = 0.01;
    this.scene.add(grid);

    const towerGeo = new THREE.BoxGeometry(1.8, 10, 1.8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0e2a20, roughness: 0.55 });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(towerGeo, towerMat);
      m.position.set((Math.random() - 0.5) * 30, 5, -10 - Math.random() * 40);
      this.scene.add(m);
    }

    this.curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 2.3, 18),
        new THREE.Vector3(-3, 2.4, 10),
        new THREE.Vector3(2, 2.2, 2),
        new THREE.Vector3(-2, 2.8, -7),
        new THREE.Vector3(0, 2.4, -16),
        new THREE.Vector3(2, 2.6, -26),
      ],
      false,
      "catmullrom",
      0.3
    );

    // Same “common spine” motif
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.curve.getPoints(240)),
      new THREE.LineBasicMaterial({ color: 0x66ffb8, transparent: true, opacity: 0.45 })
    );
    line.position.y += 0.02;
    this.scene.add(line);
  }

  public onEnter(ctx: WorldContext) {
    // No cinematic here yet; keep simple.
    ctx.scroll.enabled = true;
    ctx.scroll.setTarget(ctx.scroll.progress);
  }

  public update(ctx: WorldContext, dt: number) {
    const u = clamp01(ctx.scroll.progress);
    const pos = this.curve.getPointAt(u);
    const tan = this.curve.getTangentAt(u).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();

    ctx.camera.position.copy(pos).addScaledVector(new THREE.Vector3(0, 1, 0), 0.7).addScaledVector(side, 0.55);
    const look = this.curve.getPointAt(clamp01(u + 0.02));
    ctx.camera.lookAt(look);

    ctx.camera.fov = damp(ctx.camera.fov, 58, 6, dt);
    ctx.camera.updateProjectionMatrix();
  }
}

/* ----------------------------------------------
   Transition manager (render targets + fullscreen blend)
---------------------------------------------- */

class TransitionManager {
  private renderer: THREE.WebGLRenderer;

  private rtFrom: THREE.WebGLRenderTarget;
  private rtTo: THREE.WebGLRenderTarget;

  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private active = false;
  private mix = 0;

  private fromWorld: World | null = null;
  private toWorld: World | null = null;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;

    this.rtFrom = new THREE.WebGLRenderTarget(width, height, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.rtTo = new THREE.WebGLRenderTarget(width, height, {
      depthBuffer: true,
      stencilBuffer: false,
    });

    // Fullscreen quad
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tFrom: { value: this.rtFrom.texture },
        tTo: { value: this.rtTo.texture },
        uMix: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tFrom;
        uniform sampler2D tTo;
        uniform float uMix;
        varying vec2 vUv;

        // Simple blend now; later you can replace this with a more cinematic shader
        // (blur, noise wipe, film grain, chromatic aberration, and so on).
        void main() {
          vec4 a = texture2D(tFrom, vUv);
          vec4 b = texture2D(tTo, vUv);
          gl_FragColor = mix(a, b, uMix);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.quadScene.add(this.quadMesh);
  }

  public isActive() {
    return this.active;
  }

  public resize(width: number, height: number) {
    this.rtFrom.setSize(width, height);
    this.rtTo.setSize(width, height);
  }

  public start(fromWorld: World, toWorld: World, durationSeconds = 1.15) {
    if (this.active) return;

    this.active = true;
    this.mix = 0;
    this.fromWorld = fromWorld;
    this.toWorld = toWorld;

    // Animate the blend
    gsap.to(this, {
      mix: 1,
      duration: durationSeconds,
      ease: "power2.inOut",
      onComplete: () => {
        this.active = false;
      },
    });
  }

  /**
   * Render either:
   * - the active world normally, or
   * - both worlds to render targets, then blend with a fullscreen shader.
   */
  public render(activeWorld: World, camera: THREE.PerspectiveCamera) {
    if (!this.active || !this.fromWorld || !this.toWorld) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(activeWorld.scene, camera);
      return;
    }

    // Render FROM
    this.renderer.setRenderTarget(this.rtFrom);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.fromWorld.scene, camera);

    // Render TO
    this.renderer.setRenderTarget(this.rtTo);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.toWorld.scene, camera);

    // Blend to screen
    (this.quadMesh.material.uniforms.uMix.value as number) = this.mix;
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /** If a transition just finished, return the world that should become active. */
  public consumeCompletedTarget(): World | null {
    if (this.active) return null;
    if (!this.fromWorld || !this.toWorld) return null;

    // If mix reached 1, we should switch active world to "toWorld"
    if (this.mix >= 0.999) {
      const w = this.toWorld;
      this.fromWorld = null;
      this.toWorld = null;
      this.mix = 0;
      return w;
    }
    return null;
  }

  public getPendingToWorld(): World | null {
    return this.toWorld;
  }

  public getPendingFromWorld(): World | null {
    return this.fromWorld;
  }
}

/* ----------------------------------------------
   World manager (clean plug-in point for 4 worlds)
---------------------------------------------- */

class WorldManager {
  private worlds = new Map<WorldId, World>();
  private activeWorld: World;

  private ctx: WorldContext;
  private transition: TransitionManager;

  constructor(ctx: WorldContext, transition: TransitionManager, initialWorld: World) {
    this.ctx = ctx;
    this.transition = transition;
    this.activeWorld = initialWorld;

    this.addWorld(initialWorld);
    this.activeWorld.onEnter(this.ctx);
  }

  public addWorld(world: World) {
    this.worlds.set(world.id, world);
  }

  public getActiveWorld() {
    return this.activeWorld;
  }

  public getWorld(id: WorldId) {
    return this.worlds.get(id) || null;
  }

  public requestWorld(id: WorldId) {
    const next = this.getWorld(id);
    if (!next) return;
    if (next === this.activeWorld) return;

    // Call exits and enters in a way that works with blending:
    // - we keep both scenes alive during blend
    // - but we can already prepare next world state
    this.activeWorld.onExit(this.ctx);
    next.onEnter(this.ctx);

    this.transition.start(this.activeWorld, next);
  }

  public update(dt: number) {
    // Update active world camera logic every frame.
    // If transitioning, it is still okay that both render using the same camera,
    // because the “cinematic blend” is the focus (later you can evolve per-world cameras).
    this.activeWorld.update(this.ctx, dt);

    // If transition finished, swap active world
    const completed = this.transition.consumeCompletedTarget();
    if (completed) {
      this.activeWorld = completed;
    }
  }

  public render() {
    // During transition, the TransitionManager renders both scenes and blends them.
    // Otherwise it renders the active scene directly.
    const active = this.activeWorld;

    // If active transition exists, render based on the from/to worlds.
    // Note: we always pass the same camera for now (simple and stable).
    this.transition.render(active, this.ctx.camera);
  }
}

/* ----------------------------------------------
   Debug UI (keyboard shortcuts)
---------------------------------------------- */

class DebugUI {
  constructor(private worlds: WorldManager) {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;

      if (e.key === "1") {
        this.worlds.requestWorld("education");
      }

      if (e.key === "2") {
        // Stub now, real later
        this.worlds.requestWorld("work");
      }

      if (e.key.toLowerCase() === "r") {
        // Reset scroll to start
        // (works in any world)
        const ctx = (this.worlds as any).ctx as WorldContext | undefined;
        if (ctx) ctx.scroll.setInstant(0);
      }
    });
  }
}

/* ----------------------------------------------
   App bootstrap
---------------------------------------------- */

class App {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;

  private clock = new THREE.Clock();
  private elapsed = 0;

  private scroll = new ScrollController();
  private transition: TransitionManager;
  private worlds: WorldManager;

  constructor() {
    // One canvas
    this.canvas = document.createElement("canvas");
    setCanvasFullScreen(this.canvas);
    document.body.appendChild(this.canvas);

    // One renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // One camera (shared)
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 240);

    // Transition system scaffold
    this.transition = new TransitionManager(this.renderer, window.innerWidth, window.innerHeight);

    const ctx: WorldContext = {
      renderer: this.renderer,
      camera: this.camera,
      scroll: this.scroll,
      time: { elapsed: 0 },
    };

    // Worlds
    const education = new EducationWorld();
    const workStub = new WorkWorldStub();

    this.worlds = new WorldManager(ctx, this.transition, education);
    this.worlds.addWorld(workStub);

    // Minimal debug controls
    new DebugUI(this.worlds);

    // Resize
    window.addEventListener("resize", () => this.onResize());

    // Start
    this.tick();
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.transition.resize(w, h);
  }

  private tick = () => {
    requestAnimationFrame(this.tick);

    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    // Update shared context time
    (this.worlds as any).ctx.time.elapsed = this.elapsed;

    // Update scroll smoothing (disabled during cinematic)
    this.scroll.update(dt);

    // Update active world (and transition swap)
    this.worlds.update(dt);

    // Render (single renderer, single canvas)
    this.worlds.render();
  };
}

// Run
new App();

/*
Keyboard shortcuts:
- 1: go to Education world
- 2: go to Work world (stub now, but transition works)
- R: reset scroll progress to start
*/
