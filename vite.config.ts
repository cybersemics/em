import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  build: {
    outDir: 'build',
  },
  plugins: [react()],
})
