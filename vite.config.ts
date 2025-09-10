import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Handle the API route directly in the proxy
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.url === '/api/visualization' && req.method === 'POST') {
              // Intercept and handle the request
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { GoogleGenerativeAI } = await import('@google/generative-ai');
                  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || 'AIzaSyCsZwYakYNFcOo37li73JGjXTtc0DYmdcQ');
                  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                  
                  const { messageText } = JSON.parse(body);
                  const prompt = `Create an interactive HTML visualization for: "${messageText}". Return only valid HTML with inline CSS and JavaScript. Make it colorful and engaging.`;
                  
                  const result = await model.generateContent(prompt);
                  const response = await result.response;
                  const content = response.text();
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ content }));
                } catch (error) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Failed to generate visualization' }));
                }
              });
              return false; // Don't proxy, we handled it
            }
          });
        }
      }
    }
  }
})