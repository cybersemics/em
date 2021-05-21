/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const chalk = require('chalk')
const JsDomEnvironment = require('jest-environment-jsdom')
const { setup: setupDevServer, teardown: teardownDevServer } = require('jest-dev-server')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const portUsed = require('tcp-port-used')

/** Puppeteer Environment for jest. */
class PuppeteerEnvironment extends JsDomEnvironment {
  browser;
  constructor(config) {
    super(config)
  }

  async setup() {
    console.info(chalk.yellow('Setup Test Environment.'))

    await super.setup()

    // use existing app if already running
    if (await portUsed.check(3000, 'localhost')) {
      console.info(chalk.yellow('Using the currently running app on http://localhost:3000'))
    }
    // otherwise serve up the build folder
    else {
      const buildPath = path.join(__dirname, '..', '..', 'build')
      const doesBuildExist = fs.existsSync(buildPath)

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
    }

    this.global.browser = await puppeteer.launch({
      headless: true,
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
