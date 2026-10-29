import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// Standalone visual proposal: no PWA / service worker, separate output dir,
// never part of the GitHub Pages build.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5180, allowedHosts: true },
  preview: { host: true, port: 4180, allowedHosts: true },
  build: {
    outDir: 'dist-mockup',
    rollupOptions: {
      input: fileURLToPath(new URL('./mockup.html', import.meta.url)),
    },
  },
})
