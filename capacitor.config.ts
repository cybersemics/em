import { CapacitorConfig } from '@capacitor/cli'
import * as dotenv from 'dotenv'
import * as path from 'path'

const nodeEnv = process.env.NODE_ENV || 'development'
const buildMode = process.env.BUILD_MODE || 'server'
console.info(`Configuring ${nodeEnv} build in ${buildMode} mode`)

// A CAPACITOR_SERVER_URL passed in the environment (e.g. scripts/build-em-browserstack-ipa.sh
// baking https://bs-local.com:3000) must win over the .env cascade below, whose `override: true`
// would otherwise replace it with .env.development's localhost default.
const serverUrlFromEnv = process.env.CAPACITOR_SERVER_URL

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`), override: true })

const serverConfig =
  nodeEnv === 'development' && buildMode === 'server'
    ? {
        server: {
          url: serverUrlFromEnv ?? process.env.CAPACITOR_SERVER_URL,
        },
        webDir: 'public',
      }
    : {
        webDir: 'build',
      }

const config: CapacitorConfig = {
  appId: 'com.thinkwithem.em',
  appName: 'em',
  ...serverConfig,
  ios: {
    backgroundColor: '000000',
  },
  plugins: {
    Keyboard: {
      resize: 'none',
    },
    // Android's SystemBars plugin pads the decor view by the IME height, which shrinks the WebView
    // in addition to em's own keyboard-aware positioning. iOS ignores this Android option.
    SystemBars: {
      insetsHandling: 'disable',
    },
  },
}

export default config
