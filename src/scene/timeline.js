/**
 * The scrubbed camera timeline.
 *
 * One GSAP timeline, normalised to a duration of 1, mapped to the whole page by
 * ScrollTrigger with `scrub`. Scroll position *is* camera position — nothing
 * here is a section fade-in.
 *
 *   0.00 → 0.08  hold, wide, deep midnight blue
 *   0.08 → 0.30  approach on an arc, facets sweep across frame
 *   0.30 → 0.42  pass straight through the shard, core floods the frame
 *   0.42 → 0.60  open into depth, fog pulls back, crystal field resolves
 *   0.60 → 0.80  descend through the field, light turns pale cyan
 *   0.80 → 1.00  settle wide and still
 */
export function buildCameraTimeline(gsap, view, scrollTrigger = null) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    paused: !scrollTrigger,
    // Passing the config here (rather than driving progress by hand) is what
    // makes `scrub` actually smooth — GSAP eases the playhead toward the
    // scroll position instead of snapping to it.
    ...(scrollTrigger ? { scrollTrigger } : {}),
  });

  // ── Approach ────────────────────────────────────────────────────────────
  tl.to(view, { camZ: 8.4, camX: -0.8, camY: 0.75, duration: 0.11 }, 0.08)
    .to(view, { camZ: 4, camX: 0.6, camY: -0.2, duration: 0.11 }, 0.19)
    .to(view, { fogNear: 2, fogFar: 26, duration: 0.22 }, 0.08)
    .to(view, { light: 0.28, duration: 0.22 }, 0.08)

    // Swing the look-at ahead of the camera *before* it reaches the shard, so
    // the pass-through keeps facing forward instead of whipping around.
    .to(view, { tgtZ: -40, duration: 0.12 }, 0.24)

    // ── Pass through ──────────────────────────────────────────────────────
    .to(view, { camZ: -3.4, camX: 0.1, camY: 0.1, duration: 0.12 }, 0.30)
    .to(view, { fogNear: 0.4, fogFar: 34, duration: 0.12 }, 0.30)
    .to(view, { light: 0.46, duration: 0.12 }, 0.30)
    .to(view, { core: 1, duration: 0.045 }, 0.30)
    .to(view, { core: 0, duration: 0.055 }, 0.345)
    .to(view, { flash: 0.4, duration: 0.032 }, 0.312)
    .to(view, { flash: 0, duration: 0.05 }, 0.344)

    // ── Open into depth ───────────────────────────────────────────────────
    .to(view, { camZ: -12, camY: -0.4, duration: 0.18 }, 0.42)
    .to(view, { fogNear: 6, fogFar: 92, duration: 0.18 }, 0.42)
    .to(view, { light: 0.63, duration: 0.18 }, 0.42)
    .to(view, { tgtY: 0.6, duration: 0.18 }, 0.42)

    // ── Descend through the crystal field ─────────────────────────────────
    .to(view, { camY: -3.2, camX: -1.6, duration: 0.2 }, 0.60)
    .to(view, { tgtY: 1.8, duration: 0.2 }, 0.60)
    .to(view, { roll: 0.05, duration: 0.2 }, 0.60)
    .to(view, { light: 0.86, duration: 0.2 }, 0.60)

    // ── Settle ────────────────────────────────────────────────────────────
    .to(view, { camZ: -19, camY: -4.2, camX: 0.5, duration: 0.2 }, 0.80)
    .to(view, { fogNear: 10, fogFar: 118, duration: 0.2 }, 0.80)
    .to(view, { roll: 0, duration: 0.2 }, 0.80)
    .to(view, { light: 1, duration: 0.2 }, 0.80);

  return tl;
}

/** The ScrollTrigger config that maps the whole document to the timeline. */
export const pageScrub = () => ({
  trigger: document.body,
  start: 'top top',
  end: 'bottom bottom',
  scrub: 0.8,
  invalidateOnRefresh: true,
});
