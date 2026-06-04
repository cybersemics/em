import { FrameWaitForFunctionOptions } from 'puppeteer'
import { page } from '../setup'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(f: () => R, options: FrameWaitForFunctionOptions & { timeoutMsg?: string } = {}) => {
  const { timeoutMsg, ...waitOptions } = options
  return page.waitForFunction(f, waitOptions).catch((e: Error) => {
    if (timeoutMsg) throw new Error(timeoutMsg, { cause: e })
    throw e
  })
}

export default waitUntil
