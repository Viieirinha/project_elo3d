import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'ELO 3D — Calculadora de Custos',
        short_name: 'ELO 3D',
        description: 'Calculadora de custos, estoque, vendas e encomendas para impressão 3D.',
        theme_color: '#0d0e12',
        background_color: '#0d0e12',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Ícones PNG (manifest/favicon) não precisam ficar em cache offline: só o código, estilos e o logo leve.
        globPatterns: ['**/*.{js,css,html,svg,ico,webp,woff2}'],
        navigateFallbackDenylist: [/^\/__/, /^\/api\//],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
