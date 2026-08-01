import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // lottie-react has no package.json "exports" field, so Vite falls back to
      // "main" (a UMD/CJS bundle) instead of "module"; CJS-to-ESM interop then
      // wraps the whole module as default, breaking `import Lottie from 'lottie-react'`.
      'lottie-react': 'lottie-react/build/index.es.js',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
