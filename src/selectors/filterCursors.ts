import MulticursorFilter from '../@types/MulticursorFilter'
import Path from '../@types/Path'
import State from '../@types/State'
import hashPath from '../util/hashPath'
import parentOf from '../util/parentOf'
import UnreachableError from '../util/unreachable'

/** Filter the cursors based on the filter type. Cursors are sorted in document order. */
const filterCursors = (state: State, cursors: Path[], filter: MulticursorFilter = 'all'): Path[] => {
  switch (filter) {
    case 'all':
      return cursors

    case 'first-sibling': {
      const seenParents = new Set<string>()

      return cursors.filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        if (seenParents.has(parent)) return false
        seenParents.add(parent)

        return true
      })
    }

    case 'last-sibling': {
      const seenParents = new Set<string>()

      return [...cursors].reverse().filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        if (seenParents.has(parent)) return false
        seenParents.add(parent)

        return true
      })
    }

    case 'prefer-ancestor': {
      const seenCursors = new Set<string>()

      return cursors.filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        // Always add the cursor to the set to resolve direct chains.
        seenCursors.add(hashPath(cursor))

        return !seenCursors.has(parent)
      })
    }

    default:
      // Make sure all cases are covered
      throw new UnreachableError(filter)
  }
}

export default filterCursors
