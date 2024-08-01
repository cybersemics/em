import reactMinistore from './react-ministore'

/** A store that tracks the document's command state. */
const commandStateStore = reactMinistore<Record<string, boolean | undefined>>({
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
})

/** Resets the command state to false. */
export const resetCommandState = () => {
  commandStateStore.update({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
}

/** Updates the command state to the current state of the document. */
export const updateCommandState = () => {
  commandStateStore.update({
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strikethrough: document.queryCommandState('strikethrough'),
  })
}

export default commandStateStore
