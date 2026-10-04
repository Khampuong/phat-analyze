import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: { outDir: 'dist' },
  define: {
    // Stamped at build time so the sidebar's "Updated" line never goes stale between deploys.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: {
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 4000}`
    }
  }
})
