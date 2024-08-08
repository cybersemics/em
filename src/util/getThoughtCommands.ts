import CommandState, { commands } from '../@types/CommandState'

/**
 * This is a utility for creating opening and closing markup tag.
 */
const createTag = (tags: string) => ({
  open: `<${tags}>`,
  close: `</${tags}>`,
})

const tags = {
  bold: createTag('b'),
  italic: createTag('i'),
  underline: createTag('u'),
  strikethrough: createTag('strike'),
}

/**
 * This determines which commands (bold, italic, underline, strikethrough)
 * apply to an entire thought string.
 */
const getThoughtCommands = (thought: string): CommandState => {
  // Special case to return early for empty thoughts, treated as having no commands applied
  if (thought.length === 0) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    }
  }
  // Tracks which commands have applied to the entire thought so far
  const matches: CommandState = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
  }
  // Tracks which commands apply at the cursor while walking through the thought
  const cursor: CommandState = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  }
  // Walk through the thought until the end is reached, checking for markup tag
  while (thought.length > 0) {
    let foundTag = false
    for (const command of commands) {
      // Check for an opening tag and parse it
      if (!cursor[command] && thought.startsWith(tags[command].open)) {
        foundTag = true
        cursor[command] = true
        thought = thought.substring(tags[command].open.length)
        continue
      }
      // Check for a closing tag and parse it
      if (cursor[command] && thought.startsWith(tags[command].close)) {
        foundTag = true
        cursor[command] = false
        thought = thought.substring(tags[command].close.length)
        continue
      }
    }
    // Check for more tags, to avoid parsing a subsequent character as a non-tag character
    if (foundTag) {
      continue
    }
    // Handle the next non-tag character
    thought = thought.substring(1)
    for (const command of commands) {
      // The thought does not fully match the command if the character does not
      matches[command] &&= cursor[command]
    }
  }
  return matches
}

export default getThoughtCommands
