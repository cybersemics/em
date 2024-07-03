import { RefObject, useEffect, useState } from 'react'

/** Helper function to collect consecutive siblings at a specific depth. */
const collectConsecutiveSiblings = (
  siblings: HTMLElement[],
  currentIndex: number,
  targetDepth: string,
  direction: -1 | 1,
): HTMLElement[] => {
  const collectedSiblings: HTMLElement[] = []
  let i = currentIndex + direction

  while (i >= 0 && i < siblings.length) {
    const sibling = siblings[i]
    const siblingDepth = sibling.getAttribute('data-depth')

    if (sibling.classList.contains('tree-node') && siblingDepth === targetDepth) {
      if (!sibling.querySelector('.divider')) {
        collectedSiblings.push(sibling)
      }
    } else {
      break
    }

    i += direction
  }

  return direction === -1 ? collectedSiblings.reverse() : collectedSiblings
}

/** Helper function to collect siblings at target depth and one level up. */
const collectSiblingsOneLevelUp = (
  siblings: HTMLElement[],
  currentIndex: number,
  targetDepth: string,
): HTMLElement[] => {
  const allowedDepth = String(parseInt(targetDepth, 10) - 1)
  const collectedSiblings: HTMLElement[] = []

  /** Collect siblings while moving in provided direction. */
  const collect = (i: number, direction: -1 | 1) => {
    while (i >= 0 && i < siblings.length) {
      const sibling = siblings[i]
      const siblingDepth = sibling.getAttribute('data-depth')

      if (
        sibling.classList.contains('tree-node') &&
        siblingDepth &&
        (siblingDepth === targetDepth || siblingDepth === allowedDepth)
      ) {
        if (!sibling.querySelector('.divider') && siblingDepth === targetDepth) {
          collectedSiblings.push(sibling)
        }
      } else {
        break
      }

      i += direction
    }
  }

  collect(currentIndex - 1, -1)
  collect(currentIndex + 1, 1)

  return collectedSiblings
}

/** Helper function to calculate maximum width among '.thought' elements. */
const calculateMaxWidth = (elements: HTMLElement[]): number => {
  const widths = elements.map(el => {
    const thought = el.querySelector<HTMLElement>('.thought')
    return thought ? thought.offsetWidth : 0
  })

  return widths.length > 0 ? Math.max(...widths) : 0
}

/** Hook to calculate the width of a divider, equal to the max width of a sibling at a particular depth. */
const useMaxSiblingWidth = (elRef: RefObject<HTMLElement>): number => {
  const [maxWidth, setMaxWidth] = useState(0)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    // Get the closest parent node with the class .tree-node and its depth
    const parentTreeNode = el.closest<HTMLElement>('.tree-node')
    if (!parentTreeNode) return

    const targetDepth = parentTreeNode.getAttribute('data-depth')
    if (!targetDepth) return

    /** Get all siblings and calculate max width. */
    const updateSiblingsAndMaxWidth = () => {
      // Get all siblings of the identified parent node
      const siblings = Array.from(parentTreeNode.parentNode?.children || []) as HTMLElement[]

      const currentIndex = siblings.indexOf(parentTreeNode)

      // Collect consecutive siblings at the same depth
      let consecutiveSiblings = [
        ...collectConsecutiveSiblings(siblings, currentIndex, targetDepth, -1),
        ...collectConsecutiveSiblings(siblings, currentIndex, targetDepth, 1),
      ]

      // If it is the only-child in column 2 of a table, a divider should be the max-width of all of the column 2 thoughts,
      // Collect siblings upto one level up
      if (consecutiveSiblings.length === 0) {
        consecutiveSiblings = collectSiblingsOneLevelUp(siblings, currentIndex, targetDepth)
      }

      /** Calculate the maximum width among these '.tree-node .thought' elements. */
      setMaxWidth(calculateMaxWidth(consecutiveSiblings))
    }

    updateSiblingsAndMaxWidth()

    // Set up MutationObserver to watch for changes in the siblings
    const observer = new MutationObserver(() => {
      updateSiblingsAndMaxWidth()
    })

    observer.observe(parentTreeNode.parentNode!, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    // Clean up
    return () => observer.disconnect()
  }, [elRef])

  return maxWidth
}

export default useMaxSiblingWidth
