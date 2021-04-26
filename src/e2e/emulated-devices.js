import { devices } from 'puppeteer'

export const iPhone = devices['iPhone 11']

export const desktop = {
  name: 'Desktop 800x600',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
  viewport: {
    width: 800,
    height: 600
  }
}

const emulatedDevices = [desktop, iPhone]

export default emulatedDevices
