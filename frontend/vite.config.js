import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Fail loudly instead of silently hopping to another port, which would
    // break the backend's ALLOWED_ORIGINS list.
    strictPort: true,
  },
  build: {
    // Not Vite's default "dist": scripts/check-mobile-overflow.cjs and
    // vercel.json both expect the build in frontend/build.
    outDir: 'build',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/setupTests.js'],
    css: false,
  },
});
