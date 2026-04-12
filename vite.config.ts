import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'Idle-Champions-Helper'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : `/${repoName}/`,
}))
