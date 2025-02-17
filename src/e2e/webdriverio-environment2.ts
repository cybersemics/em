import { type Environment, builtinEnvironments, populateGlobal } from 'vitest/environments'
import chalk from 'chalk'
import { Browser } from "webdriverio"
import portUsed from 'tcp-port-used'
import wdio from "webdriverio"
import { nanoid } from 'nanoid'
import config from './config/webdriverio.config2'
import browserstack from 'browserstack-local'

function BrowserStackManager() {
  const localIdentifier = 'local-' + nanoid()
  const wdioConfig = config(localIdentifier)
  const bsLocal = new browserstack.Local();

  const start = () => { 
    return new Promise<void>((resolve, reject) => {
      console.info(chalk.yellow('BrowserstackLocal: Starting'))
      bsLocal.start(
        {
          key: wdioConfig.key,
          localIdentifier,
          verbose: true,
          force: true,
          forceLocal: true,
          logFile: 'browserstack.log'
        },
        e => {
          console.log(bsLocal.isRunning());
          if (e) {
            reject(e)
          } else {
            console.info(chalk.green('BrowserStackLocal: Running'))
            resolve()
          }
        },
      )
    });
  }

  const stop = () => {
    if (!bsLocal || !bsLocal.isRunning()) {
      return
    }

    return new Promise<void>(resolve => {
      bsLocal.stop(() => {
        console.info(chalk.gray('BrowserStackLocal: Stop'))
        resolve()
      })
    })
  }

  const browser = async () => wdio.remote(wdioConfig)

  return {
    browser,
    start,
    stop
  }
}

let globalBrowser: Browser<'async'> | null = null;

export default <Environment>{
  name: 'ios',
  transformMode: 'web',
  async setup(global, options) {
    builtinEnvironments['happy-dom'].setup(global, options)

    // custom setup
    console.info(chalk.yellow('Setup Test Environment for webdriverio.'))

    if (await portUsed.check(3000, 'localhost')) {
      console.info(chalk.yellow('Using the currently running app on http://localhost:3000'))
    } else {
      throw new Error('No running application found on port 3000')
    }

    const bsManager = BrowserStackManager()
    await bsManager.start()
    const browser = await bsManager.browser()

    const { Window, GlobalWindow } = await import('happy-dom')
    const win = new (GlobalWindow || Window)()

    const { keys, originals } = populateGlobal(global, {
      ...win,
      browser,
    })

    try {
      // Note: this.global is not global to all test suites; it is sandboxed to a single test module, e.g. caret.ts
      globalBrowser = browser
    } catch (e) {
      console.error(e)
      throw e
    }

    return {
      async teardown() {
        console.info(chalk.yellow('Teardown Test Environment for webdriverio.'))
        await bsManager.stop()
        
        keys.forEach(key => delete global[key])
        originals.forEach((v, k) => (global[k] = v))

        if (globalBrowser) {
          await globalBrowser.deleteSession()
        } else {
          console.warn('globalBrowser is undefined in teardown')
        }
      }
    }
  }
}
