import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // dev server
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // forward frontend requests to backend during dev
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // preview server (after build) — keep your host allowlist if you use Render
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    //allowedHosts: ['frontend-tgl3.onrender.com'],
    allowedHosts: ['frontend-0s8v.onrender.com'],
  },
});
