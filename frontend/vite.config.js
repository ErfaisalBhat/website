import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["results.vminstitute.in", "resultsadmin.vminstitute.in", "verifyresults.vminstitute.in", "admin.vminstitute.in"],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
