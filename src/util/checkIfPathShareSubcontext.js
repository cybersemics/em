export const checkIfPathShareSubcontext = (rankedThoughtsA, rankedThoughtsB) => {
  const longPath = rankedThoughtsA.length > rankedThoughtsB.length ? rankedThoughtsA : rankedThoughtsB
  const shortPath = rankedThoughtsB.length < rankedThoughtsA.length ? rankedThoughtsB : rankedThoughtsA

  /* checking if common majoity subcontext is possible */
  if (shortPath.length < Math.floor(longPath.length / 2)) return { isSubcontext: false, index: -1 }

  const subcontextData = { isSubcontext: false, index: -1 }

  /* reducing the shortpath to calculate the */
  shortPath.every((thought, i) => {
    if (!(thought.value === longPath[i].value && thought.rank === longPath[i].rank)) return false
    /* mutating this object because without mutation it very difficult to calulate
    the index up to where two paths share common ranked thoughts and also without mutation we cannot avoide iterating
    all the array. */
    subcontextData.isSubcontext = true
    subcontextData.index = i
    return true
  })

  if (subcontextData.isSubcontext && subcontextData.index + 1 < Math.floor(longPath.length / 2)) return { ...subcontextData, isSubcontext: false }

  return subcontextData
}
