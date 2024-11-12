const getChildrenById = require('./getChildrenById')

/** Gets the children as thoughts of a context. */
const getChildrenByContext = ({ thoughtIndex }, thought, context = []) => {
  const children = getChildrenById({ thoughtIndex }, thought.id)
  if (context.length === 0) return children
  const child = children.find(child => child.value === context[0])
  if (!child) {
    throw new Error(`Thought with value "${context[0]}" not found in "${thought.value}".`)
  }
  return getChildrenByContext({ thoughtIndex }, child, context.slice(1))
}

module.exports = getChildrenByContext
