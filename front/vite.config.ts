import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function normalizeBase(input: string | undefined): string {
  const raw = (input ?? '/').trim()
  if (raw === '' || raw === '/') return '/'
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

const appBase = normalizeBase(process.env.VITE_APP_BASE)

// https://vite.dev/config/
export default defineConfig({
  base: appBase,
  assetsInclude: ['**/*.lottie'],
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ai': { target: 'http://localhost:3001', changeOrigin: true },
      '/knowledge': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
