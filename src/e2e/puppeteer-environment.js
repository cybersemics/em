/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */
const chalk = require('chalk')
const JsDomEnvironment = require('jest-environment-jsdom')
const puppeteer = require('puppeteer')
const { setup: setupDevServer, teardown: teardownDevServer } = require('jest-dev-server')
const fs = require('fs/promises')
const path = require('path')

/**
 * Delay for tests.
 */
const delay = ms => new Promise(resolve => setTimeout(() => resolve(true), ms))

/** */
class PuppeteerEnvironment extends JsDomEnvironment {
  constructor(config) {
    super(config)
  }

  async setup() {
    console.info(chalk.yellow('Setup Test Environment.'))

    await super.setup()

    const buildPath = path.join(__dirname, '..', '..', 'build')
    const doesBuildExist = await fs.access(buildPath).then(() => true).catch(() => false)

    if (!doesBuildExist) {
      console.error(chalk.red('App build not found.'))
      throw new Error('App build not found.')
    }

    await setupDevServer({
      command: 'npm run servebuild',
      launchTimeout: 300000,
      debug: true,
      port: 3000
    })

    const browser = await puppeteer.launch({
      headless: true,
    })

    this.global.browser = browser

    await browser.defaultBrowserContext().overridePermissions('http://localhost:3000/', ['clipboard-read', 'clipboard-write'])

    this.global.page = await this.global.browser.newPage()

    await this.global.page.goto('http://localhost:3000/', { waitUntil: 'load' })

    await this.global.page.exposeFunction('delay', delay)

    this.global.page.on('dialog', async dialog => {
      await dialog.accept()
    })
  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment.'))
    await this.global.browser.close()
    await teardownDevServer()
    await super.teardown()
  }
}

module.exports = PuppeteerEnvironment
