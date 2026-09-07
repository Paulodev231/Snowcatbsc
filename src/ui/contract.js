/**
 * Contract address: copy to clipboard, and middle-truncate on narrow screens
 * so the address stays on one readable line instead of wrapping to three.
 */

const COPIED_MS = 2000;

function middleTruncate(address, head, tail) {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function initContract() {
  const value = document.getElementById('ca-value');
  const button = document.getElementById('ca-copy');
  const status = document.getElementById('ca-status');
  if (!value || !button) return;

  const address = value.dataset.address || value.textContent.trim();
  const label = button.querySelector('.contract__copy-text');

  // ── Responsive truncation ────────────────────────────────────────────
  const render = () => {
    const width = window.innerWidth;
    if (width >= 720) {
      value.textContent = address;
    } else if (width >= 460) {
      value.textContent = middleTruncate(address, 16, 12);
    } else {
      value.textContent = middleTruncate(address, 11, 9);
    }
  };

  render();
  window.addEventListener('resize', render, { passive: true });

  // Full address on hover, and — since the visible text is aria-hidden and may
  // be truncated — a spaced-out copy for screen readers, which reads it
  // character by character rather than as one unpronounceable word.
  value.setAttribute('title', address);
  const full = document.getElementById('ca-full');
  if (full) full.textContent = `Contract address ${address.split('').join(' ')}`;

  // ── Copy ─────────────────────────────────────────────────────────────
  let timer = null;

  async function copy() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
        ok = true;
      }
    } catch {
      ok = false;
    }

    if (!ok) {
      // Fallback for insecure contexts and older mobile browsers.
      const scratch = document.createElement('textarea');
      scratch.value = address;
      scratch.setAttribute('readonly', '');
      scratch.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(scratch);
      scratch.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      scratch.remove();
    }

    if (label) label.textContent = ok ? 'Copied' : 'Copy failed';
    button.classList.toggle('is-copied', ok);
    if (status) status.textContent = ok ? 'Contract address copied to clipboard' : 'Copy failed — select the address manually';

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (label) label.textContent = button.dataset.label || 'Copy';
      button.classList.remove('is-copied');
      if (status) status.textContent = '';
    }, COPIED_MS);
  }

  button.addEventListener('click', copy);
}
