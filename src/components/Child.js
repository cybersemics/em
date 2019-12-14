import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { DragSource, DropTarget } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { isMobile } from '../browser.js'
import { store } from '../store.js'
import globals from '../globals.js'

// components
import { Bullet } from './Bullet.js'
import { Children } from './Children.js'
import { Code } from './Code.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'
import { Editable } from './Editable.js'
import { HomeLink } from './HomeLink.js'
import { Superscript } from './Superscript.js'
import { ThoughtAnnotation } from './ThoughtAnnotation.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants.js'

// util
import {
  chain,
  hashContext,
  equalThoughtsRanked,
  getChildrenWithRank,
  getNextRank,
  getRankBefore,
  getThought,
  contextOf,
  isBefore,
  isRoot,
  perma,
  restoreSelection,
  rootedContextOf,
  headKey,
  head,
  subsetThoughts,
  unrank,
  unroot,
  isURL,
} from '../util.js'

/** A recursive child element that consists of a <li> containing a <div> and <ul>
  @param allowSingleContext  Pass through to Children since the SearchChildren component does not have direct access to the Children of the Children of the search. Default: false.
*/
export const Child = connect(({ cursor, cursorBeforeEdit, expanded, expandedContextThought, codeView }, props) => {

  // <Child> connect

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  // check if the cursor is editing an thought directly
  const isEditing = equalThoughtsRanked(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(props.thoughtsRanked).concat(head(props.showContexts ? contextOf(cursor) : cursor))
    : props.thoughtsRanked
  return {
    cursor,
    isEditing,
    expanded: expanded[hashContext(unrank(thoughtsResolved))],
    thoughtsRankedLive,
    expandedContextThought,
    isCodeView: cursor && equalThoughtsRanked(codeView, props.thoughtsRanked)
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
  // <Child> spec (options)
  {
    canDrop: (props, monitor) => {

      const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
      const thoughtsTo = props.thoughtsRankedLive
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - thoughtsTo.length : 0
      const isHidden = distance >= 2
      const isSelf = equalThoughtsRanked(thoughtsTo, thoughtsFrom)
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
      if (!equalThoughtsRanked(thoughtsFrom, thoughtsTo) && !isBefore(thoughtsFrom, thoughtsTo)) {

        const newThoughtsRanked = unroot(contextOf(thoughtsTo)).concat({
          key: headKey(thoughtsFrom),
          rank: getRankBefore(thoughtsTo)
        })

        store.dispatch(props.showContexts
          ? {
            type: 'newThoughtSubmit',
            value: headKey(thoughtsTo),
            context: unrank(thoughtsFrom),
            rank: getNextRank(thoughtsFrom)
          }
          : {
            type: 'existingThoughtMove',
            oldThoughtsRanked: thoughtsFrom,
            newThoughtsRanked
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
)(({ cursor = [], isEditing, expanded, expandedContextThought, isCodeView, focus, thoughtsRankedLive, thoughtsRanked, rank, contextChain, childrenForced, showContexts, depth = 0, count = 0, isDragging, isHovering, dragSource, dragPreview, dropTarget, allowSingleContext, dispatch }) => {

  // <Child> render

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, thoughtsRanked)
    : unroot(thoughtsRanked)

  const children = childrenForced || getChildrenWithRank(thoughtsRankedLive)

  const isLinkParent = children.length === 1 && children[0].key && isURL(children[0].key)
  const childLink = isLinkParent && children[0].key

  // if rendering as a context and the thought is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Children> render
  const isCursorParent = distance === 2
    // grandparent
    ? equalThoughtsRanked(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked)) && getChildrenWithRank(cursor).length === 0
    // parent
    : equalThoughtsRanked(contextOf(cursor || []), chain(contextChain, thoughtsRanked))

  const isCursorGrandparent =
    equalThoughtsRanked(rootedContextOf(contextOf(cursor || [])), chain(contextChain, thoughtsRanked))

  const thought = getThought(headKey(thoughtsRankedLive))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalThoughtsRanked(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  return thought ? dropTarget(dragSource(<li className={classNames({
    child: true,
    leaf: children.length === 0,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    'code-view': isCodeView,
    dragging: isDragging,
    'show-contexts': showContexts,
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
    <Bullet thoughtsResolved={thoughtsResolved} leaf={children.length === 0} onClick={e => {
        if (!isEditing || children.length === 0) {
          restoreSelection(thoughtsRanked, { offset: 0 })
          e.stopPropagation()
        }
      }} />
    <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>

    <ThoughtAnnotation thoughtsRanked={thoughtsRanked} showContexts={showContexts} showContextBreadcrumbs={showContextBreadcrumbs} contextChain={contextChain} homeContext={homeContext} minContexts={allowSingleContext ? 0 : 2} isLinkParent={isLinkParent} childLink={childLink} />

    <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

      <span className='bullet-cursor-overlay'>•</span>

      {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} />
        : showContexts && thoughtsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
          dispatch({ type: 'expandContextThought', thoughtsRanked })
        }}>... </a></span>
        : null}

      {homeContext
        ? <HomeLink/>
        // cannot use thoughtsRankedLive here else Editable gets re-rendered during editing
        : <Editable focus={focus} thoughtsRanked={thoughtsRanked} rank={rank} contextChain={contextChain} showContexts={showContexts} />}

      <Superscript thoughtsRanked={thoughtsRanked} showContexts={showContexts} contextChain={contextChain} superscript={false} />
    </div>

    {isCodeView ? <Code thoughtsRanked={thoughtsRanked} /> : null}

    { /* Recursive Children */ }
    <Children
      focus={focus}
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
