import puppeteer from 'puppeteer'
import type { Environment } from 'vitest'
import { builtinEnvironments, populateGlobal } from 'vitest/environments'

/** Puppeteer Environment for vitest. */
const PuppeteerEnvironment: Environment = {
  name: 'puppeteer-environment',
  transformMode: 'web',
  async setup(global, options) {
    builtinEnvironments['happy-dom'].setup(global, options)

    const browser = await puppeteer
      .launch({
        headless: true,
        // Disable Chrome features that crash GitHub Actions with "Protocol error (Target.createTarget): Target closed."
        // See: https://stackoverflow.com/a/66994528/480608
        // List of Chromium switches: https://peter.sh/experiments/chromium-command-line-switches/
        args: [
          '--deterministic-fetch',
          '--disable-dev-shm-usage',
          '--disable-features=IsolateOrigins',
          '--disable-setuid-sandbox',
          '--disable-site-isolation-trials',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
        ],
        // Increase timeout to avoid: "TimeoutError: Timed out after 30000 ms while trying to connect to the browser! Only Chrome at revision r869685 is guaranteed to work."
        timeout: 60000,
      })
      // catch and log a launch error, otherwise it will not appear in the CI logs
      .catch(e => {
        console.error('Error launching puppeteer:', e)
        throw e
      })

    const { Window, GlobalWindow } = await import('happy-dom')
    const win = new (GlobalWindow || Window)()

    const { keys, originals } = populateGlobal(global, {
      ...win,
      browser,
    })

    return {
      async teardown() {
        if (browser) {
          await browser.close()
        }

        keys.forEach(key => delete global[key])
        originals.forEach((v, k) => (global[k] = v))
      },
    }
  },
}

export default PuppeteerEnvironment
