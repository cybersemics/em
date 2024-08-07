import Commands from '../@types/Commands'

/**
 * This is a utility for creating opening and closing markup tags.
 */
const createTag = (tag: string) => ({
  open: `<${tag}>`,
  close: `</${tag}>`,
})

const tag = {
  bold: createTag('b'),
  italic: createTag('i'),
  underline: createTag('u'),
  strikethrough: createTag('strike'),
}

/**
 * This determines which commands (bold, italic, underline, strikethrough)
 * apply to an entire thought string.
 */
const getThoughtCommands = (thought: string): Commands => {
  // Special case to return early for empty thoughts, treated as having no commands applied
  if (thought.length === 0) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    }
  }
  // Boolean values to track which commands have applied to the entire thought so far
  let allBold = true
  let allItalic = true
  let allUnderline = true
  let allStrikethrough = true
  // Boolean values to track which commands apply at the cursor while walking through the thought
  let bold = false
  let italic = false
  let underline = false
  let strikethrough = false
  // Walk through the thought until the end is reached, checking for markup tags
  while (thought.length > 0) {
    if (!bold && thought.startsWith(tag.bold.open)) {
      bold = true
      thought = thought.substring(tag.bold.open.length)
    } else if (!italic && thought.startsWith(tag.italic.open)) {
      italic = true
      thought = thought.substring(tag.italic.open.length)
    } else if (!underline && thought.startsWith(tag.underline.open)) {
      underline = true
      thought = thought.substring(tag.underline.open.length)
    } else if (!strikethrough && thought.startsWith(tag.strikethrough.open)) {
      strikethrough = true
      thought = thought.substring(tag.strikethrough.open.length)
    } else if (bold && thought.startsWith(tag.bold.close)) {
      bold = false
      thought = thought.substring(tag.bold.close.length)
    } else if (italic && thought.startsWith(tag.italic.close)) {
      italic = false
      thought = thought.substring(tag.italic.close.length)
    } else if (underline && thought.startsWith(tag.underline.close)) {
      underline = false
      thought = thought.substring(tag.underline.close.length)
    } else if (strikethrough && thought.startsWith(tag.strikethrough.close)) {
      strikethrough = false
      thought = thought.substring(tag.strikethrough.close.length)
    } else {
      thought = thought.substring(1)
      allBold &&= bold
      allItalic &&= italic
      allUnderline &&= underline
      allStrikethrough &&= strikethrough
    }
  }
  return {
    bold: allBold,
    italic: allItalic,
    underline: allUnderline,
    strikethrough: allStrikethrough,
  }
}

export default getThoughtCommands
