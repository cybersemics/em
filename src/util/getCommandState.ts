import CommandState from '../@types/CommandState'
import FormattingCommand from '../@types/FormattingCommand'

const commands = Object.values(FormattingCommand)

/**
 * This is a utility for creating opening and closing markup tag.
 */
const createTag = (tag: string) => ({
  open: new RegExp(`^<${tag}[^>]*>`, 'i'),
  close: new RegExp(`^</${tag}>`, 'i'),
})

const tags = {
  bold: createTag('b'),
  italic: createTag('i'),
  underline: createTag('u'),
  strikethrough: createTag('strike'),
  code: createTag('code'),
  foreColor: createTag('span'),
  backColor: createTag('span'),
}

/** Extracts the foreground and background colors from the given string.
 * Returns an object with foreColor and backColor properties.
 * If the string does not contain a font or span tag, undefined is returned.
 */
const extractColors = (savedValue: string) => {
  const foreColorRegex = /<font[^>]*\scolor=["']?([^"']+)["']?[^>]*>/i
  const backColorRegex = /<span[^>]*\sstyle=["'][^"']*background-color:\s*([^;"']+)/i

  // Attempt to extract the font color
  const foreColorMatch = savedValue.match(foreColorRegex)
  const foreColor = foreColorMatch ? foreColorMatch[1].trim() : undefined

  // Attempt to extract the background-color from span
  const backColorMatch = savedValue.match(backColorRegex)
  const backColor = backColorMatch ? backColorMatch[1].trim() : undefined

  return { foreColor, backColor }
}

/**
 * This determines which commands (bold, italic, underline, strikethrough)
 * apply to an entire thought string.
 */
const getCommandState = (value: string): CommandState => {
  // Special case to return early for empty values, treated as having no commands applied
  if (value.length === 0) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
      foreColor: undefined,
      backColor: undefined,
    }
  }
  // Tracks which commands have applied to the entire value so far
  const matches: CommandState = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    foreColor: undefined,
    backColor: undefined,
  }
  // Tracks which commands are currently applied while walking through the value
  const currentCommandState: CommandState = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  }
  // Tracks whether a command was ever applied in the input
  const commandEverApplied: Record<string, boolean> = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  }
  // Walk through the value until the end is reached, checking for markup tag
  const savedValue = value
  while (value.length > 0) {
    let foundTag = false
    for (const command of commands) {
      // Check for an opening tag and parse it
      if (!currentCommandState[command] && tags[command].open.test(value)) {
        foundTag = true
        currentCommandState[command] = true
        commandEverApplied[command] = true
        const match = value.match(tags[command].open)
        value = value.substring(match?.[0].length ?? 1)
        continue
      }
      // Check for a closing tag and parse it
      if (currentCommandState[command] && tags[command].close.test(value)) {
        foundTag = true
        currentCommandState[command] = false
        const match = value.match(tags[command].close)
        value = value.substring(match?.[0].length ?? 1)
        continue
      }
    }
    // Check for more tags, to avoid parsing a subsequent character as a non-tag character
    if (foundTag) {
      continue
    }
    // Handle all of the subsequent non-tag characters
    const nonTagCharacters = value.match(/^[^<]+/)
    // Default to parsing a single `<` character if it has been determined to be a non-tag character
    const length = nonTagCharacters?.[0].length ?? 1
    value = value.substring(length)
    // If any command is not applied during text, set matches[command] to false
    for (const command of commands) {
      if (!currentCommandState[command]) {
        matches[command] = false
      }
    }
  }
  // After processing, set matches[command] to false if command was never applied
  for (const command of commands) {
    if (!commandEverApplied[command]) {
      matches[command] = false
    }
  }
  if (savedValue.length > 0) {
    const colors = extractColors(savedValue)
    matches.foreColor = colors.foreColor
    matches.backColor = colors.backColor
  }
  return matches
}

export default getCommandState
