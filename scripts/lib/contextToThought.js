const getChildrenById = require('./getChildrenById')

/** Gets a thought by context. */
const contextToThought = ({ thoughtIndex }, startThought, context) => {
  if (context.length === 0) return startThought
  const children = getChildrenById({ thoughtIndex }, startThought.id)
  const child = children.find(child => child.value === context[0])
  if (!child) {
    console.error(`Thought with value "${context[0]}" not found in "${startThought.value}"`)
    process.exit(1)
  }
  return contextToThought({ thoughtIndex }, child, context.slice(1))
}

module.exports = contextToThought
