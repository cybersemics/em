import { useCallback, useEffect, useMemo, useState } from 'react'
import Path from '../@types/Path'
import editingValueStore from '../stores/editingValue'
import hashPath from '../util/hashPath'
import parentOf from '../util/parentOf'

/**
 * Helper function to collect nodes with the specified `data-parent-path`.
 * If no thought node is found, it continues searching with `data-grandparent-path`.
 */
const collectNodes = (path: Path): HTMLElement[] => {
  /** Collect nodes by provided attribute and value. */
  const collectByAttribute = (attribute: string, value: string): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(`.tree-node[data-${attribute}='${value}']:not(.divider-thought)`))

  let collectedNodes = collectByAttribute('parent-path', hashPath(path))

  // If no nodes found, fallback to data-grandparent-path
  if (!collectedNodes.length) {
    const grandparentPathArray = parentOf(path)
    // Ensure grandParentPathArray is a non-empty array
    if (Array.isArray(grandparentPathArray) && grandparentPathArray.length) {
      const grandparentPath = hashPath(grandparentPathArray)
      collectedNodes = collectByAttribute('grandparent-path', grandparentPath)
    }
  }

  return collectedNodes
}

/**
 * Helper function to calculate maximum width among '.thought' elements.
 */
const calculateMaxWidth = (elements: HTMLElement[]): number => {
  const widths = elements.map(el => {
    const thought = el.querySelector<HTMLElement>('.thought')
    return thought ? thought.offsetWidth : 0
  })

  return widths.length > 0 ? Math.max(...widths) : 0
}

/**
 * Hook to calculate the width of a divider, equal to the max width of a sibling
 * at a particular `data-parent-path`.
 */
const useMaxSiblingWidth = (parentPath: Path): number => {
  const [maxWidth, setMaxWidth] = useState(0)
  const path = useMemo(() => parentPath, [parentPath])

  const updateMaxWidth = useCallback(() => {
    const nodes = collectNodes(path)
    setMaxWidth(calculateMaxWidth(nodes))
  }, [path])

  editingValueStore.useEffect(updateMaxWidth)

  useEffect(updateMaxWidth, [updateMaxWidth, path])

  return maxWidth
}

export default useMaxSiblingWidth
