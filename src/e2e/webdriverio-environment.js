/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const JsDomEnvironment = require('jest-environment-jsdom')
const { setup: setupDevServer, teardown: teardownDevServer } = require('jest-dev-server')
const portUsed = require('tcp-port-used')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const wdio = require('webdriverio')

const config = require('./config/webdriverio.config')

/** Webdriverio Environment for jest. */
class WebdriverIOEnvironment extends JsDomEnvironment {

  constructor(config) {
    super(config)
  }

  async setup() {
    console.info(chalk.yellow('Setup Test Environment for webdriverio.'))
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
    try {
      this.global.browser = await wdio.remote(config)
    }
    catch (e) {
      console.error(e)
    }

  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment for webdriverio.'))
    await this.global.browser.deleteSession()
    await teardownDevServer()
    await super.teardown()
  }
}

module.exports = WebdriverIOEnvironment
