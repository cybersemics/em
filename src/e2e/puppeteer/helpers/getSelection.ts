import { Page } from 'puppeteer'
import asBrowserEnvironment from './asBrowserEnvironment'
import getSelectionWebdriver from '../../iOS/helpers/getSelection'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = (page: Page) => getSelectionWebdriver(asBrowserEnvironment(page))

export default getSelection
