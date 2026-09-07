import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

import { createEnvironment } from './environment.js';
import { createShard, createShardField } from './shard.js';
import { createSnow } from './snow.js';

/**
 * Light stops. Scroll progress lerps through these three, taking the scene from
 * deep midnight blue to pale cyan.
 */
const STOPS = [
  {
    bg: '#050B16', fog: '#050B16',
    ambient: '#12304F', ambientI: 1.6,
    key: '#5BA8E0', keyI: 4.2,
    rim: '#1E5F9E', rimI: 2.4,
    tint: '#2E86C8', coreI: 6,
    env: 1.1,
  },
  {
    bg: '#071A2C', fog: '#0A2138',
    ambient: '#1B4A70', ambientI: 2,
    key: '#7FCDF0', keyI: 4.8,
    rim: '#2E7FB8', rimI: 2.8,
    tint: '#4FC8F5', coreI: 16,
    env: 1.5,
  },
  {
    bg: '#0A2436', fog: '#123A52',
    ambient: '#2A6A8C', ambientI: 2.4,
    key: '#C8F1FF', keyI: 5.2,
    rim: '#6FD3F5', rimI: 3.2,
    tint: '#7FE3FF', coreI: 9,
    env: 1.9,
  },
];

/**
 * Portrait phones see a much narrower slice of the scene than a desktop at the
 * same camera distance, so the whole camera rig is pushed back proportionally.
 * The shard then frames identically at 380px and 2560px.
 */
function rigScaleFor(aspect) {
  return aspect >= 1 ? 1 : 1 + (1 - aspect) * 0.92;
}

/** Camera / lighting state, written by the scroll timeline, read every frame. */
export const view = {
  camX: 0,
  camY: 0.5,
  camZ: 15,
  tgtX: 0,
  tgtY: 0,
  tgtZ: 0,
  roll: 0,
  fogNear: 6,
  fogFar: 34,
  light: 0,
  core: 0,
  flash: 0,
};

function parseStops(key) {
  return STOPS.map((stop) => new Color(stop[key]));
}

export function createSceneRuntime({ canvas, quality }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
    depth: true,
  });

  renderer.setPixelRatio(quality.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  // The transmission pass re-renders the scene; on phones it runs at a fraction
  // of the canvas resolution, which is where most of the mobile budget is won.
  renderer.transmissionResolutionScale = quality.transmissionScale;

  const scene = new Scene();
  const fogColor = new Color(STOPS[0].fog);
  scene.fog = new Fog(fogColor, view.fogNear, view.fogFar);

  const camera = new PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(view.camX, view.camY, view.camZ);

  const environment = createEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = STOPS[0].env;

  // ── Lights ─────────────────────────────────────────────────────────────
  const ambient = new AmbientLight(new Color(STOPS[0].ambient), STOPS[0].ambientI);
  const key = new DirectionalLight(new Color(STOPS[0].key), STOPS[0].keyI);
  key.position.set(5, 9, 7);
  const rim = new DirectionalLight(new Color(STOPS[0].rim), STOPS[0].rimI);
  rim.position.set(-7, -3, -6);
  const core = new PointLight(new Color(STOPS[0].tint), 0, 26, 2);
  scene.add(ambient, key, rim, core);

  // ── Objects ────────────────────────────────────────────────────────────
  const snow = createSnow({ count: quality.snowCount });
  const shard = createShard({
    detail: quality.shardDetail,
    transmissionScale: quality.transmissionScale,
    environment,
  });
  const field = createShardField({ count: quality.fragmentCount });

  scene.add(snow.object, shard.object, field.object);

  // ── Colour interpolation across the three stops ────────────────────────
  const palettes = {
    bg: parseStops('bg'),
    fog: parseStops('fog'),
    ambient: parseStops('ambient'),
    key: parseStops('key'),
    rim: parseStops('rim'),
    tint: parseStops('tint'),
  };
  const scratch = {
    bg: new Color(),
    fog: new Color(),
    ambient: new Color(),
    key: new Color(),
    rim: new Color(),
    tint: new Color(),
  };

  function mix(name, t, out) {
    const stops = palettes[name];
    const span = stops.length - 1;
    const scaled = Math.max(0, Math.min(1, t)) * span;
    const i = Math.min(span - 1, Math.floor(scaled));
    return out.copy(stops[i]).lerp(stops[i + 1], scaled - i);
  }

  function lerpNumber(name, t) {
    const span = STOPS.length - 1;
    const scaled = Math.max(0, Math.min(1, t)) * span;
    const i = Math.min(span - 1, Math.floor(scaled));
    const f = scaled - i;
    return STOPS[i][name] + (STOPS[i + 1][name] - STOPS[i][name]) * f;
  }

  const target = new Vector3();
  const flashEl = document.getElementById('ice-flash');
  let rigScale = rigScaleFor(camera.aspect);

  function applyView() {
    const s = rigScale;
    camera.position.set(view.camX * s, view.camY * s, view.camZ * s);
    target.set(view.tgtX * s, view.tgtY * s, view.tgtZ * s);
    camera.lookAt(target);
    camera.rotation.z += view.roll;

    const near = view.fogNear * s;
    const far = view.fogFar * s;

    const t = view.light;
    mix('bg', t, scratch.bg);
    mix('fog', t, scratch.fog);
    renderer.setClearColor(scratch.bg, 1);

    scene.fog.color.copy(scratch.fog);
    scene.fog.near = near;
    scene.fog.far = far;
    scene.environmentIntensity = lerpNumber('env', t);
    snow.syncFog(scratch.fog, near, far);

    ambient.color.copy(mix('ambient', t, scratch.ambient));
    ambient.intensity = lerpNumber('ambientI', t);
    key.color.copy(mix('key', t, scratch.key));
    key.intensity = lerpNumber('keyI', t);
    rim.color.copy(mix('rim', t, scratch.rim));
    rim.intensity = lerpNumber('rimI', t);

    mix('tint', t, scratch.tint);
    shard.setTint(scratch.tint);
    field.setTint(scratch.tint);
    core.color.copy(scratch.tint);
    core.intensity = lerpNumber('coreI', t) * (0.15 + view.core * 2.2);

    shard.setCoreOpacity(view.core * 0.85);
    if (flashEl) flashEl.style.opacity = view.flash.toFixed(3);
  }

  // ── Runtime quality guard ──────────────────────────────────────────────
  let degradeLevel = 0;
  let sampleTime = 0;
  let sampleFrames = 0;

  function watchdog(deltaMs) {
    if (degradeLevel >= 2) return;
    sampleTime += deltaMs;
    sampleFrames += 1;
    if (sampleFrames < 60) return;

    const average = sampleTime / sampleFrames;
    sampleTime = 0;
    sampleFrames = 0;

    // Sustained frames slower than ~45fps: give something back.
    if (average > 22) {
      degradeLevel += 1;
      if (degradeLevel === 1) {
        renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.25));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.transmissionResolutionScale = Math.min(renderer.transmissionResolutionScale, 0.35);
        snow.resize(camera, renderer.domElement.height);
      } else {
        snow.setDensity(0.55);
        shard.material.transmission = 0.4;
        shard.material.thickness = 1;
        shard.material.clearcoat = 0;
        shard.material.needsUpdate = true;
      }
    }
  }

  function render(elapsed, delta) {
    shard.update(elapsed, delta);
    field.update(elapsed);
    applyView();
    // Snow follows the camera, so it updates after the camera has moved.
    snow.update(elapsed, camera);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    rigScale = rigScaleFor(camera.aspect);
    snow.resize(camera, renderer.domElement.height);
  }

  // Size the snow field to the frustum before the first frame.
  snow.resize(camera, renderer.domElement.height);

  function dispose() {
    snow.dispose();
    shard.dispose();
    field.dispose();
    environment.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, render, resize, watchdog, dispose, view };
}
