import { store } from '../store'

import {
  getThoughtsRanked,
  head,
  unroot,
} from '../util'

/** Replaces the root value with a given title. */
const replaceTitle = (text, title, format) => {
  const startText = '<ul>\n  <li>'
  return format === 'text/html' ? `<ul>\n  <li>${title}${text.slice(startText.length + 1)}`
    : format === 'text/plain' ? `- ${title}${text.slice(text.indexOf('\n'))}`
    : text
}

/** Exports the navigable subtree of the given context.
 * @param context
 * @param format {string} text/html | text/plaintext
 * @param title {string} replace the value of the root thought with a new title
 */
export const exportContext = (context, format = 'text/html', { indent = 0, state, title } = {}) => {
  state = state || store.getState()
  const linePrefix = format === 'text/html' ? '<li>' : '- '
  const linePostfix = format === 'text/html' ? ((indent === 0 ? '  ' : '') + '</li>') : ''
  const tab0 = Array(indent).fill('').join('  ')
  const tab1 = tab0 + '  '
  const tab2 = tab1 + '  '
  const childrenPrefix = format === 'text/html' ? `\n${tab2}<ul>` : ''
  const childrenPostfix = format === 'text/html' ? `\n${tab2}</ul>\n` : ''
  const children = getThoughtsRanked(context, state.thoughtIndex, state.contextIndex)

  const exportChild = child => '  ' + exportContext(
    unroot(context.concat(child.value)),
    format,
    {
      indent: indent + (format === 'text/html' ? (indent === 0 ? 3 : 2) : 1),
      state
    }
  )

  const exportedChildren = children.length > 0
    ? `${childrenPrefix}\n${children.map(exportChild).join('\n')}${childrenPostfix}${format === 'text/html' ? indent === 0 ? tab0 : tab1 : ''}`
    : ''

  const text = `${tab0}${linePrefix}${head(context)}${exportedChildren && format === 'text/html' ? tab1 : ''}${exportedChildren}${linePostfix}`

  const output = indent === 0 && format === 'text/html'
    ? `<ul>\n  ${text}\n</ul>`
    : text

  const outputReplaceTitle = output => title
    ? replaceTitle(output, title, format)
    : output

  return outputReplaceTitle(output)
}
