import Block from '../@types/Block'

/** Map nested Blocks with an optional start position. */
const flattenTree = <T extends Block, U>(
  blocks: T[],
  mappingFunction: (block: T, ancestors: T[], index: number) => U,
  {
    start = 0,
  }: {
    /** The starting index as an in-order index. */
    // TODO: Optimize to O(depth)
    start?: number
  } = {},
): U[] => {
  let count = 0

  /** Recursive version of flattenTree to allow global count for detection of start index. */
  const flattenTreeRecursive = (
    blocks: T[],
    ancestors: T[],
    mappingFunction: (block: T, ancestors: T[], index: number) => U,
  ): (U | null)[] => {
    const arr: (U | null)[] = []
    count++
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      arr.push(
        // Avoid calling the mapping function if we have not yet reached the start index.
        // They will be sliced off at the end anyway.
        count >= start ? mappingFunction(block, ancestors, count - 1) : null,
        ...flattenTreeRecursive(block.children as T[], [...ancestors, block], mappingFunction),
      )
    }

    return arr
  }

  // slice to skip to the start index
  return flattenTreeRecursive(blocks, [], mappingFunction).slice(start) as U[]
}

export default flattenTree
