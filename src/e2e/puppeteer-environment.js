/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const chalk = require('chalk')
const JsDomEnvironment = require('jest-environment-jsdom')
const puppeteer = require('puppeteer')
const { setup: setupDevServer, teardown: teardownDevServer } = require('jest-dev-server')
const fs = require('fs/promises')
const path = require('path')

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

    this.global.browser = await puppeteer.launch({
      headless: true,
    })

    this.global.BASE_URL = 'http://localhost:3000'

    this.global.openNewPage = async url => {
      this.global.context = await this.global.browser.createIncognitoBrowserContext()
      this.global.page = await this.global.context.newPage()
      if (this.global.emulatedDevice) {
        await this.global.page.emulate(this.global.emulatedDevice)
        this.global.emulatedDevice = null
      }
      this.global.page.on('dialog', async dialog => {
        await dialog.accept()
      })
      await this.global.page.goto(url ?? this.global.BASE_URL)
    }

    this.global.closePage = async () => {
      await this.global.context.close()
    }

  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment.'))
    await this.global.browser.close()
    await teardownDevServer()
    await super.teardown()
  }
}

module.exports = PuppeteerEnvironment
