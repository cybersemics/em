import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    checker({ typescript: true }),
    VitePWA({ injectRegister: null, strategies: 'injectManifest', srcDir: 'src', filename: 'service-worker.ts' }),
  ],
})
