import Block from '../@types/Block'

/** Seeks to a specific index of an in-order search within nested JSON. Returns the Tree path and childIndex. */
const seekBlock = <T extends Block>(json: T[], index: number): { path: T[]; childIndex: number } | null => {
  /** Recursive seekBlock. */
  const seekJsonRecursive = (
    json: T[],
    index: number,
    { childIndex = 0, path = [] }: { childIndex?: number; path?: T[] } = {},
  ): { descendants: number; match?: { path: T[]; childIndex: number } | null } => {
    // seek to position 0 returns immediateley
    // not triggered in recursive calls since there is a separate check in the children loop that is aware of childIndex
    if (index === 0) {
      return { descendants: 0, match: { path, childIndex } }
    }

    // track the number of descendants that are descendants
    // used
    let descendants = 0

    // loop through children
    for (let i = 0; i < json.length; i++) {
      // RECURSE
      const result = seekJsonRecursive(json[i].children as T[], index - descendants - 1, {
        childIndex: i,
        path: [...path, json[i]],
      })

      // short circuit and unwrap recursive calls when a match is found
      if (result.match) return result

      descendants += result.descendants + 1
    }

    // no match yet
    return { descendants }
  }

  return seekJsonRecursive(json, index).match || null
}

export default seekBlock
