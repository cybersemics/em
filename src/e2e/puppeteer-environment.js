/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const chalk = require('chalk')
const JsDomEnvironment = require('jest-environment-jsdom')
const puppeteer = require('puppeteer')

/** Puppeteer Environment for jest. */
class PuppeteerEnvironment extends JsDomEnvironment {
  browser;
  constructor(config) {
    super(config)
  }

  async setup() {
    console.info(chalk.yellow('Setup Test Environment.'))

    await super.setup()

    this.global.browser = await puppeteer.launch({
      headless: true,
    })

  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment.'))
    await this.global.browser.close()
    await super.teardown()
  }
}

module.exports = PuppeteerEnvironment
