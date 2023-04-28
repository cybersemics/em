import Block from '../@types/Block'

/** Returns the number of nodes in a tree. */
const numBlocks = <T extends Block>(nodes: T[]): number =>
  nodes.reduce((accum, node) => accum + numBlocks(node.children) + 1, 0)

export default numBlocks
