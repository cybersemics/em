/** Deletes a thought from the thoughtIndex and lexemeIndex. */
const deleteThought = (thoughtIndices, thought) => {
  const { thoughtIndex, lexemeIndex } = thoughtIndices
  if (!thought.id) {
    console.error('Invalid thought', thought)
    process.exit(1)
  }

  // delete children recursively
  const children = Object.values(thought.childrenMap || {}).map(childId => thoughtIndex[childId])
  children.forEach(child => deleteThought(thoughtIndices, child)) // RECURSION

  // remove thought
  delete thoughtIndex[thought.id]

  // remove from parent
  const parent = thoughtIndex[thought.parentId]
  if (!parent) {
    console.error('Missing parent of thought', thought)
    process.exit(1)
  }

  const removedFromParent = Object.entries(parent.childrenMap).some(([key, parentChildId]) => {
    if (parentChildId === thought.id) {
      delete parent.childrenMap[key]
      return true
    }
    return false
  })

  if (!removedFromParent) {
    console.error('Parent childrenMap does not contain thought', parent)
    process.exit(1)
  }

  // iterate through all Lexemes since hashThought is not available in plain JS
  for (let [key, lexeme] of Object.entries(lexemeIndex)) {
    if (lexeme.contexts.includes(thought.id)) {
      lexeme.contexts = lexeme.contexts.filter(id => id !== thought.id)

      // if the Lexeme is no longer in any contexts, remove it completely
      if (lexeme.contexts.length === 0) {
        delete lexemeIndex[key]
      }
      return
    }
  }

  console.error(`Lexeme not found for "${thought.value}".`)
  process.exit(1)
}

module.exports = deleteThought
