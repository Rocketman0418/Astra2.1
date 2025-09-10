import { defineConfig } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnv } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['lucide-react'],
  }
});