interface Node {
  children: Node[]
}

/** Traverses a tree in breadth-first order and calls a function for each node. Return false to abort. */
const traverseTree = <T extends Node>(root: T, f: (node: T, i: number) => boolean | void) => {
  const queue: T[] = [root]
  let i = 0
  let abort = false
  // eslint-disable-next-line fp/no-loops
  while (queue.length > 0 && !abort) {
    // eslint-disable-next-line fp/no-mutating-methods
    const node = queue.pop()!
    abort = f(node, i++) === false
    node.children.forEach(child => {
      // eslint-disable-next-line fp/no-mutating-methods
      queue.unshift(child as T)
    })
  }
}

export default traverseTree
