import { CanvasTexture, EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace } from 'three';

/**
 * A tiny procedural environment map.
 *
 * The shard needs *something* to reflect and refract or its facets read flat.
 * Rather than shipping an HDR (hundreds of KB and a second request), we paint a
 * 256x128 arctic gradient with a couple of bright spots and run it through
 * PMREM once at startup. Cost: a few milliseconds and zero bytes over the wire.
 */
export function createEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#071A30');
  sky.addColorStop(0.38, '#1E6C9E');
  sky.addColorStop(0.5, '#CFEFFF'); // horizon band — the shard's key highlight
  sky.addColorStop(0.62, '#2A6A8C');
  sky.addColorStop(1, '#04101E');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Two soft lamps so the facets pick up distinct specular hits.
  const lamps = [
    { x: 60, y: 44, r: 34, color: 'rgba(190, 240, 255, 0.95)' },
    { x: 196, y: 60, r: 26, color: 'rgba(90, 170, 230, 0.75)' },
  ];
  for (const lamp of lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.r);
    glow.addColorStop(0, lamp.color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - lamp.r, lamp.y - lamp.r, lamp.r * 2, lamp.r * 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;

  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(texture);

  texture.dispose();
  pmrem.dispose();

  return target.texture;
}
