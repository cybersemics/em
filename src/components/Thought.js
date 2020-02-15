import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { DragSource, DropTarget } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { isMobile } from '../browser.js'
import { store } from '../store.js'
import globals from '../globals.js'
import expandContextThought from '../action-creators/expandContextThought.js'

// components
import { Bullet } from './Bullet.js'
import { Code } from './Code.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'
import { Divider } from './Divider.js'
import { Editable } from './Editable.js'
import { HomeLink } from './HomeLink.js'
import { Subthoughts } from './Subthoughts.js'
import { Superscript } from './Superscript.js'
import { ThoughtAnnotation } from './ThoughtAnnotation.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants.js'

// util
import {
  autoProse,
  chain,
  contextOf,
  equalPath,
  getThoughtsRanked,
  getNextRank,
  getRankBefore,
  getThought,
  hashContext,
  head,
  headValue,
  isBefore,
  isDivider,
  isRoot,
  isURL,
  perma,
  restoreSelection,
  rootedContextOf,
  subsetThoughts,
  pathToContext,
  unroot,
} from '../util.js'

/** A recursive child element that consists of a <li> containing a <div> and <ul>
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
*/
export const Thought = connect(({ cursor, cursorBeforeEdit, expanded, expandedContextThought, codeView, proseViews = {}, contexts }, props) => {

  // <Subthought> connect

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  // check if the cursor is editing an thought directly
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(props.thoughtsRanked).concat(head(props.showContexts ? contextOf(cursor) : cursor))
    : props.thoughtsRanked

  const encodedLive = hashContext(thoughtsRankedLive)

  return {
    cursor,
    isEditing,
    expanded: expanded[hashContext(thoughtsResolved)],
    thoughtsRankedLive,
    expandedContextThought,
    isCodeView: cursor && equalPath(codeView, props.thoughtsRanked),
    isProseView: proseViews[encodedLive],
    view: contexts[encodedLive] && contexts[encodedLive].view
  }
})(DragSource('thought',
  // spec (options)
  {
    // do not allow dragging before first touch
    // a false positive occurs when the first touch should be a scroll
    canDrag: () => {
      return !isMobile || globals.touched
    },
    beginDrag: props => {

      store.dispatch({ type: 'dragInProgress', value: true })

      // disable hold-and-select on mobile
      if (isMobile) {
        setTimeout(() => {
          document.getSelection().removeAllRanges()
        })
      }
      return { thoughtsRanked: props.thoughtsRankedLive }
    },
    endDrag: () => {
      setTimeout(() => {
        // re-enable hold-and-select on mobile
        if (isMobile) {
          document.getSelection().removeAllRanges()
        }
        // reset dragInProgress after a delay to prevent cursor from moving
        store.dispatch({ type: 'dragInProgress', value: false })
      })
    }
  },
  // collect (props)
  (connect, monitor) => ({
    dragSource: connect.dragSource(),
    dragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  })
)(DropTarget('thought',
  // <Subthought> spec (options)
  {
    canDrop: (props, monitor) => {

      const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
      const thoughtsTo = props.thoughtsRankedLive
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - thoughtsTo.length : 0
      const isHidden = distance >= 2
      const isSelf = equalPath(thoughtsTo, thoughtsFrom)
      const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom) && !isSelf

      // do not drop on descendants (exclusive) or thoughts hidden by autofocus
      // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
      return !isHidden && !isDescendant
    },
    drop: (props, monitor, component) => {

      // no bubbling
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

      const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
      const thoughtsTo = props.thoughtsRankedLive

      // drop on itself or after itself is a noop
      if (!equalPath(thoughtsFrom, thoughtsTo) && !isBefore(thoughtsFrom, thoughtsTo)) {

        const newPath = unroot(contextOf(thoughtsTo)).concat({
          value: headValue(thoughtsFrom),
          rank: getRankBefore(thoughtsTo)
        })

        store.dispatch(props.showContexts
          ? {
            type: 'newThoughtSubmit',
            value: headValue(thoughtsTo),
            context: pathToContext(thoughtsFrom),
            rank: getNextRank(thoughtsFrom)
          }
          : {
            type: 'existingThoughtMove',
            oldPath: thoughtsFrom,
            newPath
          }
        )
      }
    }
  },
  // collect (props)
  (connect, monitor) => ({
    dropTarget: connect.dropTarget(),
    isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
  })
)(({ cursor = [], isEditing, expanded, expandedContextThought, isCodeView, isProseView, view, thoughtsRankedLive, thoughtsRanked, rank, contextChain, childrenForced, showContexts, depth = 0, count = 0, isDragging, isHovering, dragSource, dragPreview, dropTarget, allowSingleContext, dispatch }) => {

  // <Subthought> render

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, thoughtsRanked)
    : unroot(thoughtsRanked)

  const value = headValue(thoughtsRankedLive)
  const children = childrenForced || getThoughtsRanked(thoughtsRankedLive)

  // link URL
  const url = isURL(value) ? value :
    // if the only subthought is a url and the thought is not expanded, link the thought
    !expanded && children.length === 1 && children[0].value && isURL(children[0].value) && (!cursor || !equalPath(thoughtsRankedLive, contextOf(cursor))) ? children[0].value :
    null

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Subthoughts> render
  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked)) && getThoughtsRanked(cursor).length === 0
    // parent
    : equalPath(contextOf(cursor || []), chain(contextChain, thoughtsRanked))

  const isCursorGrandparent =
    equalPath(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked))

  const thought = getThought(value)

  // in the Context View, perform a data integrity check to confirm that the thought is in thoughtIndex
  const contextThought = showContexts && getThought(headValue(contextOf(thoughtsRanked)))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  return thought ? dropTarget(dragSource(<li className={classNames({
    child: true,
    // if editing and expansion is suppressed, mark as a leaf so that bullet does not show expanded
    // this is a bit of a hack since the bullet transform checks leaf instead of expanded
    leaf: children.length === 0 || (isEditing && globals.suppressExpansion),
    'has-only-child': children.length === 1,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    'code-view': isCodeView,
    dragging: isDragging,
    'show-contexts': showContexts,
    // prose view will automatically be enabled if there enough characters in at least one of the thoughts within a context
    // isProseView may be undefined or false; allow false to override autoprose
    prose: isProseView != null ? isProseView : autoProse(thoughtsRankedLive, null, null, { childrenForced }),
    'table-view': view === 'table',
    'child-divider': isDivider(thought.value),
    expanded
  })} ref={el => {

    if (el) {
      dragPreview(getEmptyImage())
    }

    if (el && !isMobile && isEditing) {
      // must delay document.getSelection() until after render has completed
      setTimeout(() => {
        const editable = perma(() => el.querySelector('.editable'))
        if (!document.getSelection().focusNode && editable()) {
          // select the Editable
          editable().focus()
        }
      })
    }

  }}>
    <div className='thought-container'>
      <Bullet thoughtsResolved={thoughtsResolved} leaf={children.length === 0} glyph={showContexts && !contextThought ? '✕' : null} onClick={e => {
          if (!isEditing || children.length === 0) {
            restoreSelection(thoughtsRanked, { offset: 0 })
            e.stopPropagation()
          }
        }} />
      <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>

      <ThoughtAnnotation thoughtsRanked={thoughtsRanked} showContexts={showContexts} showContextBreadcrumbs={showContextBreadcrumbs} contextChain={contextChain} homeContext={homeContext} minContexts={allowSingleContext ? 0 : 2} url={url} />

      <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

        <span className='bullet-cursor-overlay'>•</span>

        {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} />
          : showContexts && thoughtsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
            expandContextThought(thoughtsRanked)
          }}>... </a></span>
          : null}

        {homeContext ? <HomeLink/>
          : isDivider(headValue(thoughtsRanked)) ? <Divider thoughtsRanked={thoughtsRanked} />
          // cannot use thoughtsRankedLive here else Editable gets re-rendered during editing
          : <Editable isEditing={isEditing} thoughtsRanked={thoughtsRanked} rank={rank} contextChain={contextChain} showContexts={showContexts} />}

        <Superscript thoughtsRanked={thoughtsRanked} showContexts={showContexts} contextChain={contextChain} superscript={false} />
      </div>
    </div>

    {isCodeView ? <Code thoughtsRanked={thoughtsRanked} /> : null}

    { /* Recursive Subthoughts */ }
    <Subthoughts
      thoughtsRanked={thoughtsRanked}
      childrenForced={childrenForced}
      count={count}
      depth={depth}
      contextChain={contextChain}
      allowSingleContext={allowSingleContext}
      showContexts={allowSingleContext}
    />
  </li>)) : null
})))
