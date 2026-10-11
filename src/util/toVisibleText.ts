import { unescape as unescapeHtml } from 'html-escaper'
import strip from './strip'

/** Converts a thought value, which is html, into the text a user sees when it is rendered. Tags are removed and character entities are decoded, so a thought that displays as <aaa> is stored as &lt;aaa&gt; and converts back to <aaa>. The result is plain text and must be rendered as text, not as html. */
const toVisibleText = (html: string | undefined): string => (html ? unescapeHtml(strip(html)) : '')

export default toVisibleText
