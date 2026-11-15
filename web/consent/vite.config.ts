import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  root: 'web/consent', base: '/oauth/consent/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), tailwindcss(), { name: 'clean-generated-assets', buildStart() { rmSync('public/oauth/consent/assets', { recursive: true, force: true }); } }],
  build: { outDir: '../../public/oauth/consent', emptyOutDir: false },
});
