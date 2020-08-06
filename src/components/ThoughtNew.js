import React from 'react'

import { connect } from 'react-redux'
// import { store } from '../store'
import globals from '../globals'
import assert from 'assert'
// import randomColor from 'randomcolor'

// components
import ThoughtAnnotation from './ThoughtAnnotation'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants'

import { shortcutById } from '../shortcuts'

// util
import {
  clearSelection,
  contextOf,
  equalArrays,
  equalPath,
  head,
  headRank,
  headValue,
  isDivider,
  isDocumentEditable,
  isEM,
  isRoot,
  isURL,
  pathToContext,
  publishMode,
  rootedContextOf,
  subsetThoughts,
  unroot,
} from '../util'

// selectors
import {
  attribute,
  chain,
  getNextRank,
  getRankBefore,
  getSortPreference,
  getThought,
  getThoughtsRanked,
  hasChild,
  isBefore,
} from '../selectors'

import { animated } from 'react-spring'
import { AnimatePresence, AnimateSharedLayout, motion } from 'framer-motion'
import { isMobile } from '../browser'
import Editable from './Editable'
import DividerNew from './DividerNew'
import HomeLink from './HomeLink'
import Note from './Note'
import { DragWrapper, DropWrapper } from './DragAndDrop'

import { store } from '../store'
import classNames from 'classnames'
import Bullet from './BulletNew'
import NoChildren from './NoChildren'
import DropEnd from './DropEnd'

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

const framerTransition = { duration: 0.1 }

// width occupied by bullet on left handside of thought in rems.
// const WIDTH_OCCUPIED_BY_BULLET = 1.56

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

/** Returns true if a thought can be dropped in this context. Dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target. */
const canDropIntoChildren = (props, monitor) => {

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked
  const cursor = store.getState().cursor
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  // there is no self thought to check since this is <Subthoughts>
  const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom)
  const divider = isDivider(headValue(thoughtsTo))

  // do not drop on descendants or thoughts hidden by autofocus
  return !isHidden && !isDescendant && !divider
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropIntoChildren = (props, monitor) => {

  const state = store.getState()

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRanked

  const newPath = unroot(thoughtsTo).concat({
    value: headValue(thoughtsFrom),
    rank: getNextRank(state, pathToContext(thoughtsTo))
  })

  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(pathToContext(thoughtsFrom))
  const newContext = rootedContextOf(pathToContext(newPath))
  const sameContext = equalArrays(oldContext, newContext)

  // cannot drop on itself
  if (equalPath(thoughtsFrom, newPath)) return

  // cannot move root or em context or target is divider
  if (isDivider(headValue(thoughtsTo)) || (isRootOrEM && !sameContext)) {
    store.dispatch({ type: 'error', value: `Cannot move the ${isEM(thoughtsFrom) ? 'em' : 'home'} context to another context.` })
    return
  }

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, thoughtsFrom)
    }
    : {
      type: 'existingThoughtMove',
      oldPath: thoughtsFrom,
      newPath
    }
  )

  // alert user of move to another context
  if (!sameContext) {

    // // wait until after MultiGesture has cleared the error so this alert does no get cleared
    // setTimeout(() => {
    //   const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
    //   const alertTo = isRoot(newContext)
    //     ? 'home'
    //     : '"' + ellipsize(headValue(thoughtsTo)) + '"'

    //   alert(`${alertFrom} moved to ${alertTo} context.`)
    //   clearTimeout(globals.errorTimer)
    //   // @ts-ignore
    //   globals.errorTimer = window.setTimeout(() => alert(null), 5000)
    // }, 100)
  }
}

/**********************************************************************
 * Components
 **********************************************************************/

/** Drop end for child context and for next sibling for the last child in the context. */
const DropEndBelow = ({ isLastChild, expanded, showContext, thoughtsRanked, dropEndObject }) => {

  const hasDropEnd = dropEndObject && dropEndObject.length > 0

  return (
    <div style={{ position: 'relative' }}>
      {/*
        Drop end for sibling after this node.
        - a
        - b
        <--- Drop End --->
      */}
      { isLastChild && !expanded &&
      <DropWrapper>
        {
          ({ isDragging, isOver, drop }) => {
            return isDragging ?
              <DropEnd
                innerRef={drop}
                style={{
                  transform: 'translateX(0.4rem)',
                  height: hasDropEnd ? '0.7rem' : '1.2rem',
                  width: 'calc(100% - 0.4rem)',
                  bottom: hasDropEnd ? `-0.2rem` : '-1rem',
                }}
                color='yellow'
                showIndicator={isOver}
              />
              : null
          }
        }
      </DropWrapper>
      }
      {
        dropEndObject && dropEndObject.map(({ key, thoughtsRanked, showContexts, xOffset }, index) => {
          return (
            <div key={key} style={{ height: '0.15rem' }}>
              <DropWrapper
                canDrop={(item, monitor) => canDropIntoChildren({ thoughtsRanked }, monitor)}
                onDrop={(item, monitor) => dropIntoChildren({ thoughtsRanked, showContext }, monitor)}
              >
                {
                  ({ isDragging, isOver, drop }) => {
                    return isDragging ?
                      <DropEnd
                        innerRef={drop}
                        style={{
                          transform: `translateX(${xOffset + 0.7}rem) translateY(${(index + 1) * 0.3}rem)`,
                          height: '0.5rem',
                          width: 'calc(100% - 4rem)',
                        }}
                        color={'blue'}
                        showIndicator={isOver}
                      />
                      : null
                  }
                }
              </DropWrapper>
            </div>
          )
        })
      }
      {/*
        Drop End for children.
        - a
          - <--- Drop End --->
      */}
      { !expanded && <DropWrapper
        canDrop={(item, monitor) => canDropIntoChildren({ thoughtsRanked }, monitor)}
        onDrop={(item, monitor) => dropIntoChildren({ thoughtsRanked, showContext }, monitor)}
      >
        {
          ({ isDragging, isOver, drop }) => {
            return isDragging ?
              <DropEnd
                innerRef={drop}
                style={{
                  transform: 'translateX(4rem)',
                  height: '1.4rem',
                  width: 'calc(100% - 4rem)',
                  bottom: hasDropEnd ? '-0.9rem' : '-1rem',
                }}
                color='red'
                showIndicator={isOver}
              />
              : null
          }
        }
      </DropWrapper>
      }
    </div>
  )
}

/** Node Component. */
const ThoughtWrapper = ({ measureBind, innerDivRef, mainDivStyle, innerDivStyle, wrapperStyle, parentKey, item }) => {
  const { isLastChild, expanded, showContext } = item
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
      <DropEndBelow expanded={expanded} isLastChild={isLastChild} thoughtsRanked={item.thoughtsRanked} showContext={showContext} dropEndObject={item.dropEndObject}/>
    </animated.div>
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const canDropAtTop = (props, monitor) => {

  const state = store.getState()
  const { cursor } = state
  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
  const thoughtsTo = props.thoughtsRankedLive
  const thoughts = pathToContext(props.thoughtsRankedLive)
  const context = contextOf(thoughts)
  const isSorted = getSortPreference(state, context).includes('Alphabetical')
  const distance = cursor ? cursor.length - thoughtsTo.length : 0
  const isHidden = distance >= 2
  const isSelf = equalPath(thoughtsTo, thoughtsFrom)
  const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom) && !isSelf
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // do not drop on descendants (exclusive) or thoughts hidden by autofocus
  // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
  return !isHidden && !isDescendant && (!isSorted || !sameContext)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const dropAtTop = (props, monitor) => {

  // no bubbling
  if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

  const state = store.getState()

  const { thoughtsRanked: thoughtsFrom } = monitor.getItem()

  const thoughtsTo = props.thoughtsRankedLive
  const isRootOrEM = isRoot(thoughtsFrom) || isEM(thoughtsFrom)
  const oldContext = rootedContextOf(thoughtsFrom)
  const newContext = rootedContextOf(thoughtsTo)
  const sameContext = equalArrays(oldContext, newContext)

  // cannot move root or em context
  if (isRootOrEM && !sameContext) {
    store.dispatch({ type: 'error', value: `Cannot move the ${isRoot(thoughtsFrom) ? 'home' : 'em'} context to another context.` })
    return
  }

  // drop on itself or after itself is a noop
  if (equalPath(thoughtsFrom, thoughtsTo) || isBefore(state, thoughtsFrom, thoughtsTo)) return

  const newPath = unroot(contextOf(thoughtsTo)).concat({
    value: headValue(thoughtsFrom),
    rank: getRankBefore(state, thoughtsTo)
  })

  store.dispatch(props.showContexts
    ? {
      type: 'newThoughtSubmit',
      value: headValue(thoughtsTo),
      context: pathToContext(thoughtsFrom),
      rank: getNextRank(state, thoughtsFrom)
    }
    : {
      type: 'existingThoughtMove',
      oldPath: thoughtsFrom,
      newPath
    }
  )

  // alert user of move to another context
  if (!sameContext) {
    // TO-DO: Getting same context alert without being a same context

    // // wait until after MultiGesture has cleared the error so this alert does not get cleared
    // setTimeout(() => {
    //   const alertFrom = '"' + ellipsize(headValue(thoughtsFrom)) + '"'
    //   const alertTo = isRoot(newContext)
    //     ? 'home'
    //     : '"' + ellipsize(headValue(contextOf(thoughtsTo))) + '"'

    //   alert(`${alertFrom} moved to ${alertTo} context.`)
    //   clearTimeout(globals.errorTimer)
    //   // @ts-ignore
    //   globals.errorTimer = window.setTimeout(() => alert(null), 5000)
    // }, 100)
  }
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
    <DropWrapper canDrop={(item, monitor) => canDropAtTop({ thoughtsRankedLive }, monitor)} onDrop={(item, monitor) => dropAtTop({ thoughtsRankedLive, showContexts }, monitor)}>{
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
                  ({ isOver, drag }) => <Bullet innerRef={drag} expanded={expanded} isActive={isCursor} isDragActive={isOver} hasChildren={hasChildren} hide={isThoughtDivider}/>
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
