import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection.js'
import asBrowserEnvironment from './asBrowserEnvironment.js'

/**
 * Returns a proxy getSelection object with async getters for selection properties.
 * Uses the global browser object from WDIO.
 */
const getSelection = () => getSelectionWebdriver(asBrowserEnvironment())

export default getSelection
