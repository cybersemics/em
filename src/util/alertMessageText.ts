import type { AlertPart } from '../@types/Alert'
import toVisibleText from './toVisibleText'

/** Joins the pieces of an alert message into the plain text that AlertMessage renders. Thought values are converted to visible text (see toVisibleText). */
const alertMessageText = (parts: AlertPart[]): string =>
  parts.map(part => (typeof part === 'string' ? part : toVisibleText(part.thought))).join('')

export default alertMessageText
