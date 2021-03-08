import { attribute, getChildrenRanked } from '../selectors'
import { head, isFunction, unroot } from '../util'
import { Child, Context, MimeType } from '../types'
import { State } from '../util/initialState'
import { and } from 'fp-and-or'

/** Replaces the root value with a given title. */
const replaceTitle = (text: string, title: string, format: MimeType) => {
  const startText = '<ul>\n  <li>'
  return format === 'text/html' ? `<ul>\n  <li>${title}${text.slice(startText.length + 1)}`
    : format === 'text/plain' ? `- ${title}${text.slice(text.indexOf('\n'))}`
    : text
}

interface Options {
  indent?: number,
  title?: string,
  excludeSrc?: boolean,
  excludeMeta?: boolean,
}

/** Exports the navigable subtree of the given context.
 *
 * @param context
 * @param format
 * @param title     Replace the value of the root thought with a new title.
 */
export const exportContext = (state: State, context: Context, format: MimeType = 'text/html', { indent = 0, title, excludeSrc, excludeMeta }: Options = {}): string => {
  const linePrefix = format === 'text/html' ? '<li>' : '- '
  const linePostfix = format === 'text/html' ? (indent === 0 ? '  ' : '') + '</li>' : ''
  const tab0 = Array(indent).fill('').join('  ')
  const tab1 = tab0 + '  '
  const tab2 = tab1 + '  '
  const childrenPrefix = format === 'text/html' ? `\n${tab2}<ul>` : ''
  const childrenPostfix = format === 'text/html' ? `\n${tab2}</ul>\n` : ''
  const children = getChildrenRanked(state, context)

  const childrenFiltered = children.filter(and(
    excludeSrc && attribute(state, context, '=src') ? (child: Child) => isFunction(child.value) : true,
    excludeMeta ? (child: Child) => !isFunction(child.value) : true
  ))

  /** Outputs an exported child. */
  const exportChild = (child: Child) => '  ' + exportContext(
    state,
    unroot(context.concat(child.value)) as Context,
    format,
    {
      excludeSrc,
      excludeMeta,
      indent: indent + (format === 'text/html' ? indent === 0 ? 3 : 2 : 1),
    }
  )

  const exportedChildren = childrenFiltered.length > 0
    ? `${childrenPrefix}\n${childrenFiltered.map(exportChild).join('\n')}${childrenPostfix}${format === 'text/html' ? indent === 0 ? tab0 : tab1 : ''}`
    : ''

  const text = `${tab0}${linePrefix}${head(context)}${exportedChildren && format === 'text/html' ? tab1 : ''}${exportedChildren}${linePostfix}`

  const output = indent === 0 && format === 'text/html'
    ? `<ul>\n  ${text}\n</ul>`
    : text

  /** Replaces the title of the output. */
  const outputReplaceTitle = (output: string) => title
    ? replaceTitle(output, title, format)
    : output

  return outputReplaceTitle(output)
}

export default exportContext
