import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
  server: {
    proxy: {
      '/surveyresult': 'http://localhost:3001',
      '/surveyresults': 'http://localhost:3001',
      '/surveys': 'http://localhost:3001',
    },
  },
})
