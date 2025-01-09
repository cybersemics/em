import React, { useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import Path from '../@types/Path'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { DIVIDER_MIN_WIDTH } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import rootedParentOf from '../selectors/rootedParentOf'
import fastClick from '../util/fastClick'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** A custom horizontal rule. */
const Divider = ({ path, cssRaw }: { path: Path; cssRaw?: SystemStyleObject }) => {
  const dividerRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()

  // State to store the calculated width
  const [dividerWidth, setDividerWidth] = useState<number>(DIVIDER_MIN_WIDTH)

  /** Sets the cursor to the divider. */
  const setCursorToDivider = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    dispatch(setCursor({ path }))
  }

  /** Set the Divider's width based on the maximum width of sibling 'thought' elements. */
  const setStyle = () => {
    if (dividerRef.current) {
      // Get the current 'tree-node' containing the Divider
      const currentTreeNode = dividerRef.current.closest('[aria-label="tree-node"]') as HTMLElement | null

      if (currentTreeNode) {
        // Get the data-parent-id of the current 'tree-node'
        const currentParentId = currentTreeNode.getAttribute('data-parent-id')

        if (currentParentId) {
          // Limit the search to the parent element
          const parentElement = currentTreeNode.parentElement
          if (parentElement) {
            const siblingTreeNodes = Array.from(parentElement.querySelectorAll('[aria-label="tree-node"]')).filter(
              node => node.getAttribute('data-parent-id') === currentParentId,
            ) as HTMLElement[]

            // Measure the widths of 'thought' elements within sibling 'tree-node's
            const widths = siblingTreeNodes.map(treeNode => {
              // Find the 'thought' element within the 'tree-node'
              const thoughtElement = treeNode.querySelector('[aria-label="thought"]') as HTMLElement | null

              if (thoughtElement) {
                // Measure the width of the 'thought' element
                const width = thoughtElement.getBoundingClientRect().width
                return width
              } else {
                // If no 'thought' element is found, return 0
                return 0
              }
            })

            // Determine the maximum width
            const maxWidth = widths.length > 0 ? Math.max(...widths) : DIVIDER_MIN_WIDTH

            // Update the state with the calculated width
            const finalWidth = Math.max(maxWidth, DIVIDER_MIN_WIDTH)
            setDividerWidth(Math.round(finalWidth))
          }
        }
      }
    }
  }

  useLayoutEffect(() => {
    setStyle()
  }, []) // Empty dependency array ensures this runs once on mount

  const isTableView = useSelector(state => {
    const parentId = head(parentOf(path)) || head(rootedParentOf(state, path))
    return attributeEquals(state, parentId, '=view', 'Table')
  })

  return (
    <div
      aria-label='divider'
      ref={dividerRef}
      className={css({
        margin: '-2px -4px -5px',
        marginLeft: isTableView ? '0px' : '-20px',
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
