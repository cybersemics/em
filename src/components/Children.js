import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import assert from 'assert'
import * as evaluate from 'static-eval'
import { DragDropContext, DragSource, DropTarget } from 'react-dnd'
import { store } from '../store.js'
import { clientId, isMac, isMobile } from '../browser.js'
import globals from '../globals.js'
import logo from '../logo-black-inline.png'
import logoDark from '../logo-white-inline.png'
import logoInline from '../logo-black-inline.png'
import logoDarkInline from '../logo-white-inline.png'

// components
import { Bullet } from './Bullet.js'
import { Child } from './Child.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'
import { GestureDiagram } from './GestureDiagram.js'
import { Helper } from './Helper.js'
import { HomeLink } from './HomeLink.js'
import { ThoughtAnnotation } from './ThoughtAnnotation.js'

// constants
import {
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  addContext,
  ancestors,
  animateWelcome,
  canShowHelper,
  chain,
  compareByRank,
  componentToItem,
  conjunction,
  contextChainToItemsRanked,
  cursorBack,
  cursorForward,
  decodeItemsUrl,
  deleteItem,
  disableTutorial,
  editableNode,
  encodeItems,
  encodeItemsUrl,
  equalArrays,
  equalItemRanked,
  equalItemsRanked,
  exists,
  exit,
  expandItems,
  flatMap,
  flatten,
  getContexts,
  getContextsSortedAndRanked,
  getChildrenWithRank,
  getDescendants,
  getNextRank,
  getRankAfter,
  getRankBefore,
  helperCleanup,
  importText,
  intersections,
  isBefore,
  isContextViewActive,
  isElementHiddenByAutoFocus,
  isRoot,
  lastItemsFromContextChain,
  log,
  makeCompareByProp,
  moveItem,
  newItem,
  nextEditable,
  notFalse,
  notNull,
  perma,
  prevEditable,
  prevSibling,
  rankItemsFirstMatch,
  rankItemsSequential,
  removeContext,
  restoreCursorBeforeSearch,
  restoreSelection,
  rootedIntersections,
  selectNextEditable,
  selectPrevEditable,
  sigKey,
  signifier,
  sigRank,
  spellNumber,
  splice,
  splitChain,
  strip,
  stripPunctuation,
  subsetItems,
  sumChildrenLength,
  sync,
  syncOne,
  syncRemote,
  syncRemoteData,
  timestamp,
  translateContentIntoView,
  unrank,
  unroot,
  updateUrlHistory
} from '../util.js'

const parse = require('esprima').parse

/*
  @focus: needed for Editable to determine where to restore the selection after delete
*/
export const Children = connect(({ cursorBeforeEdit, cursor, contextViews, data, dataNonce }, props) => {

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)

  // check if the cursor path includes the current item
  // check if the cursor is editing an item directly
  const isEditingPath = subsetItems(cursorBeforeEdit, itemsResolved)
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)

  const itemsResolvedLive = isEditing ? cursor : itemsResolved
  const showContexts = props.showContexts || isContextViewActive(unrank(itemsResolvedLive), { state: store.getState() })
  const showContextsParent = isContextViewActive(unrank(intersections(itemsResolvedLive)), { state: store.getState() })
  const itemsRanked = showContexts && showContextsParent
    ? intersections(props.itemsRanked)
    : props.itemsRanked

  // use live items if editing
  // if editing, replace the signifier with the live value from the cursor
  const itemsRankedLive = isEditing && props.contextChain.length === 0
    ? intersections(props.itemsRanked).concat(signifier(cursor))
    : itemsRanked

  return {
    isEditingPath,
    showContexts,
    itemsRanked: itemsRankedLive,
    dataNonce
  }
})(
// dropping at end of list requires different logic since the default drop moves the dragged item before the drop target
(DropTarget('item',
  // <Children> spec (options)
  {
    canDrop: (props, monitor) => {

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRanked
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - itemsTo.length : 0
      const isHidden = distance >= 2
      // there is no self item to check since this is <Children>
      const isDescendant = subsetItems(itemsTo, itemsFrom)

      // do not drop on descendants or items hidden by autofocus
      return !isHidden && !isDescendant
    },
    drop: (props, monitor, component) => {

      // no bubbling
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const newItemsRanked = unroot(props.itemsRanked).concat({
        key: sigKey(itemsFrom),
        rank: getNextRank(props.itemsRanked)
      })

      if (!equalItemsRanked(itemsFrom, newItemsRanked)) {

        store.dispatch(props.showContexts
          ? {
            type: 'newItemSubmit',
            value: sigKey(props.itemsRanked),
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
    isDragInProgress: monitor.getItem(),
    isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
  })
)(
({ dataNonce, isEditingPath, focus, itemsRanked, contextChain=[], childrenForced, expandable, showContexts, count=0, depth=0, dropTarget, isDragInProgress, isHovering }) => {

  // <Children> render

  const data = store.getState().data
  const item = data[sigKey(itemsRanked)]
  const cursor = store.getState().cursor
  // If the cursor is a leaf, treat its length as -1 so that the autofocus stays one level zoomed out.
  // This feels more intuitive and stable for moving the cursor in and out of leaves.
  // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
  const cursorDepth = cursor
    ? cursor.length - (getChildrenWithRank(cursor).length === 0 ? 1 : 0)
    : 0
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursorDepth - depth)
  ) : 0

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, itemsRanked)
    : unroot(itemsRanked)

  let codeResults

  if (item && item.code) {

    // ignore parse errors
    let ast
    try {
      ast = parse(item.code).body[0].expression
    }
    catch(e) {
    }

    try {
      const env = {
        // find: predicate => Object.keys(data).find(key => predicate(data[key])),
        find: predicate => rankItemsSequential(Object.keys(data).filter(predicate)),
        findOne: predicate => Object.keys(data).find(predicate),
        home: () => getChildrenWithRank(RANKED_ROOT),
        itemInContext: getChildrenWithRank,
        item: Object.assign({}, data[sigKey(itemsRanked)], {
          children: () => getChildrenWithRank(itemsRanked)
        })
      }
      codeResults = evaluate(ast, env)

      // validate that each item is ranked
      if (codeResults && codeResults.length > 0) {
        codeResults.forEach(item => {
          assert(item)
          assert.notEqual(item.key, undefined)
        })
      }
    }
    catch(e) {
      console.error('Dynamic Context Execution Error', e.message)
      codeResults = null
    }
  }

  const show = depth < MAX_DEPTH && (isRoot(itemsRanked) || isEditingPath || store.getState().expanded[encodeItems(unrank(itemsResolved))])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = perma(() => getSubthoughtUnderSelection(sigKey(itemsRanked), 3))

  const children = childrenForced ? childrenForced
    : codeResults && codeResults.length && codeResults[0] && codeResults[0].key ? codeResults
    : showContexts ? getContextsSortedAndRanked(/*subthought() || */sigKey(itemsRanked))
    : getChildrenWithRank(itemsRanked)

  // expand root, editing path, and contexts previously marked for expansion in setCursor
  return <React.Fragment>
    {show && showContexts ?
      (children.length === 1 ? <div className='children-subheading'>This thought is not found in any other contexts. <br/>{isMobile ? <span>Swipe <GestureDiagram path='ru' size='14' color='darkgray'/* mtach .children-subheading color */ /></span> : 'Type ⌘ + ⇧ + C'} to go back.</div> :
      children.length > 1 ? <div className='children-subheading' style={{ top: '4px' }}>Contexts:</div> : null)
    : null}
    {children.length > (showContexts ? 1 : 0) && show ? <ul
        // data-items={showContexts ? encodeItems(unroot(unrank(itemsRanked))) : null}
        className={classNames({
          children: true,
          'context-chain': showContexts,
          ['distance-from-cursor-' + distance]: true,
          'editing-path': isEditingPath
        })}
      >
        {children.map((child, i) => {
          // do not render items pending animation
          const childItemsRanked = showContexts
            // replace signifier rank with rank from child when rendering showContexts as children
            // i.e. Where Context > Item, use the Item rank while displaying Context
            ? rankItemsFirstMatch(child.context)
              // override original rank of first item with rank in context
              .map((item, i) => i === 0 ? { key: item.key, rank: child.rank } : item)
              .concat(signifier(itemsRanked))
            : unroot(itemsRanked).concat(child)

          return !child || child.animateCharsVisible === 0 ? null : <Child
            key={i}
            focus={focus}
            itemsRanked={childItemsRanked}
            // grandchildren can be manually added in code view
            childrenForced={child.children}
            rank={child.rank}
            showContexts={showContexts}
            contextChain={showContexts ? contextChain.concat([itemsRanked]) : contextChain}
            count={count + sumChildrenLength(children)}
            depth={depth + 1}
          />
        })}
      {dropTarget(<li className={classNames({
        child: true,
        'drop-end': true,
        last: depth===0
      })} style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none'}}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
      </li>)}
      </ul> : <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none'}}>{dropTarget(<li className={classNames({
          child: true,
          'drop-end': true,
          last: depth===0
        })}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
      </li>)}</ul>}

    </React.Fragment>
})))

