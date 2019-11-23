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
  encodeItems,
  equalItemsRanked,
  getChildrenWithRank,
  getNextRank,
  getRankBefore,
  getThought,
  intersections,
  isBefore,
  isRoot,
  perma,
  restoreSelection,
  rootedIntersections,
  sigKey,
  signifier,
  subsetItems,
  unrank,
  unroot,
} from '../util.js'

/** A recursive child element that consists of a <li> containing a <div> and <ul>
  @param allowSingleContext  Pass through to Children since the SearchChildren component does not have direct access to the Children of the Children of the search. Default: false.
*/
export const Child = connect(({ cursor, cursorBeforeEdit, expanded, expandedContextItem, codeView }, props) => {

  // <Child> connect

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)

  // check if the cursor path includes the current item
  // check if the cursor is editing an item directly
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing
    ? intersections(props.itemsRanked).concat(signifier(props.showContexts ? intersections(cursor) : cursor))
    : props.itemsRanked

  return {
    cursor,
    isEditing,
    expanded: expanded[encodeItems(unrank(itemsResolved))],
    itemsRankedLive,
    expandedContextItem,
    isCodeView: cursor && equalItemsRanked(codeView, props.itemsRanked)
  }
})(DragSource('item',
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
      return { itemsRanked: props.itemsRankedLive }
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
)(DropTarget('item',
  // <Child> spec (options)
  {
    canDrop: (props, monitor) => {

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRankedLive
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - itemsTo.length : 0
      const isHidden = distance >= 2
      const isSelf = equalItemsRanked(itemsTo, itemsFrom)
      const isDescendant = subsetItems(itemsTo, itemsFrom) && !isSelf

      // do not drop on descendants (exclusive) or items hidden by autofocus
      // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
      return !isHidden && !isDescendant
    },
    drop: (props, monitor, component) => {

      // no bubbling
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRankedLive

      // drop on itself or after itself is a noop
      if (!equalItemsRanked(itemsFrom, itemsTo) && !isBefore(itemsFrom, itemsTo)) {

        const newItemsRanked = unroot(intersections(itemsTo)).concat({
          key: sigKey(itemsFrom),
          rank: getRankBefore(itemsTo)
        })

        store.dispatch(props.showContexts
          ? {
            type: 'newItemSubmit',
            value: sigKey(itemsTo),
            context: unrank(itemsFrom),
            rank: getNextRank(itemsFrom)
          }
          : {
            type: 'existingItemMove',
            oldItemsRanked: itemsFrom,
            newItemsRanked
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
)(({ cursor = [], isEditing, expanded, expandedContextItem, isCodeView, focus, itemsRankedLive, itemsRanked, rank, contextChain, childrenForced, showContexts, depth = 0, count = 0, isDragging, isHovering, dragSource, dragPreview, dropTarget, allowSingleContext, dispatch }) => {

  // <Child> render

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, itemsRanked)
    : unroot(itemsRanked)

  const children = childrenForced || getChildrenWithRank(itemsRankedLive)

  // if rendering as a context and the item is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([signifier(intersections(itemsRanked))])

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Children> render
  const isCursorParent = distance === 2
    // grandparent
    ? equalItemsRanked(rootedIntersections(intersections(cursor || [])), chain(contextChain, itemsRanked)) && getChildrenWithRank(cursor).length === 0
    // parent
    : equalItemsRanked(intersections(cursor || []), chain(contextChain, itemsRanked))

  const isCursorGrandparent =
    equalItemsRanked(rootedIntersections(intersections(cursor || [])), chain(contextChain, itemsRanked))

  const item = getThought(sigKey(itemsRankedLive))

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextItems || equalItemsRanked(itemsRanked, expandedContextItem)) &&
    itemsRanked.length > 2

  return item ? dropTarget(dragSource(<li className={classNames({
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
    <Bullet itemsResolved={itemsResolved} leaf={children.length === 0} onMouseDown={e => {
        if (!isEditing || children.length === 0) {
          restoreSelection(itemsRanked, { offset: 0 })
          e.stopPropagation()
        }
      }} />
    <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>

    <ThoughtAnnotation itemsRanked={itemsRanked} showContexts={showContexts} showContextBreadcrumbs={showContextBreadcrumbs} contextChain={contextChain} homeContext={homeContext} minContexts={allowSingleContext ? 0 : 2} />

    <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

      <span className='bullet-cursor-overlay'>•</span>

      {showContextBreadcrumbs ? <ContextBreadcrumbs itemsRanked={intersections(intersections(itemsRanked))} showContexts={showContexts} />
        : showContexts && itemsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
          dispatch({ type: 'expandContextItem', itemsRanked })
        }}>... </a></span>
        : null}

      {homeContext
        ? <HomeLink/>
        // cannot use itemsRankedLive here else Editable gets re-rendered during editing
        : <Editable focus={focus} itemsRanked={itemsRanked} rank={rank} contextChain={contextChain} showContexts={showContexts} />}

      <Superscript itemsRanked={itemsRanked} showContexts={showContexts} contextChain={contextChain} superscript={false} />
    </div>

    {isCodeView ? <Code itemsRanked={itemsRanked} /> : null}

    { /* Recursive Children */ }
    <Children
      focus={focus}
      itemsRanked={itemsRanked}
      childrenForced={childrenForced}
      count={count}
      depth={depth}
      contextChain={contextChain}
      allowSingleContext={allowSingleContext}
      showContexts={allowSingleContext}
    />
  </li>)) : null
})))
