// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// // http://localhost:5173  -> dev server
// // Proxy /api to backend at http://localhost:3000
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': 'http://localhost:3000',
//     },
//   },
// });
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3000', // Axum backend
        changeOrigin: true
      }
    }
  }
})
