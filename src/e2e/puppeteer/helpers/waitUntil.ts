import { FrameWaitForFunctionOptions } from 'puppeteer'
import { page } from '../session'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(f: () => R, options: FrameWaitForFunctionOptions = {}) => page.waitForFunction(f, options)

export default waitUntil
