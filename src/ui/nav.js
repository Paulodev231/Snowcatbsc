/**
 * Nav: hamburger toggle plus smooth in-page anchors routed through Lenis.
 */
export function initNav({ lenis } = {}) {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!nav || !toggle || !menu) return;

  const desktop = window.matchMedia('(min-width: 900px)');

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close on escape, on outside click, and whenever we cross to desktop.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (desktop.matches) return;
    if (!nav.contains(event.target) && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
    }
  });

  desktop.addEventListener('change', () => setOpen(false));

  // In-page anchors — offset by the nav height so headings clear the bar.
  const navHeight = () => nav.getBoundingClientRect().height;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      setOpen(false);

      const offset = -(navHeight() + 16);
      if (lenis) {
        lenis.scrollTo(target, { offset, duration: 1.15 });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top, behavior: 'auto' });
      }

      // Keep keyboard focus with the destination.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}
