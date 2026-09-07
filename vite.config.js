import { defineConfig } from 'vite';

export default defineConfig({
  // Cloudflare Pages serves the site from the domain root.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    // Three.js is large and rarely changes — keep it in its own cacheable chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'lenis'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
