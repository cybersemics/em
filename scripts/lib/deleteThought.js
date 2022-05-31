const hashThought = require('./hashThought')

/** Deletes a thought from the thoughtIndex and lexemeIndex. */
const deleteThought = (thoughtIndices, thought) => {
  const { thoughtIndex, lexemeIndex } = thoughtIndices
  if (!thought.id) {
    console.error('thought', thought)
    throw new Error('Invalid thought')
  }

  // delete children recursively
  const children = Object.values(thought.childrenMap || {}).map(childId => thoughtIndex[childId])
  children.forEach(child => deleteThought(thoughtIndices, child)) // RECURSION

  // remove thought
  delete thoughtIndex[thought.id]

  // remove from parent
  const parent = thoughtIndex[thought.parentId]
  if (!parent) {
    console.error('thought', thought)
    throw new Error('Missing parent of thought')
  }

  const removedFromParent = Object.entries(parent.childrenMap).some(([key, parentChildId]) => {
    if (parentChildId === thought.id) {
      delete parent.childrenMap[key]
      return true
    }
    return false
  })

  if (!removedFromParent) {
    console.error('parent', parent)
    throw new Error('Parent childrenMap does not contain thought')
  }

  const key = hashThought(thought.value)
  const lexeme = lexemeIndex[key]
  if (!lexeme) {
    throw new Error('Lexeme not found for value: ' + thought.value)
  }
  lexeme.contexts = lexeme.contexts.filter(id => id !== thought.id)

  // if the Lexeme is no longer in any contexts, remove it completely
  if (lexeme.contexts.length === 0) {
    delete lexemeIndex[key]
  }
}

module.exports = deleteThought
