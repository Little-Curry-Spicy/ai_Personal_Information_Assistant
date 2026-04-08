import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.lottie'],
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ai': { target: 'http://localhost:3001', changeOrigin: true },
      '/knowledge': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
