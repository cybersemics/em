import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Vite configuration - https://vitejs.dev/config/. */
const config = () =>
  defineConfig({
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
      VitePWA({ injectRegister: null, strategies: 'injectManifest', srcDir: 'src', filename: 'service-worker.ts' }),
    ],
  })

export default config
