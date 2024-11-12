/** Returns the children of an id as thoughts. */
const getChildrenById = ({ thoughtIndex }, id) => {
  const thought = thoughtIndex[id]
  const children = Object.values(thought.childrenMap || {})
  return children.map(childId => thoughtIndex[childId])
}

module.exports = getChildrenById
