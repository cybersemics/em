// util
import { head, pathToContext } from '../util'

// selectors
import { exportContext } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Exports the navigable subtree of the given context.
 * @param context
 * @param format    text/html | text/plaintext
 */
export default (state, format = 'text/html', indent = 0) => {
  const { cursor } = state
  const context = pathToContext(cursor)
  const linePrefix = format === 'text/html' ? '<li>' : '- '
  const linePostfix = format === 'text/html' ? ((indent === 0 ? '  ' : '') + '</li>') : ''
  const tab0 = Array(indent).fill('').join('  ')
  const tab1 = tab0 + '  '
  const tab2 = tab1 + '  '
  const childrenPrefix = format === 'text/html' ? `\n${tab2}<ul>` : ''
  const childrenPostfix = format === 'text/html' ? `\n${tab2}</ul>\n` : ''
  const children = getThoughtsRanked(state, context)

  const exportedChildren = children.length > 0
    ? `${childrenPrefix}\n${children.map(child => '  ' + exportContext(context.concat(child.value), format, indent + (format === 'text/html' ? (indent === 0 ? 3 : 2) : 1))).join('\n')}${childrenPostfix}${indent === 0 ? tab0 : tab1}`
    : ''

  const text = `${tab0}${linePrefix}${head(context)}${exportedChildren ? (tab1) : ''}${exportedChildren}${linePostfix}`

  return indent === 0 && format === 'text/html'
    ? `<ul>\n  ${text}\n</ul>`
    : text
}
