import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Un año en segundos, para cachear fuentes mucho tiempo.
const UN_ANIO = 60 * 60 * 24 * 365;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Corte',
        short_name: 'Corte',
        description: 'Gestión para barberías: fichá tus cortes, manejá tus turnos.',
        lang: 'es-AR',
        theme_color: '#221F1A',
        background_color: '#221F1A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          // SVG escalable (Chrome/Android lo soporta). Sumar PNGs 192/512 si
          // algún dispositivo viejo no lo toma.
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Las fuentes vienen de CDN (Fontshare / Google Fonts). Las cacheamos
        // en runtime para que la app ande 100% offline después de la 1ra carga.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: UN_ANIO },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: UN_ANIO },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(api|cdn)\.fontshare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fontshare',
              expiration: { maxEntries: 30, maxAgeSeconds: UN_ANIO },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Permite probar la PWA en `npm run dev`.
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
