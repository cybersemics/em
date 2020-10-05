import { Path } from '../types'
import { State } from './initialState'
import { convertHTMLtoJSON } from './convertHTMLtoJSON'
import { importJSON } from './importJSON'

interface ImportHtmlOptions {
  skipRoot? : boolean,
}

/**
 * Parses HTML and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 *
 * @param skipRoot Instead of importing the root into the importCursor, skip it and import all its children.
 */
export const importHtml = (state: State, thoughtsRanked: Path, html: string, { skipRoot }: ImportHtmlOptions = { skipRoot: false }) => {
  const thoughtsJSON = convertHTMLtoJSON(html)
  return importJSON(state, thoughtsRanked, thoughtsJSON, { skipRoot })
}
