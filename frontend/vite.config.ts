import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/auth':      'http://localhost:3000',
      '/documents': 'http://localhost:3000',
      '/share':     'http://localhost:3000',
      '/health':    'http://localhost:3000',
      '/ws':        { target: 'ws://localhost:3000', ws: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Aggressive chunking — keep first paint under ~200KB gzip.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap'))            return 'editor'
            if (id.includes('prosemirror'))         return 'editor'
            if (id.includes('@xyflow') || id.includes('d3-'))  return 'diagram'
            if (id.includes('yjs') || id.includes('y-protocols') || id.includes('y-websocket')) return 'collab'
            if (id.includes('lucide-react'))        return 'icons'
            if (id.includes('react-router'))        return 'router'
            if (id.includes('react-dom'))           return 'react'
          }
        },
      },
    },
  },
})
