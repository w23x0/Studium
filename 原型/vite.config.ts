import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'src/ui',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src/ui', import.meta.url)) } },
  build: { outDir: '../../dist/ui', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  server: {
    // 开发时：核心另跑（npm run dev），界面这边把 /api 转过去
    proxy: { '/api': { target: 'http://127.0.0.1:4317', changeOrigin: true } },
  },
});
