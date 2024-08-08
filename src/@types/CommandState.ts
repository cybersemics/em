export enum Command {
  bold = 'bold',
  italic = 'italic',
  underline = 'underline',
  strikethrough = 'strikethrough',
}

export const commands = Object.values(Command)

/** The set of commands applied to text (bold, italic, underline, strikethrough). */
type CommandState = Record<Command, boolean>

export default CommandState
