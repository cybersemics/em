import { Page } from 'puppeteer'
import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection'
import asBrowserEnvironment from './asBrowserEnvironment'

declare module global {
  const page: Page
}

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = () => getSelectionWebdriver(asBrowserEnvironment())

export default getSelection
