import { useCallback, useEffect, useMemo, useState } from 'react'
import Path from '../@types/Path'
import editingValueStore from '../stores/editingValue'
import parentOf from '../util/parentOf'

/**
 * Helper function to collect nodes with the specified `data-parent-path`.
 * If no thought node is found, it continues searching with `data-grand-parent-path`.
 */
const collectNodes = (path: string): HTMLElement[] => {
  /** Collect nodes by provided attribute and value. */
  const collectByAttribute = (attribute: string, value: string): HTMLElement[] => {
    return Array.from(document.querySelectorAll<HTMLElement>(`[data-${attribute}='${value}']`)).filter(
      node => !node.querySelector('.divider'),
    )
  }

  let collectedNodes = collectByAttribute('parent-path', path)

  // If no nodes found, fallback to data-grand-parent-path
  if (!collectedNodes.length) {
    const grandParentPathArray = parentOf(path.split(','))

    // Ensure grandParentPathArray is a non-empty array
    if (Array.isArray(grandParentPathArray) && grandParentPathArray.length) {
      const grandParentPath = grandParentPathArray.join(',')
      collectedNodes = collectByAttribute('grand-parent-path', grandParentPath)
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
  const path = useMemo(() => parentPath.join(','), [parentPath])

  const updateMaxWidth = useCallback(() => {
    const nodes = collectNodes(path)
    setMaxWidth(calculateMaxWidth(nodes))
  }, [path])

  editingValueStore.subscribe(() => {
    updateMaxWidth()
  })

  useEffect(updateMaxWidth, [updateMaxWidth, parentPath])

  return maxWidth
}

export default useMaxSiblingWidth
