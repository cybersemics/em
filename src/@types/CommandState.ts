import FormattingCommand from './FormattingCommand'

/** The set of commands applied to text (bold, italic, underline, strikethrough). */
type CommandState = Record<FormattingCommand, boolean | string | undefined>

export default CommandState
