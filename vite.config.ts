import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  }
});