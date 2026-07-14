import getCommandState from './getCommandState'

export interface ClearThoughtPlaceholderFormat {
  backColor?: string
  bold?: true
  code?: true
  foreColor?: string
  italic?: true
  strikethrough?: true
  underline?: true
}

/** Gets the whole-value formatting that should be reflected by a cleared thought's placeholder. */
const clearThoughtPlaceholderFormat = (value: string): ClearThoughtPlaceholderFormat | null => {
  const commandState = getCommandState(value)
  const format: ClearThoughtPlaceholderFormat = {}

  if (commandState.bold) {
    format.bold = true
  }

  if (commandState.italic) {
    format.italic = true
  }

  if (commandState.underline) {
    format.underline = true
  }

  if (commandState.strikethrough) {
    format.strikethrough = true
  }

  if (commandState.code) {
    format.code = true
  }

  if (typeof commandState.foreColor === 'string') {
    format.foreColor = commandState.foreColor
  }

  if (typeof commandState.backColor === 'string') {
    format.backColor = commandState.backColor
  }

  return Object.keys(format).length > 0 ? format : null
}

export default clearThoughtPlaceholderFormat
