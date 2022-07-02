import { Page } from 'puppeteer'
import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection'
import asBrowserEnvironment from './asBrowserEnvironment'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = (page: Page) => getSelectionWebdriver(asBrowserEnvironment(page))

export default getSelection
