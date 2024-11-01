import puppeteer from 'puppeteer-core'
import { type Environment, builtinEnvironments, populateGlobal } from 'vitest/environments'

/** Puppeteer Environment for vitest. */
const PuppeteerEnvironment: Environment = {
  name: 'puppeteer-environment',
  transformMode: 'web',
  async setup(global, options) {
    builtinEnvironments['happy-dom'].setup(global, options)

    // Disable Chrome features that crash GitHub Actions with "Protocol error (Target.createTarget): Target closed."
    // See: https://stackoverflow.com/a/66994528/480608
    // List of Chromium switches: https://peter.sh/experiments/chromium-command-line-switches/
    const args = [
      '--deterministic-fetch',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins',
      '--disable-setuid-sandbox',
      '--disable-site-isolation-trials',
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
