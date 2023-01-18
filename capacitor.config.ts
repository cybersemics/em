import { CapacitorConfig } from '@capacitor/cli'
import * as dotenv from 'dotenv'
import * as path from 'path'

const nodeEnv = process.env.NODE_ENV || 'development'
console.info(`Configuring ${nodeEnv} build`)
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`) })

const config: CapacitorConfig = {
  appId: 'com.emtheapp.em',
  appName: 'em',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: true,
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
}

export default config
