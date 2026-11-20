import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: false,
    // The cover film is a 44 MB mp4 in public/: watching it makes chokidar
    // throw EBUSY on Windows and takes the dev server down. The editor's
    // atomic-write temp dirs (src/.App.vue.<pid>.<uuid>.tmpdir) trip the same
    // error, so they are ignored too.
    watch: { ignored: ['**/public/film/**', '**/*.tmp', '**/.*.tmpdir/**'] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
})
