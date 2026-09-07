import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  MathUtils,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';

/**
 * Falling snow, in two layers.
 *
 * Everything — fall, drift and wrapping — happens in the vertex shader off a
 * single time uniform, so thousands of flakes cost essentially nothing on the
 * CPU. Two details make it work:
 *
 * 1. Camera-relative wrapping. Each flake is re-tiled individually around the
 *    camera (`mod` on the camera-relative offset), so the field always
 *    surrounds the viewer at constant density however far the camera travels,
 *    yet every flake still moves through world space — full parallax, and no
 *    visible jump when the field re-centres.
 *
 * 2. Boxes sized from the camera frustum. The field hugs what the camera can
 *    actually see, so particles aren't wasted off-screen. That is what lets a
 *    phone look properly snowed-on at a third of the desktop particle count.
 *
 * Flakes are analytic soft discs (no texture) and fade out with depth fog.
 */

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;

  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform float uTime;
  uniform float uFall;
  uniform float uDrift;
  uniform float uScale;
  uniform float uMaxPx;

  varying float vFogDepth;
  varying float vSeed;

  void main() {
    // Positions are stored as a unit cube and stretched to the live box, so a
    // resize re-sizes the field without touching the buffers.
    vec3 p = position * uBox;

    // Fall.
    p.y -= uTime * uFall * (0.45 + aSeed * 0.95);

    // Two out-of-phase drifts so the motion never reads as a loop.
    float ph = aSeed * 63.0;
    p.x += sin(uTime * (0.16 + aSeed * 0.26) + ph) * uDrift * (0.35 + aSeed);
    p.z += cos(uTime * (0.11 + aSeed * 0.2) + ph * 0.7) * uDrift * (0.3 + aSeed * 0.8);

    // Re-tile around the camera, per flake.
    vec3 rel = p - uCam;
    rel = mod(rel + uBox, 2.0 * uBox) - uBox;
    vec4 mvPosition = viewMatrix * vec4(uCam + rel, 1.0);

    float dist = max(0.05, -mvPosition.z);
    vFogDepth = dist;
    vSeed = aSeed;

    // Real perspective sizing: aSize is a world-space diameter.
    gl_PointSize = clamp(aSize * uScale / dist, 1.0, uMaxPx);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying float vFogDepth;
  varying float vSeed;

  void main() {
    // Soft round flake, computed rather than sampled.
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.12, d);
    if (alpha < 0.01) discard;

    // Per-flake brightness so the field has texture instead of reading flat.
    float shade = 0.68 + vSeed * 0.32;
    gl_FragColor = vec4(uColor * shade, alpha * uOpacity);

    // Depth fog: distant flakes take the fog colour *and* fade out entirely,
    // so the far edge of the field dissolves instead of forming a wall.
    float fog = smoothstep(uFogNear, uFogFar, vFogDepth);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fog);
    gl_FragColor.a *= 1.0 - fog;
  }
`;

function buildGeometry(count, sizeRange, bigChance, bigRange) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Unit cube; the shader scales it to the live box every frame.
    positions[i * 3] = Math.random() * 2 - 1;
    positions[i * 3 + 1] = Math.random() * 2 - 1;
    positions[i * 3 + 2] = Math.random() * 2 - 1;
    seeds[i] = Math.random();
    const [lo, hi] = Math.random() < bigChance ? bigRange : sizeRange;
    sizes[i] = lo + Math.random() * (hi - lo);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  return geometry;
}

function createLayer({ count, depth, spread, fall, drift, opacity, maxPx, sizeRange, bigChance, bigRange }) {
  const geometry = buildGeometry(count, sizeRange, bigChance, bigRange);

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uCam: { value: new Vector3() },
      uBox: { value: new Vector3(20, 20, depth) },
      uTime: { value: 0 },
      uFall: { value: fall },
      uDrift: { value: drift },
      uScale: { value: 900 },
      uMaxPx: { value: maxPx },
      uColor: { value: new Color('#EAF6FF') },
      uOpacity: { value: opacity },
      uFogColor: { value: new Color('#050B16') },
      uFogNear: { value: 6 },
      uFogFar: { value: 34 },
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  return { points, material, geometry, count, depth, spread };
}

export function createSnow({ count }) {
  const group = new Group();
  group.renderOrder = 1;

  const near = createLayer({
    count: Math.round(count * 0.65),
    depth: 24,
    spread: 1.18,
    fall: 1.8,
    drift: 1.1,
    opacity: 0.95,
    maxPx: 56,
    sizeRange: [0.016, 0.05],
    bigChance: 0.1,
    bigRange: [0.075, 0.15],
  });

  const far = createLayer({
    count: Math.round(count * 0.35),
    depth: 80,
    spread: 1.25,
    fall: 1.1,
    drift: 0.7,
    opacity: 0.75,
    maxPx: 18,
    sizeRange: [0.05, 0.13],
    bigChance: 0.08,
    bigRange: [0.16, 0.3],
  });

  const layers = [near, far];
  layers.forEach((layer) => group.add(layer.points));

  return {
    object: group,

    update(elapsed, camera) {
      for (const layer of layers) {
        layer.material.uniforms.uTime.value = elapsed;
        layer.material.uniforms.uCam.value.copy(camera.position);
      }
    },

    /**
     * Sizes each layer's box to the camera frustum and works out how many
     * pixels one world unit covers at unit distance. Called on resize.
     */
    resize(camera, drawingBufferHeight) {
      const halfFov = MathUtils.degToRad(camera.fov) * 0.5;
      const scale = drawingBufferHeight / (2 * Math.tan(halfFov));

      for (const layer of layers) {
        const halfHeight = Math.tan(halfFov) * layer.depth * layer.spread;
        layer.material.uniforms.uScale.value = scale;
        layer.material.uniforms.uBox.value.set(
          Math.max(6, halfHeight * camera.aspect),
          halfHeight,
          layer.depth
        );
      }
    },

    /** Keeps the flake fog in step with the scene fog as the light shifts. */
    syncFog(color, near_, far_) {
      for (const layer of layers) {
        layer.material.uniforms.uFogColor.value.copy(color);
        layer.material.uniforms.uFogNear.value = near_;
        layer.material.uniforms.uFogFar.value = far_;
      }
    },

    /** Cheap runtime downgrade: draw fewer of the same particles. */
    setDensity(fraction) {
      for (const layer of layers) {
        layer.geometry.setDrawRange(0, Math.max(200, Math.floor(layer.count * fraction)));
      }
    },

    dispose() {
      for (const layer of layers) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
    },
  };
}
