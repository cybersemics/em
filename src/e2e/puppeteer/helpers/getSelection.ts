import getSelectionWebdriver from '../../browserEnvironment/helpers/getSelection'
import asBrowserEnvironment from './asBrowserEnvironment'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = () => getSelectionWebdriver(asBrowserEnvironment())

export default getSelection
