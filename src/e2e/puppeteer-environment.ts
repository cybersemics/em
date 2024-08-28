import puppeteer from 'puppeteer-core'
import { type Environment, builtinEnvironments, populateGlobal } from 'vitest/environments'

/** Puppeteer Environment for vitest. */
const PuppeteerEnvironment: Environment = {
  name: 'puppeteer-environment',
  transformMode: 'web',
  async setup(global, options) {
    builtinEnvironments['happy-dom'].setup(global, options)

    const args = [
      '--deterministic-fetch',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins',
      '--disable-setuid-sandbox',
      '--disable-site-isolation-trials',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
    ]

    const browser = await puppeteer
      .connect({ browserWSEndpoint: `ws://localhost:7566?${args.join('&')}` })
      // catch and log a launch error, otherwise it will not appear in the CI logs
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.log('Could not connect to browserless.\nMake sure to run `yarn browserless` before running the tests.')
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
