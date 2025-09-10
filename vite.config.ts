import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { loadEnv } from 'vite';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
        }
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    }

  }
}
)