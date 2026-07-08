import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/v1': {
        target: process.env.VLLM_PROXY_TARGET ?? 'http://host.docker.internal:8000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VLLM_PROXY_TARGET ?? 'http://host.docker.internal:8000',
        changeOrigin: true,
        // vLLM takes many minutes to load; suppress ECONNREFUSED noise in dev logs.
        configure: (proxy) => {
          proxy.on('error', () => {});
        },
      },
    },
  },
});
