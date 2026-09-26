import findThoughtByText from './findThoughtByText'

/** The number of characters of a ThoughtId, which is the unit of a hashed Path in data-path. */
const THOUGHT_ID_LENGTH = 32

/** Finds the tree nodes of a thought's direct children, in the order they are rendered. LayoutTree renders every visible thought as a flat list of tree nodes, so children are identified by their data-path, which is the concatenation of the ids of their Path. In the context view, the children of a thought are its contexts. */
export default async function findSubthoughts(value?: HTMLElement | string | null): Promise<HTMLElement[]> {
  if (!value) return []
  const thought = typeof value === 'string' ? await findThoughtByText(value) : value
  const node = thought?.closest('[aria-label="tree-node"]')
  if (!node) throw new Error(`Thought "${typeof value === 'string' ? value : value.textContent}" is not rendered.`)
  const path = node.getAttribute('data-path')!
  return Array.from(document.querySelectorAll<HTMLElement>('[aria-label="tree-node"]')).filter(nodeChild => {
    const pathChild = nodeChild.getAttribute('data-path')!
    return pathChild.startsWith(path) && pathChild.length === path.length + THOUGHT_ID_LENGTH
  })
}
