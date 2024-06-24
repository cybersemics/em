import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Vite configuration - https://vitejs.dev/config/. */
const config = ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd())

  return defineConfig({
    resolve: {
      alias: {
        'react-native': 'react-native-web',
        /*
          Use the premium RxDB IndexedDB plugin if the environment variable is set to true.
          Otherwise, use the default Dexie plugin.
         */
        'rxdb-indexeddb':
          env.VITE_USE_RXDB_PREMIUM === 'true'
            ? resolve(__dirname, 'node_modules/rxdb-premium/plugins/storage-indexeddb')
            : resolve(__dirname, 'node_modules/rxdb/plugins/storage-dexie'),
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
}

export default config
