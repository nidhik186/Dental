import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the API runs on :4000 (see server/index.js).
    proxy: { '/api': 'http://localhost:4000' },
  },
});
