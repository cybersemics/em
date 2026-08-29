import { escape as escapeHtml, unescape as unescapeHtml } from 'html-escaper'
import strip from './strip'

/** HTML tags that should be stripped while preserving their child text. */
const STRIP_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'font',
  'i',
  'li',
  'mark',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'u',
])

/** Matches HTML-like tags. */
const REGEX_TAG = /<\/?([a-z][\w-]*)([^>]*)>/gi

/** Collapses serialized empty tags like <aaa></aaa> to <aaa>. */
const REGEX_EMPTY_TAG_PAIR = /<([a-z][\w-]*)([^>]*)><\/\1>/gi

/** Removes empty quoted attributes like two="" to recover user-entered "<one two>" text. */
const REGEX_EMPTY_QUOTED_ATTR = /\s([^\s=]+)=""/g

/** Escapes non-formatting tags so strip does not treat them as markup. */
const preserveUnknownTags = (value: string) =>
  value.replace(REGEX_TAG, (match, tagName) => (STRIP_TAGS.has(tagName.toLowerCase()) ? match : escapeHtml(match)))

/** Converts thought html into human-visible text for alerts and breadcrumbs. */
const toVisibleText = (value: string) => {
  if (!value) return ''
  const stripped = strip(preserveUnknownTags(value))
  return unescapeHtml(stripped).replace(REGEX_EMPTY_TAG_PAIR, '<$1$2>').replace(REGEX_EMPTY_QUOTED_ATTR, ' $1')
}

export default toVisibleText
