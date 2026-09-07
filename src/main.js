import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { createSceneRuntime, view } from './scene/index.js';
import { buildCameraTimeline, pageScrub } from './scene/timeline.js';
import { detectQuality, prefersReducedMotion } from './scene/quality.js';

import { initNav } from './ui/nav.js';
import { initContract } from './ui/contract.js';
import { initReveals, initCounters } from './ui/reveal.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = prefersReducedMotion();

/* ── Content UI first: it must work even if WebGL never starts ─────────── */

let lenis = null;

if (!reducedMotion) {
  lenis = new Lenis({
    duration: 1.05,
    lerp: 0.11,
    smoothWheel: true,
    // Native momentum on touch feels better (and costs less) than emulating it.
    syncTouch: false,
    autoRaf: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

initNav({ lenis });
initContract();
initReveals({ reducedMotion });
initCounters({ reducedMotion });

/* ── WebGL backdrop ────────────────────────────────────────────────────── */

const canvas = document.getElementById('scene-canvas');
let runtime = null;

function startScene() {
  if (!canvas) return;

  // No WebGL (or blocked) → the CSS gradient on #webgl stays as the backdrop.
  const probe = document.createElement('canvas');
  const supported = !!(
    window.WebGLRenderingContext &&
    (probe.getContext('webgl2') || probe.getContext('webgl'))
  );
  if (!supported) {
    canvas.style.display = 'none';
    return;
  }

  const quality = detectQuality();

  try {
    runtime = createSceneRuntime({ canvas, quality });
  } catch (error) {
    console.warn('[snowcat] WebGL scene unavailable:', error);
    canvas.style.display = 'none';
    return;
  }

  const timeline = buildCameraTimeline(gsap, view, reducedMotion ? null : pageScrub());

  if (reducedMotion) {
    // A single static frame — no loop, no scrubbing, nothing moving.
    timeline.progress(0.15);
    runtime.render(0, 0);
    window.addEventListener(
      'resize',
      () => {
        runtime.resize();
        runtime.render(0, 0);
      },
      { passive: true }
    );
    return;
  }

  /* ── Render loop: one RAF for Lenis, GSAP and Three ─────────────────── */
  let elapsed = 0;
  let paused = document.hidden;

  gsap.ticker.add((time, deltaMs) => {
    if (paused) return;
    // Clamp the delta so a backgrounded tab or a stall doesn't teleport the snow.
    const delta = Math.min(deltaMs, 50) / 1000;
    elapsed += delta;
    runtime.render(elapsed, delta);
    runtime.watchdog(deltaMs);
  });

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused) {
      lenis?.stop();
    } else {
      lenis?.start();
      // Re-sync after the tab was parked, then draw one frame immediately.
      ScrollTrigger.refresh();
    }
  });

  /* ── Resize (debounced; ignores mobile URL-bar height jitter) ───────── */
  let resizeTimer = null;
  let lastWidth = window.innerWidth;

  window.addEventListener(
    'resize',
    () => {
      runtime.resize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth !== lastWidth) {
          lastWidth = window.innerWidth;
          ScrollTrigger.refresh();
        }
      }, 200);
    },
    { passive: true }
  );

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      runtime.resize();
      ScrollTrigger.refresh();
    }, 250);
  });
}

startScene();

// Fonts land after first paint and change heading heights — re-measure.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

window.addEventListener('load', () => ScrollTrigger.refresh());
