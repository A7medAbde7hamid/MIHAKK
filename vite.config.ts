import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repo from a subpath; Vercel serves from `/`.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/MIHAKK/' : '/',
  publicDir: 'public',
})
