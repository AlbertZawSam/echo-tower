import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build ID = timestamp-based, shown bottom-left and written to SUBMISSION.txt by tools/submit.mjs.
const buildId = process.env.BUILD_ID || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
export default defineConfig({
  base: './', // relative paths so the build works from any static host or subfolder
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
