import { Browser } from 'webdriverio'
import asBrowserEnvironment from './asBrowserEnvironment'
import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = (browser: Browser<'async'>) => getSelectionWebdriver(asBrowserEnvironment(browser))

export default getSelection
