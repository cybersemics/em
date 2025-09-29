import _ from 'lodash'
import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import LazyEnv from '../@types/LazyEnv'
import type Thought from '../@types/Thought'
import { isSafari, isTouch, isiPhone } from '../browser'
import useHideBullet from '../hooks/useHideBullet'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

const isIOSSafari = isTouch && isiPhone && isSafari()

/**
 * CursorOverlay is a component that renders the cursor overlay for a thought bullet.
 */
export function CursorOverlay() {
  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  return (
    <g key='placeholder-bullet-g' style={{ visibility: 'visible' }}>
      <ellipse
        ry={bulletOverlayRadius}
        rx={bulletOverlayRadius}
        cy='300'
        cx='300'
        className={css({
          stroke: 'highlight',
          fillOpacity: 0.25,
          fill: 'fg',
        })}
      />
    </g>
  )
}

/**
 * Use 2 requestAnimationFrame to delay DOM queries until browser paint is complete.
 */
function afterNextPaint(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // add extra rAF for android and ios devices to get the actual cursor node position
      if (isTouch) {
        requestAnimationFrame(() => {
          cb()
        })
      } else {
        cb()
      }
    })
  })
}
/**
 * PlaceholderTreeNode is a component used to mimic behavior of TreeNode.
 * Any position changes from one Thought to another will be animated within this component.
 */
function PlaceholderTreeNode({
  children,
  x,
  y,
  env,
}: {
  children?: React.ReactNode
  x: number
  y: number
  env?: LazyEnv
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [targetSvg, setTargetSvg] = useState<SVGSVGElement | null>(null)

  const cursor = useSelector(state => state.cursor)

  // Get required data for useHideBullet hook
  const { simplePath, thoughtId, childrenThoughts, isInContextView } = useSelector(state => {
    if (!state.cursor) {
      return {
        simplePath: null,
        thoughtId: null,
        childrenThoughts: null,
        isInContextView: false,
      }
    }

    const path = simplifyPath(state, state.cursor)
    const id = head(state.cursor)
    const children = getAllChildren(state, id)
      .map(childId => getThoughtById(state, childId))
      .filter(Boolean)
    const contextView = isContextViewActive(state, parentOf(state.cursor))

    return {
      simplePath: path,
      thoughtId: id,
      childrenThoughts: children,
      isInContextView: contextView,
    }
  })

  // current thought and grandparent id (used for attribute-based bullet hiding like in Subthought)
  const thought = useSelector(state => (thoughtId ? getThoughtById(state, thoughtId) : undefined))
  const grandparentId = simplePath ? simplePath[simplePath.length - 3] : null

  const bulletIsDivider = useSelector(state =>
    state.cursor ? isDivider(getThoughtById(state, head(state.cursor))?.value) : false,
  )
  // Table view detection selectors
  const isTableView = useSelector(state => {
    if (!state.cursor) return false
    const parentPath = rootedParentOf(state, state.cursor)
    const parentId = head(parentPath)
    return attributeEquals(state, parentId, '=view', 'Table')
  })

  const isTableCol1 = useSelector(state => {
    if (!state.cursor) return false
    const parentPath = rootedParentOf(state, state.cursor)
    return attributeEquals(state, head(parentPath), '=view', 'Table')
  })

  const isTableCol2 = useSelector(state => {
    if (!state.cursor) return false
    const parentPath = rootedParentOf(state, state.cursor)
    const grandParentPath = rootedParentOf(state, parentPath)
    return attributeEquals(state, head(grandParentPath), '=view', 'Table')
  })

  // compute attribute-based hide like in Subthought
  const childrenAttributeId = useSelector(
    state =>
      (thought &&
        thought.value !== '=children' &&
        findAnyChild(state, thought.parentId, (child: Thought) => child.value === '=children')?.id) ||
      null,
  )
  const grandchildrenAttributeId = useSelector(state => {
    if (!thought || thought.value === '=style' || !grandparentId) return null
    return findAnyChild(state, grandparentId, (child: Thought) => child.value === '=grandchildren')?.id || null
  })

  const hideBulletAttr = useSelector(state => {
    const hideBulletsChildren = attributeEquals(state, childrenAttributeId, '=bullet', 'None')
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      thought && thought.value !== '=bullet' && attributeEquals(state, grandchildrenAttributeId, '=bullet', 'None')
    if (hideBulletsGrandchildren) return true
    return false
  })

  // Implement useHideBullet hook - only when we have valid cursor data
  const shouldHideBullet =
    cursor && thoughtId && simplePath
      ? useHideBullet({
          children: childrenThoughts,
          env,
          hideBulletProp: hideBulletAttr,
          isEditing: true, // keep this as true since cursor overlay only works when editing is true
          simplePath,
          isInContextView,
          thoughtId,
        })
      : false

  React.useEffect(() => {
    /** Updates the placeholder node to mirror the current cursor node and target its bullet svg. */
    const updateCursorNode = () => {
      if (!containerRef.current || !cursor) return

      // Find the cursor TreeNode using the data-cursor attribute
      const cursorTreeNode = document.querySelector('div[data-cursor="true"]') as HTMLElement

      if (!cursorTreeNode) return

      const container = containerRef.current

      // Copy all attributes from the cursor TreeNode to the container (except data-cursor)
      Array.from(cursorTreeNode.attributes).forEach(attr => {
        if (attr.name !== 'data-cursor') {
          container.setAttribute(attr.name, attr.value)
        }
      })

      // Clear existing content and copy the nested child from cursor TreeNode
      container.innerHTML = ''
      container.style.visibility = 'hidden'
      if (cursorTreeNode.firstElementChild) {
        const nestedChild = cursorTreeNode.firstElementChild.cloneNode(true) as HTMLElement

        container.appendChild(nestedChild)

        const svg = nestedChild.querySelector('span[aria-label="bullet"] svg') as SVGSVGElement | null
        if (svg) {
          // Clear the SVG contents
          svg.innerHTML = ''
          svg.style.visibility = 'visible'
        }
        setTargetSvg(svg)
      }
    }

    afterNextPaint(updateCursorNode)
  }, [cursor, isTableView, isTableCol1, isTableCol2, x, y])

  if (bulletIsDivider || shouldHideBullet) {
    return null
  }

  return (
    <div data-id='placeholder-tree-node' ref={containerRef}>
      {targetSvg && ReactDOM.createPortal(children, targetSvg)}
    </div>
  )
}

/**
 * BulletCursorOverlay is a component used to animate the cursor overlay from the bullet.
 * This component also contains placeholders for other components to maintain consistency of cursor overlay position.
 **/
export default function BulletCursorOverlay({ x, y, env }: { x: number; y: number; env?: LazyEnv }) {
  return (
    <PlaceholderTreeNode x={x} y={y} env={env}>
      <CursorOverlay />
    </PlaceholderTreeNode>
  )
}
