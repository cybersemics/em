/* eslint-disable fp/no-class */
/* eslint-disable no-useless-constructor */
/* eslint-disable no-console */

const JsDomEnvironment = require('jest-environment-jsdom')
const portUsed = require('tcp-port-used')
const chalk = require('chalk')
const wdio = require('webdriverio')
const browserstack = require('browserstack-local')

const config = require('./config/webdriverio.config')

/** Webdriverio Environment for jest. */
class WebdriverIOEnvironment extends JsDomEnvironment {
  constructor(config) {
    super(config)
  }

  handleTestEvent(event, state) {
    if (event.name === 'test_fn_failure') {
      this.global.browser.executeScript(
        'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Failed"}}',
      )
    }

    if (event.name === 'test_fn_start') {
      this.global.browser.executeScript(
        `browserstack_executor: {"action": "setSessionName", "arguments": {"name": "${event.test.name}"}}`,
      )
    }
  }

  async setup() {
    console.info(chalk.yellow('Setup Test Environment for webdriverio.'))
    await super.setup()

    if (await portUsed.check(3000, 'localhost')) {
      console.info(chalk.yellow('Using the currently running app on http://localhost:3000'))
    } else {
      throw new Error('No running application found on port 3000')
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
