import Block from '../@types/Block'

/** Map nested Blocks with an optional start position. */
const mapBlocks = <T extends Block, U>(
  blocks: T[],
  mappingFunction: (block: T, ancestors: T[], index: number) => U,
  {
    start,
  }: {
    /** The starting index as an in-order index. */
    // TODO: Optimize to O(depth)
    start?: number
  } = {},
): U[] => {
  start = start || 0
  let count = 0

  /** Recursive version of mapBlocks to allow global count for detection of start index. */
  const mapBlocksRecursive = (
    blocks: T[],
    ancestors: T[],
    mappingFunction: (block: T, ancestors: T[], index: number) => U,
  ): (U | null)[] => {
    const arr: (U | null)[] = []
    count++
    // eslint-disable-next-line fp/no-loops
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      // eslint-disable-next-line fp/no-mutating-methods
      arr.push(
        // Avoid calling the mapping function if we have not yet reached the start index.
        // They will be sliced off at the end anyway.
        count >= (start || 0) ? mappingFunction(block, ancestors, count - 1) : null,
        ...mapBlocksRecursive(block.children as T[], [...ancestors, block], mappingFunction),
      )
    }

    return arr
  }

  // slice to skip to the start index
  return mapBlocksRecursive(blocks, [], mappingFunction).slice(start) as U[]
}

export default mapBlocks
