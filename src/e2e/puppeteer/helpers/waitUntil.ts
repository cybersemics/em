import { fetchPage } from './setup'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(f: () => R) => fetchPage().waitForFunction(f)

export default waitUntil
