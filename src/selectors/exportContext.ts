import { unescape as decodeCharacterEntities } from 'lodash'
import Context from '../@types/Context'
import MimeType from '../@types/MimeType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { REGEX_TAGS } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'
import thoughtToContext from '../selectors/thoughtToContext'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'

/** Replaces the root value with a given title. */
const replaceTitle = (text: string, title: string, format: MimeType) => {
  const startText = '<ul>\n  <li>'
  return format === 'text/html'
    ? `<ul>\n  <li>${title}${text.slice(startText.length + 1)}`
    : format === 'text/plain'
      ? `- ${title}${text.slice(text.indexOf('\n'))}`
      : text
}

/** Convert formatting HTML tags to markdown asterisks. */
const formattingTagsToMarkdown = (s: string) => s.replace(/(<\/?(b|strong)>)/gi, '**').replace(/(<\/?(i|em)>)/gi, '*')

/** Creates a filter predicate that filters thoughts by various export options. */
export const exportFilter =
  ({ excludeArchived, excludeMeta }: { excludeArchived?: boolean; excludeMeta?: boolean }) =>
  (child: Thought) =>
    child.value === '=archive' ? !excludeArchived : !excludeMeta || !isAttribute(child.value) || child.value === '=note'

interface Options {
  indent?: number
  /** Replaces the value of the root thought with a new title. */
  title?: string
  excludeMarkdownFormatting?: boolean
  excludeSrc?: boolean
  /** Exclude meta attributes, except archived thoughts unless excludeArchived is true. */
  excludeMeta?: boolean
  depth?: number
  /** Exclude archived thoughts. */
  excludeArchived?: boolean
}

/** Exports the navigable subtree of the given context. */
export const exportContext = (
  state: State,
  contextOrThoughtId: Context | ThoughtId,
  format: MimeType = 'text/html',
  { indent = 0, title, excludeMarkdownFormatting, excludeMeta, excludeSrc, depth = 0, excludeArchived }: Options = {},
): string => {
  const linePostfix = format === 'text/html' ? (indent === 0 ? '  ' : '') + '</li>' : ''
  const tab0 = Array(indent).fill('').join('  ')
  const tab1 = tab0 + '  '
  const tab2 = tab1 + '  '
  const childrenPrefix = format === 'text/html' ? `\n${tab2}<ul>` : ''
  const childrenPostfix = format === 'text/html' ? `\n${tab2}</ul>\n` : ''
  const thoughtId =
    typeof contextOrThoughtId === 'string' ? contextOrThoughtId : contextToThoughtId(state, contextOrThoughtId)
  const children = thoughtId ? getChildrenRanked(state, thoughtId) : []
  const context = Array.isArray(contextOrThoughtId) ? contextOrThoughtId : thoughtToContext(state, thoughtId!)
  const isNoteAndMetaExcluded = excludeMeta && head(context) === '=note'

  const childrenFiltered = children.filter(exportFilter({ excludeArchived, excludeMeta }))

  // Note: export single thought without bullet
  const linePrefix =
    format === 'text/html' ? '<li>' : depth === 0 && childrenFiltered.length === 0 && !isRoot(context) ? '' : '- '

  /** Outputs an exported child. */
  const exportChild = (child: Thought) =>
    (isNoteAndMetaExcluded ? '' : '  ') +
    exportContext(state, child.id, format, {
      excludeSrc,
      excludeMeta,
      excludeArchived,
      excludeMarkdownFormatting,
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

  // Get the thought under process
  // If it is root, then do not convert it to markdown
  const currentThought = head(context)
  const value =
    format === 'text/html'
      ? currentThought
      : (excludeMarkdownFormatting
          ? currentThought
          : formattingTagsToMarkdown(decodeCharacterEntities(currentThought))
        ).replace(REGEX_TAGS, '')

  // Handle newlines in thoughts.
  // This should never happen (newlines are converted to separate thoughts on import) but guard against newlines just in case.
  // Otherwise re-importing is disastrous (additional lines of text in a thought are moved to the root).
  const lines = value.split('\n')
  const firstLine = `${tab0}${linePrefix}${lines[0]}`
  const otherLines = lines
    .slice(1)
    .map(line => `\n${tab1}${linePrefix}${line}`)
    .join('')
  const textWithChildren = `${firstLine}${otherLines}${
    exportedChildren && format === 'text/html' ? tab1 : ''
  }${exportedChildren}${linePostfix}`

  const output = indent === 0 && format === 'text/html' ? `<ul>\n  ${textWithChildren}\n</ul>` : textWithChildren

  /** Replaces the title of the output. */
  const outputReplaceTitle = (output: string) => (title ? replaceTitle(output, title, format) : output)

  return outputReplaceTitle(output)
}

export default exportContext
