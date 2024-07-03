import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
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
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
    },
  }
})
