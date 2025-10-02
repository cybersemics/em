import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import type Thought from '../@types/Thought'
import { isSafari, isTouch, isiPhone } from '../browser'
import useDebouncedLatest from '../hooks/useDebouncedLatest'
import useHideBullet from '../hooks/useHideBullet'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

const isIOSSafari = isTouch && isiPhone && isSafari()
const bulletOverlayRadius = isIOSSafari ? 300 : 245

// debounce delay for syncing the placeholder to the live cursor node
const CURSOR_NODE_UPDATE_DEBOUNCE = 40

/**
 * BulletCursorOverlway is a component used to animate the cursor overlay from the bullet.
 * This component also contains placeholders for other components to maintain consistency of cursor overlay position.
 **/
export default function BulletCursorOverlay({ env }: { env?: LazyEnv }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const cursor = useSelector(state => state.cursor)

  // Get required data for useHideBullet hook
  const { simplePath, thoughtId, childrenThoughts, isInContextView } = useSelector(state => {
    if (!state.cursor) {
      return { simplePath: null, thoughtId: null, childrenThoughts: null, isInContextView: false }
    }

    const path = simplifyPath(state, state.cursor)
    const id = head(state.cursor)
    const children = getAllChildren(state, id)
      .map(childId => getThoughtById(state, childId))
      .filter(Boolean)
    const contextView = isContextViewActive(state, parentOf(state.cursor))

    return { simplePath: path, thoughtId: id, childrenThoughts: children, isInContextView: contextView }
  })

  // current thought and grandparent id (used for attribute-based bullet hiding like in Subthought)
  const thought = useSelector(state => (thoughtId ? getThoughtById(state, thoughtId) : undefined))
  const grandparentId = simplePath ? simplePath[simplePath.length - 3] : null

  const bulletIsDivider = useSelector(state =>
    state.cursor ? isDivider(getThoughtById(state, head(state.cursor))?.value) : false,
  )

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

  const prevDomElementRef = React.useRef<HTMLElement | null>(null)

  /** Updates the placeholder node to mirror the current cursor node and target its bullet svg. */
  const updateCursorNode = useCallback(() => {
    if (!containerRef.current || !cursor) return

    // Find the cursor TreeNode using the data-cursor attribute
    const cursorTreeNodes = document.querySelectorAll('div[data-cursor="true"]') as NodeListOf<HTMLElement>

    const cursorTreeNode =
      cursorTreeNodes.length > 1
        ? Array.from(cursorTreeNodes).find(node => node !== prevDomElementRef.current)
        : cursorTreeNodes[0]

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
        // Replace the SVG contents

        const svgInnerHTML = `<g style="visibility: visible; will-change: transform;"><ellipse ry="${bulletOverlayRadius}" rx="${bulletOverlayRadius}" cy="300" cx="300" class="stk_highlight fill-opacity_0.25 fill_fg"></ellipse></g>`
        svg.innerHTML = svgInnerHTML

        svg.style.visibility = 'visible'
      }
      prevDomElementRef.current = cursorTreeNode
    }
  }, [cursor])

  // debounced caller that runs afterNextPaint
  const debouncedUpdate = useDebouncedLatest(updateCursorNode, CURSOR_NODE_UPDATE_DEBOUNCE)

  // trigger debounced update on dependencies change
  React.useEffect(() => {
    debouncedUpdate()
  }, [debouncedUpdate, cursor])

  if (bulletIsDivider || shouldHideBullet) {
    return null
  }

  return <div data-id='placeholder-tree-node' ref={containerRef} />
}
