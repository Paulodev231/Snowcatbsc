import { defineConfig } from 'vite';

export default defineConfig({
  // Cloudflare Pages serves the site from the domain root.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    // Split the vendor code out: three and the motion libs change far less
    // often than the site, so they stay cached across deploys. (Total bytes are
    // the same either way — we use enough of three that nothing tree-shakes.)
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,
    port: 5173,
  },
});
