/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const JsDomEnvironment = require('jest-environment-jsdom')
const puppeteer = require('puppeteer')

/** Puppeteer Environment for jest. */
class PuppeteerEnvironment extends JsDomEnvironment {
  browser
  constructor(config) {
    super(config)
  }

  async setup() {
    await super.setup()

    // Note: this.global is not global to all test suites; it is sandboxed to a single test module, e.g. caret.ts
    this.global.browser = await puppeteer
      .launch({
        headless: true,
      })
      // catch and log a launch error, otherwise it will not appear in the CI logs
      .catch(e => {
        console.error('Error launching puppeteer:', e)
        throw e
      })
  }

  async teardown() {
    // browser will only be undefined if setup failed
    if (this.global.browser) {
      await this.global.browser.close()
    }
    await super.teardown()
  }
}

module.exports = PuppeteerEnvironment
