import { defineConfig } from 'vite'

export default defineConfig({
  // Relative assets work at a Vercel root and under a GitHub Pages repo path.
  base: './',
  build: {
    chunkSizeWarningLimit: 650,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/tmi.js')) return 'tmi'
        },
      },
    },
  },
})
