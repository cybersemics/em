import CommandState from '../@types/CommandState'
import FormattingCommand from '../@types/FormattingCommand'

const commands = Object.values(FormattingCommand)

/**
 * This is a utility for creating opening and closing markup tag.
 */
const createTag = (tag: string) => ({
  open: `<${tag}>`,
  close: `</${tag}>`,
})

const tags = {
  bold: createTag('b'),
  italic: createTag('i'),
  underline: createTag('u'),
  strikethrough: createTag('strike'),
  foreColor: createTag('font'),
  backColor: createTag('span'),
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
      foreColor: 'rgb(227, 227, 227)',
      backColor: 'rgb(0, 0, 0)',
    }
  }
  // Tracks which commands have applied to the entire value so far
  const matches: CommandState = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    foreColor: 'rgb(227, 227, 227)',
    backColor: 'rgb(0, 0, 0)',
  }
  // Tracks which commands are currently applied while walking through the value
  const currentCommandState: CommandState = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    foreColor: 'rgb(227, 227, 227)',
    backColor: 'rgb(0, 0, 0)',
  }
  // Walk through the value until the end is reached, checking for markup tag
  const savedValue = value

  while (value.length > 0) {
    let foundTag = false
    for (const command of commands) {
      // Check for an opening tag and parse it
      if (!currentCommandState[command] && value.startsWith(tags[command].open)) {
        foundTag = true
        currentCommandState[command] = true
        value = value.substring(tags[command].open.length)
        continue
      }
      // Check for a closing tag and parse it
      if (currentCommandState[command] && value.startsWith(tags[command].close)) {
        foundTag = true
        currentCommandState[command] = false
        value = value.substring(tags[command].close.length)
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
    for (const command of commands) {
      // The value does not fully match the command if the character does not
      matches[command] &&= currentCommandState[command]
    }
  }
  if (savedValue.length > 0) {
    const parser = new DOMParser() // new DomParser
    const doc = parser.parseFromString(savedValue, 'text/html')
    const foreColor = doc.getElementsByTagName('font')[0]?.getAttribute('color')
    const backColor = doc
      .getElementsByTagName('span')[0]
      ?.getAttribute('style')
      ?.match(/background-color: (.*)/)?.[1]
    for (const command of commands) {
      // The value does not fully match the command if the character does not

      if (command === 'foreColor') {
        matches[command] = foreColor ?? 'rgb(227, 227, 227)'
      }
      if (command === 'backColor') {
        matches[command] = backColor ?? 'rgb(0, 0, 0)'
      }
    }
  }
  return matches
}

export default getCommandState
