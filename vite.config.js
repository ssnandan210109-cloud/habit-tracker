import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const modulePath = id.replaceAll('\\', '/')
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return 'react-vendor'
          if (/\/node_modules\/(recharts|d3-[^/]+|victory-vendor)\//.test(modulePath)) return 'charts-vendor'
          if (/\/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(modulePath)) return 'motion-vendor'
        },
      },
    },
  },
})