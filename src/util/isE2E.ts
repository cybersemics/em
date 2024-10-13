/**
 * Returns true if we're in the e2e tests.
 * @returns Boolean.
 */
const isE2E = () => !!navigator.webdriver

export default isE2E
