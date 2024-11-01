import { CapacitorConfig } from '@capacitor/cli'
import * as dotenv from 'dotenv'
import * as path from 'path'

const nodeEnv = process.env.NODE_ENV || 'development'
console.info(`Configuring ${nodeEnv} build`)
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true })
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`), override: true })

const serverConfig =
  nodeEnv === 'development'
    ? {
        server: {
          url: process.env.CAPACITOR_SERVER_URL,
          cleartext: true,
        },
      }
    : {}

const config: CapacitorConfig = {
  appId: 'com.thinkwithem.em',
  appName: 'em',
  webDir: 'build',
  ...serverConfig,
  ios: {
    backgroundColor: '000000',
  },
  plugins: {
    Keyboard: {
      resize: 'none',
    },
  },
}

export default config
