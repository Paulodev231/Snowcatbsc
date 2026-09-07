/**
 * Device tiering.
 *
 * Nearly all traffic is phones, so the scene is sized to the device before a
 * single frame is drawn: fewer particles, a cheaper transmission pass and a
 * lower pixel ratio on small or weak hardware.
 */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIERS = {
  high: {
    tier: 'high',
    dprCap: 2,
    snowCount: 11000,
    shardDetail: 2,
    fragmentCount: 26,
    transmissionScale: 1,
    antialias: true,
  },
  medium: {
    tier: 'medium',
    dprCap: 1.75,
    snowCount: 6500,
    shardDetail: 1,
    fragmentCount: 18,
    transmissionScale: 0.6,
    antialias: false,
  },
  low: {
    tier: 'low',
    dprCap: 1.5,
    snowCount: 3600,
    shardDetail: 1,
    fragmentCount: 12,
    transmissionScale: 0.4,
    antialias: false,
  },
};

export function detectQuality() {
  const w = window.innerWidth;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  let tier = 'high';
  if (coarse || w < 1024) tier = 'medium';
  if (w < 560 || cores <= 4 || memory <= 3) tier = 'low';

  const preset = TIERS[tier];
  return {
    ...preset,
    // Hard cap at 2 regardless of the device's real ratio.
    pixelRatio: Math.min(window.devicePixelRatio || 1, preset.dprCap, 2),
  };
}
