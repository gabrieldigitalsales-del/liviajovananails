import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyExtraFiles() {
  const toCopy = ['assets', 'bootstrap.js', 'admin-enhancer.js', '__manus__'];
  return {
    name: 'copy-extra-files',
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist');
      for (const item of toCopy) {
        const src = path.resolve(process.cwd(), item);
        const dest = path.resolve(outDir, item);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true });
        }
      }
    }
  };
}

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  plugins: [copyExtraFiles()]
});
