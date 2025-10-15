import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // no proxy needed — direct API calls to http://localhost:3001
  server: {
    host: '0.0.0.0',
    port: 5173,
  },

  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    //allowedHosts: ['frontend-tgl3.onrender.com'],
    allowedHosts: ['frontend-0s8v.onrender.com'],
  },
});
