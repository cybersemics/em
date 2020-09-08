import React from 'react'
import { animated, useSpring } from 'react-spring'
import { DragSource, DragSourceConnector, DragSourceMonitor } from 'react-dnd'
import { store } from '../store'
import { clearSelection, contextOf, isDocumentEditable, pathToContext } from '../util'
import { isMobile } from '../browser'
import { hasChild } from '../selectors'
import globals from '../globals'
import { Path } from '../types'
// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

const TEXT_SELECTION_OPCAITY = 0.3

interface BulletProps {
    expanded: boolean,
    isActive: boolean,
    hasChildren: boolean,
    hide: boolean,
    isDragging?: boolean,
    isOver?: boolean,
    thoughtsRankedLive: Path,
    isCursorParent: boolean,
    isDraggable: boolean,
    connectDragSource: (el: JSX.Element) => any,
}

/**
 * Bullet component with animation.
 */
const BulletNew = ({ expanded, isActive, isDragging, hasChildren, hide, connectDragSource }: BulletProps) => {

  // spring animation for bullet
  const { rotation, selectionOpacity, bulletOpacity } = useSpring({
    rotation: expanded ? 90 : 0,
    selectionOpacity: isActive ? TEXT_SELECTION_OPCAITY : 0,
    bulletOpacity: hide ? 0 : 1
  })

  return (
    connectDragSource(
      <div>
        <animated.div
          style={{
            cursor: 'pointer',
            height: '0.86rem',
            width: '0.86rem',
            marginTop: '0.25rem',
            borderRadius: '50%',
            display: 'flex',
            marginRight: '0.4rem',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: bulletOpacity,
            ...selectionOpacity ? {
              background: selectionOpacity.to(
                o => isDragging ? `rgba(173, 216, 230, 0.8)` : `rgba(255,255,255,${o})`
              ) } : {}
          }}
        >
          <animated.span
            style={{
              ...rotation ? { transform: rotation.to(r => `rotate(${r}deg)`) } : {},
              fontSize: '0.94rem',
            }}
          >
            {hasChildren ? '▸' : '•'}
          </animated.span>
        </animated.div>
      </div>
    ))
}

BulletNew.displayName = 'Bullet'

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrag = ({ thoughtsRankedLive, isCursorParent, isDraggable }: { thoughtsRankedLive: Path, isCursorParent: boolean, isDraggable: boolean }) => {
  const state = store.getState()
  const thoughts = pathToContext(thoughtsRankedLive)
  const context = contextOf(pathToContext(thoughtsRankedLive))
  const isDraggableFinal = isDraggable || isCursorParent

  return isDocumentEditable() &&
    isDraggableFinal &&
    (!isMobile || globals.touched) &&
    !hasChild(state, thoughts, '=immovable') &&
    !hasChild(state, thoughts, '=readonly') &&
    !hasChild(state, context, '=immovable') &&
    !hasChild(state, context, '=readonly')
}

// eslint-disable-next-line jsdoc/require-jsdoc
const beginDrag = ({ thoughtsRankedLive }: { thoughtsRankedLive: Path }) => {
  // disable hold-and-select on mobile
  if (isMobile) {
    setTimeout(clearSelection)
  }
  store.dispatch({
    type: 'dragInProgress',
    value: true,
    draggingThought: thoughtsRankedLive,
  })

  return { thoughtsRanked: thoughtsRankedLive }
}
// eslint-disable-next-line jsdoc/require-jsdoc
const endDrag = () => {
  setTimeout(() => {
    // re-enable hold-and-select on mobile
    if (isMobile) {
      clearSelection()
    }
    // reset dragInProgress after a delay to prevent cursor from moving
    store.dispatch({ type: 'dragInProgress', value: false })
    store.dispatch({ type: 'dragHold', value: false })
  })
}

/** Drag specification. */
const spec = {
  beginDrag,
  endDrag,
  canDrag,
}

/** Collect. */
const collect = (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
})

const DraggableBullet = DragSource('move', spec, collect)(BulletNew)

DraggableBullet.displayName = 'ThoughtDragSource'

export default DraggableBullet
