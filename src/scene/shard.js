import {
  AdditiveBlending,
  BackSide,
  Color,
  EdgesGeometry,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';

/**
 * The hero object: a faceted crystalline ice shard.
 *
 * An icosahedron is displaced per *unique* vertex position (polyhedron
 * geometry is non-indexed, so co-located vertices must move together or the
 * facets tear open), then pinched toward the poles into a bipyramidal crystal
 * and elongated. computeVertexNormals + flatShading gives hard, readable
 * facets; MeshPhysicalMaterial's transmission makes it genuinely refract the
 * snow behind it rather than faking it with opacity.
 */

/** Deterministic PRNG so every visitor gets the same crystal. */
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createShardGeometry({ detail = 2, seed = 20260101, jitter = 0.26, stretch = 1.55 } = {}) {
  const geometry = new IcosahedronGeometry(1, detail);
  const position = geometry.attributes.position;
  const rand = mulberry32(seed);
  const cache = new Map();
  const v = new Vector3();

  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);

    // Same displacement for every duplicate of a vertex → watertight facets.
    const key = `${v.x.toFixed(4)}|${v.y.toFixed(4)}|${v.z.toFixed(4)}`;
    let scale = cache.get(key);
    if (scale === undefined) {
      scale = 1 - jitter * 0.5 + rand() * jitter;
      cache.set(key, scale);
    }
    v.multiplyScalar(scale);

    // Pinch toward the poles so it reads as a crystal, not a rock.
    const ny = Math.max(-1, Math.min(1, v.y / 1.25));
    const pinch = 1 - 0.52 * Math.abs(ny) ** 1.5;
    v.x *= pinch;
    v.z *= pinch;
    v.y *= stretch;

    position.setXYZ(i, v.x, v.y, v.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createShard({ detail = 2, transmissionScale = 1, environment = null }) {
  const group = new Object3D();
  const cheap = transmissionScale <= 0.45;

  const geometry = createShardGeometry({ detail });

  const material = new MeshPhysicalMaterial({
    color: new Color('#DCF2FF'),
    metalness: 0,
    roughness: cheap ? 0.12 : 0.05,
    // The whole point: what's behind the shard is refracted through it.
    transmission: 1,
    thickness: cheap ? 1.4 : 2.6,
    ior: 1.31,
    attenuationColor: new Color('#2E86C8'),
    attenuationDistance: cheap ? 9 : 6,
    clearcoat: cheap ? 0 : 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 2.4,
    flatShading: true,
    transparent: true,
    opacity: 1,
  });
  if (environment) material.envMap = environment;

  const mesh = new Mesh(geometry, material);
  mesh.scale.setScalar(2.4);
  mesh.renderOrder = 2;
  group.add(mesh);

  // Facet edges — a single cheap draw call that sharpens the silhouette.
  const edges = new LineSegments(
    new EdgesGeometry(geometry, 14),
    new LineBasicMaterial({
      color: new Color('#7FE3FF'),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
  );
  // Child of the mesh, so this scale is *relative* — a hair proud of the faces.
  edges.scale.setScalar(1.004);
  mesh.add(edges);

  // Inner core. Back-faced and additive, so it is invisible from outside but
  // floods the frame as the camera passes through the shard.
  const core = new Mesh(
    new IcosahedronGeometry(0.94, 1),
    new MeshBasicMaterial({
      color: new Color('#7FE3FF'),
      side: BackSide,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  core.scale.setScalar(2.4);
  core.renderOrder = 3;
  group.add(core);

  return {
    object: group,
    mesh,
    core,
    material,
    edgeMaterial: edges.material,

    /** Slow idle rotation, independent of scroll. */
    update(elapsed, delta) {
      mesh.rotation.y += delta * 0.085;
      mesh.rotation.x = Math.sin(elapsed * 0.21) * 0.16;
      mesh.rotation.z = Math.cos(elapsed * 0.15) * 0.11;
      core.rotation.copy(mesh.rotation);
    },

    setTint(color) {
      material.attenuationColor.copy(color);
      core.material.color.copy(color);
      edges.material.color.copy(color);
    },

    setCoreOpacity(value) {
      core.material.opacity = value;
      core.visible = value > 0.001;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
    },
  };
}

/**
 * The crystal field that resolves out of the fog once the camera is through
 * the hero shard. One InstancedMesh — 26 shards, one draw call.
 */
export function createShardField({ count = 26, seed = 7331 }) {
  const geometry = createShardGeometry({ detail: 0, seed: seed + 1, jitter: 0.42, stretch: 1.8 });
  const material = new MeshStandardMaterial({
    color: new Color('#9CD9F5'),
    roughness: 0.18,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity: 0.55,
    emissive: new Color('#123A5C'),
    emissiveIntensity: 0.6,
    depthWrite: false,
  });

  const instances = new InstancedMesh(geometry, material, count);
  instances.frustumCulled = false;
  instances.renderOrder = 0;

  const rand = mulberry32(seed);
  const shards = [];
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const euler = new Euler(0, 0, 0, 'XYZ');

  for (let i = 0; i < count; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    shards.push({
      x: side * (5 + rand() * 15),
      y: -14 + rand() * 20,
      z: -18 - rand() * 52,
      rx: rand() * Math.PI,
      ry: rand() * Math.PI,
      rz: rand() * Math.PI,
      spin: (0.03 + rand() * 0.09) * (rand() < 0.5 ? -1 : 1),
      scale: 0.7 + rand() * 2.6,
    });
  }

  function update(elapsed) {
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      euler.set(s.rx + elapsed * s.spin * 0.4, s.ry + elapsed * s.spin, s.rz);
      quaternion.setFromEuler(euler);
      position.set(s.x, s.y, s.z);
      scale.setScalar(s.scale);
      matrix.compose(position, quaternion, scale);
      instances.setMatrixAt(i, matrix);
    }
    instances.instanceMatrix.needsUpdate = true;
  }

  return {
    object: instances,
    material,
    update,
    setTint(color) {
      material.emissive.copy(color);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      instances.dispose();
    },
  };
}
