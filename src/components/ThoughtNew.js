import React from 'react'

import { connect } from 'react-redux'
// import { store } from '../store'
import globals from '../globals'
import assert from 'assert'

// components
import ThoughtAnnotation from './ThoughtAnnotation'
import GestureDiagram from './GestureDiagram'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants'

import { formatKeyboardShortcut, shortcutById } from '../shortcuts'

// util
import {
  clearSelection,
  contextOf,
  equalPath,
  head,
  headRank,
  headValue,
  isDivider,
  isDocumentEditable,
  isRoot,
  isURL,
  pathToContext,
  publishMode,
  rootedContextOf,
  subsetThoughts,
} from '../util'

// selectors
import {
  attribute,
  chain,
  getThought,
  getThoughtsRanked,
  hasChild,
} from '../selectors'
// import ContentEditable from 'react-contenteditable'
import { animated, useSpring } from 'react-spring'
import { AnimatePresence, AnimateSharedLayout, motion } from 'framer-motion'
import { isMobile } from '../browser'
import Editable from './Editable'
import DividerNew from './DividerNew'
import HomeLink from './HomeLink'
import Note from './Note'
import { DragWrapper, DropWrapper } from './DragAndDrop'

import { store } from '../store'
import classNames from 'classnames'

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

const TEXT_SELECTION_OPCAITY = 0.3
const framerTransition = { duration: 0.1 }

/**********************************************************************
 * Redux
 **********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {

  const {
    codeView,
    cursor,
    cursorOffset,
    cursorBeforeEdit,
    expanded,
    expandedContextThought,
    search,
    showHiddenThoughts,
  } = state

  const {
    contextChain,
    thoughtsRanked,
    showContexts,
    depth,
    childrenForced,
    thoughtsResolved
  } = props.item

  console.log(thoughtsRanked, 'lolsdsd')

  // check if the cursor path includes the current thought
  const isEditingPath = subsetThoughts(cursorBeforeEdit, thoughtsResolved)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)

  const thoughtsRankedLive = isEditing
    ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
    : thoughtsRanked

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked)) && getThoughtsRanked(state, cursor).length === 0
    // parent
    : equalPath(contextOf(cursor || []), chain(state, contextChain, thoughtsRanked))

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(state, thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  const isCursorGrandparent =
    equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked))
  const children = childrenForced || getThoughtsRanked(state, contextBinding || thoughtsRankedLive)

  const value = headValue(thoughtsRankedLive)

  // link URL
  const url = isURL(value) ? value :
  // if the only subthought is a url and the thought is not expanded, link the thought
    !expanded && children.length === 1 && children[0].value && isURL(children[0].value) && (!cursor || !equalPath(thoughtsRankedLive, contextOf(cursor))) ? children[0].value :
    null

  const thought = getThought(state, value)

  return {
    contextBinding,
    cursorOffset,
    distance,
    isPublishChild: !search && publishMode() && thoughtsRanked.length === 2,
    isCursorParent,
    isCursorGrandparent,
    expandedContextThought,
    isCodeView: cursor && equalPath(codeView, props.thoughtsRanked),
    isEditing,
    isEditingPath,
    publish: !search && publishMode(),
    showHiddenThoughts,
    thought,
    thoughtsRankedLive,
    view: attribute(state, thoughtsRankedLive, '=view'),
    url,
  }
}

/** A message that says there are no children in this context. */
const NoChildren = ({ allowSingleContext, childrenLength, thoughtsRanked }) =>
  <motion.div
    layout
    className='children-subheading text-note text-small'
    style={{ marginLeft: '1.5rem' }}
    transition={framerTransition}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}>

    This thought is not found in any {childrenLength === 0 ? '' : 'other'} contexts.<br /><br />

    <span>{isMobile
      ? <span className='gesture-container'>Swipe <GestureDiagram path={subthoughtShortcut.gesture} size='30' color='darkgray' /></span>
      : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard)}</span>
    } to add "{headValue(thoughtsRanked)}" to a new context.
    </span>

    <br />{allowSingleContext
      ? 'A floating context... how interesting.'
      : <span>{isMobile
        ? <span className='gesture-container'>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture} size='30' color='darkgray'/* mtach .children-subheading color */ /></span>
        : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard)}</span>
      } to return to the normal view.</span>
    }
  </motion.div>

/**********************************************************************
 * Components
 **********************************************************************/

/**
 * Bullet component with animation.
 */
const Bullet = ({ expanded, isActive, isDragActive, hasChildren, hide, innerRef }) => {

  // spring animation for bullet
  const { rotation, selectionOpacity } = useSpring({
    rotation: expanded ? 90 : 0,
    selectionOpacity: isActive ? TEXT_SELECTION_OPCAITY : 0,
  })

  return (
    <animated.div
      ref={innerRef}
      style={{
        cursor: 'pointer',
        visibility: hide ? 'hidden' : 'visible',
        height: '0.86rem',
        width: '0.86rem',
        marginTop: '0.25rem',
        borderRadius: '50%',
        display: 'flex',
        marginRight: '0.4rem',
        justifyContent: 'center',
        alignItems: 'center',
        ...selectionOpacity ? {
          background: selectionOpacity.interpolate(
            o => isDragActive ? `rgb(255,192,203,${o})` : `rgba(255,255,255,${o})`
          ) } : {}
      }}
    >
      <animated.span
        style={{
          ...rotation ? { transform: rotation.interpolate(r => `rotate(${r}deg)`) } : {},
          fontSize: '0.94rem',
        }}
      >
        {hasChildren ? '▸' : '•'}
      </animated.span>
    </animated.div>
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const canDrag = ({ thoughtsRankedLive, isCursorParent, isDraggable }) => {
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
const beginDrag = ({ thoughtsRankedLive }) => {
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

/** Node Component. */
const ThoughtWrapper = ({ measureBind, innerDivRef, mainDivStyle, innerDivStyle, wrapperStyle, parentKey, item }) => {
  const { isLastChild, expanded } = item
  return (
    <animated.div style={wrapperStyle}>
      <animated.div
        className={classNames({
          node: true,
          [`parent-${parentKey}`]: true
        })}
        style={mainDivStyle}
        id={item.key}
      >
        <animated.div
          ref={innerDivRef}
          style={innerDivStyle}>
          <div {...measureBind}>
            <AnimateSharedLayout>
              <motion.div layout>
                <Thought
                  item={item}
                />
              </motion.div>
            </AnimateSharedLayout>
          </div>
        </animated.div>
      </animated.div>
      { isLastChild && !expanded &&
      <DropWrapper>
        {
          ({ isOver, isDragging, drop }) => {
            return (
              isDragging ?
                <div
                  ref={drop}
                  style={{
                    position: 'absolute',
                    transform: 'translateX(0.4rem)',
                    height: '1.2rem',
                    width: 'calc(100% - 0.4rem)',
                    bottom: '-1rem',
                  }}
                >
                  <AnimatePresence>
                    {
                      isOver &&
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        style={{ background: 'green', position: 'initial' }}
                        className='drop-hover-new'>
                      </motion.div>
                    }
                  </AnimatePresence>
                </div>
                : null
            )
          }
        }
      </DropWrapper>
      }
      { !expanded && <DropWrapper>
        {
          ({ isOver, isDragging, drop }) => {
            return (
              isDragging ?
                <div
                  ref={drop}
                  style={{
                    transform: 'translateX(4rem)',
                    position: 'absolute',
                    height: '1.2rem',
                    width: 'calc(100% - 4rem)',
                    bottom: '-1rem',
                  }}
                >
                  <AnimatePresence>
                    {
                      isOver &&
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        style={{ background: 'pink', position: 'initial' }}
                        className='drop-hover-new'>
                      </motion.div>
                    }
                  </AnimatePresence>
                </div>
                : null
            )
          }
        }
      </DropWrapper>
      }
    </animated.div>
  )
}

/** A thought container with bullet, thought annotation, thought, and subthoughts.
 *
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
 */
const ThoughtContainer = ({
  url,
  expandedContextThought,
  isEditing,
  thoughtsRankedLive,
  item
}) => {
  const { showContexts, thoughtsResolved, thoughtsRanked, contextChain, expanded, isCursor, viewInfo, childrenLength, isCursorParent, hasChildren, parentKey } = item

  const isContextViewActive = viewInfo.context.active
  const hasContext = viewInfo.context.hasContext

  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  const rank = headRank(thoughtsRanked)

  const isThoughtDivider = isDivider(headValue(thoughtsRanked))

  const thoughtsLive = pathToContext(thoughtsRankedLive)

  return (
    <DropWrapper drop={() => {
      console.log('drop')
    }}>{
        ({ isOver, drop }) => {
          return (
            <motion.div
              ref={drop}
              layout
              style={{
                padding: '0.3rem',
                paddingBottom: expanded && isContextViewActive && hasContext ? '0' : '0.3rem',
              }}
              className='thought-new'>
              <AnimatePresence>{
                isOver &&
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ transform: 'translateX(0.1rem)', width: 'calc(100% - 0.1rem)' }}
                  className='drop-hover-new'>
                </motion.div>
              }
              </AnimatePresence>
              <motion.div layout style={{
                display: 'flex'
              }}>
                <DragWrapper
                  canDrag={() => canDrag({ thoughtsRankedLive, isCursorParent, isDraggable: true })} // TO-DO: add isDraggable logic here
                  beginDrag={() => beginDrag({ thoughtsRankedLive })}
                  endDrag={endDrag}
                >
                  {
                    ({ isDragging, drag }) => <Bullet innerRef={drag} expanded={expanded} isActive={isCursor} isDragActive={isDragging} hasChildren={hasChildren} hide={isThoughtDivider}/>
                  }
                </DragWrapper>
                <div style={{ flex: 1, display: 'flex' }}>
                  <ThoughtAnnotation
                    contextChain={contextChain}
                    homeContext={homeContext}
                    minContexts={2}
                    showContextBreadcrumbs={showContextBreadcrumbs}
                    showContexts={showContexts}
                    style={{}}
                    thoughtsRanked={thoughtsRanked}
                    url={url}
                  />
                  <div style={{
                    flex: 1
                  }}>
                    {
                      homeContext ? <HomeLink />
                      : isThoughtDivider ? <DividerNew thoughtsRanked={thoughtsRanked} isActive={isCursor} parentKey={parentKey}/>
                      : <Editable
                        contextChain={contextChain}
                        cursorOffset={0}
                        disabled={!isDocumentEditable()}
                        isEditing={isEditing}
                        rank={rank}
                        showContexts={showContexts}
                        style={{
                          width: '100%',
                          wordWrap: 'break-word',
                          wordBreak: 'break-all',
                        }}
                        thoughtsRanked={thoughtsRanked}
                        onKeyDownAction={() => {}}/>
                    }
                  </div>
                </div>
              </motion.div>
              <div style={{ marginLeft: '1.36rem' }}>
                <Note context={thoughtsLive} thoughtsRanked={thoughtsRankedLive} contextChain={contextChain}/>
              </div>
              <AnimatePresence>
                {expanded && isContextViewActive &&
          (
            hasContext ?
              <motion.div
                layout
                className="children-subheading text-note text-small"
                style={{ margin: '0', marginLeft: '1.5rem', marginTop: '0.35rem', padding: 0 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={framerTransition}
              >
                <em>Contexts:</em>
              </motion.div> : <NoChildren thoughtsRanked={thoughtsResolved} childrenLength={childrenLength} allowSingleContext={false}/>
          )
                }
              </AnimatePresence>
            </motion.div>
          )
        }
      }
    </DropWrapper>
  )
}

const Thought = connect(mapStateToProps)(ThoughtContainer)

export default ThoughtWrapper
