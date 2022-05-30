const getChildrenById = require('./getChildrenById')

/** Gets the children as thoughts of a context. */
const getChildrenByContext = (thoughtIndex, thought, context = []) => {
  const children = getChildrenById(thoughtIndex, thought.id)
  if (context.length === 0) return children
  const child = children.find(child => child.value === context[0])
  if (!child) {
    console.error(`Thought with value "${context[0]}" not found in "${thought.value}".`)
    process.exit(1)
  }
  return getChildrenByContext(thoughtIndex, child, context.slice(1))
}

module.exports = getChildrenByContext
