import { convertHTMLtoJSON } from './convertHTMLtoJSON'
import { ImportJSONOptions, importJSON } from './importJSON'
import { State } from './initialState'
import { SimplePath } from '../types'

/**
 * Parses HTML and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 *
 * @param options.lastUpdated Instead of importing the root into the importCursor, skip it and import all its children.
 * @param options.skipRoot Instead of importing the root into the importCursor, skip it and import all its children.
 */
export const importHtml = (state: State, simplePath: SimplePath, html: string, options: ImportJSONOptions = {}) => {
  const thoughtsJSON = convertHTMLtoJSON(html)
  return importJSON(state, simplePath, thoughtsJSON, options)
}
