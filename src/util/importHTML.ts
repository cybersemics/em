import { Path } from '../types'
import { State } from './initialState'
import { convertHTMLtoJSON } from './convertHTMLtoJSON'
import { ImportJSONOptions, importJSON } from './importJSON'

/**
 * Parses HTML and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 *
 * @param options.lastUpdated Instead of importing the root into the importCursor, skip it and import all its children.
 * @param options.skipRoot Instead of importing the root into the importCursor, skip it and import all its children.
 */
export const importHtml = (state: State, thoughtsRanked: Path, html: string, options: ImportJSONOptions = {}) => {
  const thoughtsJSON = convertHTMLtoJSON(html)
  return importJSON(state, thoughtsRanked, thoughtsJSON, options)
}
