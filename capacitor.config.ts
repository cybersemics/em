import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.emtheapp.em',
  appName: 'em',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    url: 'http://192.168.1.65:3000',
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
