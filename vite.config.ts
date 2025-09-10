import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { loadEnv } from 'vite'
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://astracompanyagent.netlify.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
              const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
              if (apiKey) {
                proxyReq.setHeader('x-gemini-api-key', apiKey);
            }
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  }
})
