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
const browserstack = require('browserstack-local')

const config = require('./config/webdriverio.config')

/** Webdriverio Environment for jest. */
class WebdriverIOEnvironment extends JsDomEnvironment {
  bsLocal

  constructor(config) {
    super(config)
  }

  handleTestEvent(event, state) {
    if (event.name === 'test_fn_failure') {
      this.global.browser.executeScript(
        'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Failed"}}',
      )
    }
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
        port: 3000,
      })
    }
    try {
      await this.startBrowserStackLocal()
      // Note: this.global is not global to all test suites; it is sandboxed to a single test module, e.g. caret.ts
      this.global.browser = await wdio.remote(config)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async teardown() {
    console.info(chalk.yellow('Teardown Test Environment for webdriverio.'))
    await this.stopBrowserStackLocal()
    if (this.global.browser) {
      await this.global.browser.deleteSession()
    } else {
      console.warn('this.global.browser is undefined in teardown')
    }
    await teardownDevServer()
    await super.teardown()
  }

  startBrowserStackLocal() {
    if (
      !config.capabilities['browserstack.localIdentifier'] ||
      !config.capabilities['browserstack.localIdentifier'].startsWith('local')
    ) {
      return
    }

    return new Promise((resolve, reject) => {
      console.info(chalk.yellow('BrowserstackLocal: Starting'))
      this.bsLocal = new browserstack.Local()
      this.bsLocal.start(
        {
          localIdentifier: config.capabilities['browserstack.localIdentifier'],
        },
        e => {
          if (e) {
            reject(e)
          } else {
            console.info(chalk.green('BrowserStackLocal: Running'))
            resolve()
          }
        },
      )
    })
  }

  async stopBrowserStackLocal() {
    if (!this.bsLocal || !this.bsLocal.isRunning()) {
      return
    }

    return new Promise(resolve => {
      this.bsLocal.stop(() => {
        console.info(chalk.gray('BrowserStackLocal: Stop'))
        resolve()
      })
    })
  }
}

module.exports = WebdriverIOEnvironment
