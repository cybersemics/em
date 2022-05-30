/** Reads the children of a context and outputs them to the CLI. */
const fs = require('fs')
const path = require('path')

const [, , file, ...context] = process.argv
if (!file) {
  console.error('Usage: node readChildren.js db.json a/b/c')
  process.exit(1)
}

const thoughts = JSON.parse(fs.readFileSync(file, 'utf8'))
const { thoughtIndex, lexemeIndex } = thoughts

/** Returns the children of an id as thoughts. */
const getChildrenById = id => {
  const thought = thoughtIndex[id]
  const children = Object.values(thought.childrenMap)
  return children.map(childId => thoughtIndex[childId])
}

/** Gets the children as thoughts of a context. */
const getChildrenByContext = (thought, context = []) => {
  const children = getChildrenById(thought.id)
  if (context.length === 0) return children
  const child = children.find(child => child.value === context[0])
  if (!child) {
    console.error(`Thought with value "${context[0]}" not found in "${thought.value}".`)
    process.exit(1)
  }
  return getChildrenByContext(child, context.slice(1))
}

/** Deletes a thought from the thoughtIndex and lexemeIndex. */
const deleteById = thought => {
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

const rootChildren = getChildrenByContext(thoughtIndex.__ROOT__, context)
// const values = rootChildren.map(child => `${child.id} ${child.value} (${Object.keys(child.childrenMap).length})`)
// console.log(values.join('\n'))

// delete all leaves in the root
rootChildren.forEach(rootChild => {
  const numChildren = Object.keys(rootChild.childrenMap).length
  if (numChildren === 0 && rootChild.value !== '—-') {
    deleteById(rootChild)
  }
})

fs.writeFileSync(file, JSON.stringify(thoughts, null, 2))
