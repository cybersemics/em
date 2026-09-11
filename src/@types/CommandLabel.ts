import * as commands from '../commands/index'

type Labels = (typeof commands)[keyof typeof commands]['label']

/**
 * The label of any command, e.g. 'Bold' or 'Sort Picker'. Derived from the commands themselves rather than listed here, so it cannot fall out of date.
 *
 * This only works as long as every command label keeps its literal type, which is why commands are declared with `satisfies Command` and their labels `as const` (see commands.md). A command that skips either one widens its label to string and collapses the whole union, which would otherwise silently turn every CommandLabel annotation back into a plain string. Resolving to the message below instead makes that failure loud: every call site that passes a label reports it, and the diagnostic names the fix.
 */
type CommandLabel = string extends Labels
  ? 'a command label widened to string: declare the command with `satisfies Command` and its label `as const`'
  : Labels

export default CommandLabel
