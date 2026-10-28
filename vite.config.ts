import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  preview: {
    host: true,
    port: 4173,
    // Cloudflare quick tunnels / arbitrary preview hosts
    allowedHosts: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'data/*.json'],
      manifest: {
        name: 'Egze Post',
        short_name: 'EgzePost',
        description:
          'Lookup i nauka: u.p.e.a. oraz Kpa — tylko zaimportowany tekst i Twoje tagi.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        lang: 'pl',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        navigateFallback: `${base}index.html`.replace(/\/{2,}/g, '/'),
      },
      devOptions: { enabled: true },
    }),
  ],
})
