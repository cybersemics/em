import { Browser } from 'webdriverio'

/** Execute a function in browser context. */
const execute = (browser: Browser<any>, func: (...args: any) => any, ...args: any[]) => {
  // https://github.com/webdriverio/webdriverio/issues/6206
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return browser.execute(func, ...args)
}

export default execute
