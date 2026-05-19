import puppeteer from 'puppeteer-core'
import { type Environment, builtinEnvironments, populateGlobal } from 'vitest/environments'

/** Puppeteer Environment for vitest. */
const PuppeteerEnvironment: Environment = {
  name: 'puppeteer-environment',
  viteEnvironment: 'client',
  async setup(global, options) {
    builtinEnvironments['happy-dom'].setup(global, options)

    // Keep cross-origin isolation enabled so direct OPFS can run in Puppeteer.
    // List of Chromium switches: https://peter.sh/experiments/chromium-command-line-switches/
    const args = [
      '--deterministic-fetch',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--ignore-certificate-errors',
    ]

    const browser = await puppeteer
      .connect({ browserWSEndpoint: `ws://localhost:7566?${args.join('&')}` })
      // catch and log a launch error, otherwise it will not appear in the CI logs
      .catch((err: Error) => {
        // using `console.log` here to avoid errors or logs being swallowed by vitest
        // all of `console.error`, `console.warn` and `console.info` don't show up in the terminal
        // eslint-disable-next-line no-console
        console.log('Could not connect to browserless.')
        throw err
      })

    const { Window, GlobalWindow } = await import('happy-dom')
    const win = new (GlobalWindow || Window)()

    const { keys, originals } = populateGlobal(global, {
      ...win,
      browser,
    })

    return {
      async teardown() {
        await browser.disconnect()
        keys.forEach(key => delete global[key])
        originals.forEach((v, k) => (global[k] = v))
      },
    }
  },
}

export default PuppeteerEnvironment
