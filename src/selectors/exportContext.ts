import { attribute, getChildrenRanked } from '../selectors'
import { head, isFunction, unroot } from '../util'
import { Context, MimeType, Parent, State } from '../@types'
import { REGEXP_TAGS } from '../constants'
import { and } from 'fp-and-or'

/** Replaces the root value with a given title. */
const replaceTitle = (text: string, title: string, format: MimeType) => {
  const startText = '<ul>\n  <li>'
  return format === 'text/html'
    ? `<ul>\n  <li>${title}${text.slice(startText.length + 1)}`
    : format === 'text/plain'
    ? `- ${title}${text.slice(text.indexOf('\n'))}`
    : text
}

interface Options {
  indent?: number
  title?: string
  excludeSrc?: boolean
  excludeMeta?: boolean
  depth?: number
  excludeArchived?: boolean
}

/** Exports the navigable subtree of the given context.
 *
 * @param context
 * @param format
 * @param title     Replace the value of the root thought with a new title.
 */
export const exportContext = (
  state: State,
  context: Context,
  format: MimeType = 'text/html',
  { indent = 0, title, excludeSrc, excludeMeta, depth = 0, excludeArchived }: Options = {},
): string => {
  const linePostfix = format === 'text/html' ? (indent === 0 ? '  ' : '') + '</li>' : ''
  const tab0 = Array(indent).fill('').join('  ')
  const tab1 = tab0 + '  '
  const tab2 = tab1 + '  '
  const childrenPrefix = format === 'text/html' ? `\n${tab2}<ul>` : ''
  const childrenPostfix = format === 'text/html' ? `\n${tab2}</ul>\n` : ''
  const children = getChildrenRanked(state, context)
  const isNoteAndMetaExcluded = excludeMeta && head(context) === '=note'

  const childrenFiltered = children.filter(
    and(
      excludeSrc && attribute(state, context, '=src') ? (child: Parent) => isFunction(child.value) : true,
      !excludeMeta && excludeArchived ? (child: Parent) => child.value !== '=archive' : true,
      excludeMeta ? (child: Parent) => !isFunction(child.value) || child.value === '=note' : true,
    ),
  )

  // Note: export single thought without bullet
  const linePrefix = format === 'text/html' ? '<li>' : depth === 0 && childrenFiltered.length === 0 ? '' : '- '

  /** Outputs an exported child. */
  const exportChild = (child: Parent) =>
    (isNoteAndMetaExcluded ? '' : '  ') +
    exportContext(state, unroot(context.concat(child.value)) as Context, format, {
      excludeSrc,
      excludeMeta,
      excludeArchived,
      indent: indent + (isNoteAndMetaExcluded ? 0 : format === 'text/html' ? (indent === 0 ? 3 : 2) : 1),
      depth: depth + 1,
    })

  // Export children of note as a thought when not lossless selected
  if (isNoteAndMetaExcluded) {
    return childrenFiltered.map(exportChild).join('\n')
  }

  const exportedChildren =
    childrenFiltered.length > 0
      ? `${childrenPrefix}\n${childrenFiltered.map(exportChild).join('\n')}${childrenPostfix}${
          format === 'text/html' ? (indent === 0 ? tab0 : tab1) : ''
        }`
      : ''

  // Handle newlines in thoughts.
  // This should never happen (newlines are converted to separate thoughts on import) but guard against newlines just in case.
  // Otherwise re-importing is disastrous (additional lines of text in a thought are moved to the root).
  const lines = head(context).split('\n')
  const firstLine = `${tab0}${linePrefix}${lines[0]}`
  const otherLines = lines
    .slice(1)
    .map(line => `\n${tab1}${linePrefix}${line}`)
    .join('')
  const textWithChildren = `${firstLine}${otherLines}${
    exportedChildren && format === 'text/html' ? tab1 : ''
  }${exportedChildren}${linePostfix}`

  const textFinal = format === 'text/plain' ? textWithChildren.replace(REGEXP_TAGS, '') : textWithChildren

  const output = indent === 0 && format === 'text/html' ? `<ul>\n  ${textFinal}\n</ul>` : textFinal

  /** Replaces the title of the output. */
  const outputReplaceTitle = (output: string) => (title ? replaceTitle(output, title, format) : output)

  return outputReplaceTitle(output)
}

export default exportContext
