import { equalThoughtRanked } from '../util'

export const checkIfPathShareSubcontext = (rankedThoughtsA, rankedThoughtsB) => {
  // this method returns -1 if there is no common majority subcontext else returns the index up to which two rankedThought share common majority subcontext
  const longPath = rankedThoughtsA.length > rankedThoughtsB.length ? rankedThoughtsA : rankedThoughtsB
  const shortPath = rankedThoughtsB.length < rankedThoughtsA.length ? rankedThoughtsB : rankedThoughtsA
  // const middle = Math.round(longPath.length / 2)

  // // checking if common majoity subcontext is possible to avoid iteration
  // if (shortPath.length < middle) return -1

  const firstDiff = shortPath.findIndex((_, i) => !equalThoughtRanked(shortPath[i], longPath[i]))

  // if firstDiff is -1 it means shortPath is a subset of longPath so index must be shortPath.length - 1

  const index = (firstDiff === -1 ? shortPath.length : firstDiff) - 1

  // checking if there are any common thoughts and also if the number of common thoughts are majority
  // return (index + 1) >= middle ? index : -1
  return index
}
