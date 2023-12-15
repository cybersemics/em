/** Detects the tab size of a block of text. */
const detectTabSize = (text: string): number | undefined => {
  const indentBase = getIndent(text, { tabSize: 1 })
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const indent = getIndent(lines[i], { tabSize: 1 })
    if (indent > indentBase) {
      return indent - indentBase
    }
  }
}

/** Gets the number of indentations of a line. */
const getIndent = (line: string, { tabSize = 2 }: { tabSize?: number } = {}): number => {
  let indent = 0
  for (let i = 0; i < line.length && line[i] === ' '; i += tabSize) {
    indent++
  }
  return indent
}

/** Splits a plain text outline into even chunks. Insert a line at the beginning that situates each chunk at the correct position in the overall outline, when all the chunks are imported. */
const chunkOutline = (text: string, { chunkSize = 100 }: { chunkSize?: number } = {}): string[] => {
  const lines = text.split('\n')
  const tabSize = detectTabSize(text)
  const indentBase = getIndent(lines[0], { tabSize })

  // chunks of chunkSize lines
  // the last chunk may contain fewer lines
  const chunks: string[] = []

  // track the ancestors at each iteration
  // each line in the text represents a step in an in-order traversal of the outline
  // a continuation line of ancestors is inserted at the beginning of each new chunk in order to allow iterative importing and merging that yields the same final tree
  let ancestors: string[] = []

  lines.forEach((line, i) => {
    // create a new chunk after the chunk size has been reached
    const newChunk = i % chunkSize === 0

    const indentDelta =
      getIndent(line, { tabSize }) -
      (ancestors.length > 0 ? getIndent(ancestors[ancestors.length - 1], { tabSize }) : indentBase)

    if (indentDelta <= 0) {
      ancestors = ancestors.slice(0, indentDelta - 1)
    }

    // throw error if indentation increases by more than a single tab size
    if (indentDelta > 1) {
      console.error({
        tabSize,
        line,
        indent: getIndent(line, { tabSize }),
        prevLine: ancestors[ancestors.length - 1],
        prevIndent: getIndent(ancestors[ancestors.length - 1], { tabSize }),
      })
      throw new Error('Outline is malformed. Indentation cannot increase by more than a single tab size.')
    }

    // add new chunk
    if (newChunk) {
      chunks.push(ancestors.map(ancestor => ancestor + '\n').join(''))
    }

    // append the line to the current chunk
    chunks[chunks.length - 1] += (newChunk ? '' : '\n') + line

    ancestors.push(line)
  })

  return chunks
}

export default chunkOutline
