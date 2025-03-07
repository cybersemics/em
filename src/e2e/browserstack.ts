import browserstack from 'browserstack-local'
import chalk from 'chalk'

/** Function to initialize a BrowserStackManager Object. */
function BrowserStackManager() {
  const bsLocal = new browserstack.Local()

  /** Starts the Browserstack Local instance. */
  const start = (key: string, localIdentifier: string) => {
    return new Promise<void>((resolve, reject) => {
      console.info(chalk.yellow('BrowserstackLocal: Starting'))
      bsLocal.start(
        {
          key: key,
          localIdentifier,
          verbose: true,
          force: true,
          forceLocal: true,
          logFile: 'browserstack.log',
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

  /** Stops the Browserstack Local instance. */
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

  return {
    start,
    stop,
  }
}

export default BrowserStackManager
