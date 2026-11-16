import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('axios')) {
              return 'vendor-core';
            }
            return 'vendor';
          }
          if (id.includes('features/admin') || id.includes('features\\admin')) {
            return 'feature-admin';
          }
          if (id.includes('features/evaluation') || id.includes('features\\evaluation')) {
            return 'feature-evaluation';
          }
          if (id.includes('features/auth') || id.includes('features\\auth')) {
            return 'feature-auth';
          }
        },
      },
    },
  },
})
