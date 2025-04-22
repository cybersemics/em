import { Browser } from 'webdriverio'
import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection'
import asBrowserEnvironment from './asBrowserEnvironment'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = (browser: Browser) => getSelectionWebdriver(asBrowserEnvironment(browser))

export default getSelection
