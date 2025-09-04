import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@capacitor-community/sqlite'],
  },
  build: {
    target: 'esnext',
    minify: false,
  }
})