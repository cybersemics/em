/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const chalk = require('chalk')
const JsDomEnvironment = require('jest-environment-jsdom')
const { setup: setupDevServer, teardown: teardownDevServer } = require('jest-dev-server')
const fs = require('fs/promises')
const path = require('path')
const BrowserInstance = require('./BrowserInstance.js')
/** */
class PuppeteerEnvironment extends JsDomEnvironment {
  browser;
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

    this.browser = await BrowserInstance
  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment.'))
    await this.browser.close()
    await teardownDevServer()
    await super.teardown()
  }
}

module.exports = PuppeteerEnvironment
