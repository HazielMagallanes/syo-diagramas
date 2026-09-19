import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa: funciona igual en localhost y en GitHub Pages (sin depender
// del nombre del repo ni de la ruta de publicación).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          codemirror: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/lang-yaml',
            '@codemirror/theme-one-dark',
          ],
          diagramas: ['d3-flextree', 'd3-hierarchy', '@dagrejs/dagre'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
