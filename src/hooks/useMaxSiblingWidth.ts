import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import { findAnyChild } from '../selectors/getChildren'
import editingValueStore from '../stores/editingValue'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/**
 * Helper function to collect nodes with the specified `data-parent-path`.
 * If no thought node is found, it continues searching with `data-grandparent-path`.
 */
const collectNodes = (path: Path, hasNonDividerSiblings: boolean): HTMLElement[] => {
  let collectedNodes: HTMLElement[] = []
  /** Collect nodes by provided attribute and value. */
  const collectByAttribute = (attribute: string, value: string): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(`.tree-node[data-${attribute}='${value}']:not(.divider-thought)`))

  if (hasNonDividerSiblings) {
    collectedNodes = collectByAttribute('parent-path', hashPath(path))
  } else {
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
  return elements.reduce((maxWidth, el) => {
    const thought = el.querySelector<HTMLElement>('.thought')
    const width = thought ? thought.offsetWidth : 0
    return Math.max(maxWidth, width)
  }, 0)
}

/**
 * Hook to calculate the width of a divider, equal to the max width of a sibling
 * at a particular `data-parent-path`.
 */
const useMaxSiblingWidth = (parentPath: Path): number => {
  const [maxWidth, setMaxWidth] = useState(0)
  const hasNonDividerSiblings = useSelector(state =>
    findAnyChild(state, head(parentPath), child => child.value !== '---'),
  )

  const updateMaxWidth = useCallback(() => {
    const nodes = collectNodes(parentPath, !!hasNonDividerSiblings)
    setMaxWidth(calculateMaxWidth(nodes))
  }, [parentPath, hasNonDividerSiblings])

  const editingVal = editingValueStore.useSelector()

  useLayoutEffect(updateMaxWidth, [updateMaxWidth, editingVal])
  useEffect(updateMaxWidth, [updateMaxWidth, parentPath])

  return maxWidth
}

export default useMaxSiblingWidth
