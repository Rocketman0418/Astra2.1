import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace('/.netlify/functions', '/src/api')
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  }
});