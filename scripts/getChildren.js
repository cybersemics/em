/** Reads the children of a context and outputs them to the CLI. */
const fs = require('fs')
const path = require('path')

const [, , file, ...context] = process.argv
if (!file) {
  console.error('Usage: node readChildren.js db.json a/b/c')
  process.exit(1)
}

const { thoughtIndex, lexemeIndex } = JSON.parse(fs.readFileSync(file, 'utf8'))

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

const children = getChildrenByContext(thoughtIndex.__ROOT__, context)
const values = children.map(child => `${child.id} ${child.value} (${Object.keys(child.childrenMap).length})`)
if (context.length > 0) {
  console.log(context.join('/'))
}
console.log(values.map(value => (context.length > 0 ? '  ' : '') + value).join('\n'))
