/**
 * Panel entrances and the supply count-up. Both fire once, on IntersectionObserver
 * rather than on the scroll timeline, so they never compete with the camera scrub.
 */

const REVEAL_STAGGER = 90;

export function initReveals({ reducedMotion = false } = {}) {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      // Stagger anything that enters together (e.g. a row of cards).
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.forEach((entry, index) => {
        const el = entry.target;
        setTimeout(() => el.classList.add('is-in'), index * REVEAL_STAGGER);
        observer.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  items.forEach((el) => observer.observe(el));
}

/** Counts the supply figure up once, the first time it is seen. */
export function initCounters({ reducedMotion = false } = {}) {
  const nodes = Array.from(document.querySelectorAll('[data-count-to]'));
  if (!nodes.length) return;

  const format = (n) => Math.round(n).toLocaleString('en-US');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    nodes.forEach((el) => {
      el.textContent = format(Number(el.dataset.countTo));
    });
    return;
  }

  const run = (el) => {
    const to = Number(el.dataset.countTo);
    if (!Number.isFinite(to)) return;

    const duration = 1900;
    const start = performance.now();
    // Ease-out cubic: fast off the line, gentle landing on the real number.
    const ease = (t) => 1 - (1 - t) ** 3;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(to * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = format(to);
    };

    el.textContent = format(0);
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  nodes.forEach((el) => observer.observe(el));
}
