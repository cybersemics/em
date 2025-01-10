import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import fastClick from '../util/fastClick'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dividerRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()

  // State to store the calculated width
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  // Check if the node is in Table View by inspecting the parent and grandparent
  const isTableView = useSelector(state => {
    const parentPath = parentOf(path)
    const parentId = head(parentPath) as ThoughtId | undefined
    const grandParentPath = parentOf(parentPath)
    const grandParentId = head(grandParentPath) as ThoughtId | undefined
    const isTable =
      (parentId && attributeEquals(state, parentId, '=view', 'Table')) ||
      (grandParentId && attributeEquals(state, grandParentId, '=view', 'Table')) ||
      false

    return isTable
  })

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Calculates and updates the Divider's width. */
  const updateDividerWidth = () => {
    if (dividerRef.current) {
      const currentTreeNode = dividerRef.current.closest('[aria-label="tree-node"]') as HTMLElement | null
      if (!currentTreeNode) {
        return
      }

      // Get the data-parent-id of the current tree node
      const currentParentId = currentTreeNode.getAttribute('data-parent-id')
      if (currentParentId) {
        const parentElement = currentTreeNode.parentElement
        if (!parentElement) return

        // Get all tree-node elements within the parent element
        const allTreeNodes = Array.from(parentElement.querySelectorAll('[aria-label="tree-node"]')) as HTMLElement[]

        // Find all siblings (nodes with the same data-parent-id)
        const siblingTreeNodes = allTreeNodes.filter(node => node.getAttribute('data-parent-id') === currentParentId)

        // Determine if the divider is the only child
        const isOnlyChild = siblingTreeNodes.length === 1

        // If the divider is the only child and we're not in Table View, set the width to DIVIDER_MIN_WIDTH
        if (isOnlyChild && !isTableView) {
          setDividerWidth(DIVIDER_MIN_WIDTH)
          return // Early exit since we don't need further calculations
        }

        let widths: number[] = []

        if (isTableView && isOnlyChild) {
          // Table View Mode and Divider is the only item
          // Get the depth from data-depth attribute
          const thoughtDepth = parseInt(currentTreeNode.getAttribute('data-depth') || '0', 10)

          // Get all tree-nodes and filter by matching depth within the parent element
          const sameDepthNodes = allTreeNodes.filter(node => {
            const nodeDepth = parseInt(node.getAttribute('data-depth') || '0', 10)
            return nodeDepth === thoughtDepth
          })

          // Measure widths of all "thought" elements in same-depth nodes
          widths = sameDepthNodes.map(treeNode => {
            const thoughtElement = treeNode.querySelector('[aria-label="thought"]') as HTMLElement | null
            return thoughtElement ? thoughtElement.getBoundingClientRect().width : 0
          })
        } else {
          // Non-table View Mode or Divider is not the only item
          // Exclude the divider itself when calculating widths
          const siblingTreeNodesWithoutDivider = siblingTreeNodes.filter(node => node !== currentTreeNode)
          // Measure widths of sibling "thought" elements, excluding the divider itself
          widths = siblingTreeNodesWithoutDivider.map(treeNode => {
            const thoughtElement = treeNode.querySelector('[aria-label="thought"]') as HTMLElement | null
            return thoughtElement ? thoughtElement.getBoundingClientRect().width : 0
          })
        }

        // Determine the maximum width
        const maxWidth = widths.length > 0 ? Math.max(...widths) : DIVIDER_MIN_WIDTH
        setDividerWidth(Math.round(maxWidth))
      }
    }
  }

  useEffect(() => {
    updateDividerWidth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTableView, path])

  return (
    <div
      aria-label='divider'
      ref={dividerRef}
      className={css({
        margin: '-2px -4px -5px',
        marginLeft: '-20px',
        padding: '10px 4px 16px',
        position: 'relative',
        zIndex: 'stack',
      })}
      style={{ width: `${dividerWidth}px` }}
      {...fastClick(setCursorToDivider)}
    >
      <div
        aria-label={'editable-' + head(path)}
        className={css(
          {
            border: 'solid 1px {colors.divider}',
            // requires editable-hash className to be selected by the cursor navigation via editableNode
          },
          cssRaw,
        )}
      />
    </div>
  )
}

export default Divider
