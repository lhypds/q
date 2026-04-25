import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/surveyresult': 'http://localhost:3001',
      '/surveyresults': 'http://localhost:3001',
    },
  },
})
