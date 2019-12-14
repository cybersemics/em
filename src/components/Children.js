import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import assert from 'assert'
import * as evaluate from 'static-eval'
import { DropTarget } from 'react-dnd'
import { store } from '../store.js'
import { isMobile } from '../browser.js'
import { formatKeyboardShortcut, shortcutById } from '../shortcuts.js'
import globals from '../globals.js'

// components
import { Child } from './Child.js'
import { GestureDiagram } from './GestureDiagram.js'

// constants
import {
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  chain,
  encodeItems,
  equalItemsRanked,
  getChildrenWithRank,
  getContextsSortedAndRanked,
  getNextRank,
  getThought,
  hashThought,
  contextOf,
  isContextViewActive,
  isRoot,
  rankItemsSequential,
  rankItemsFirstMatch,
  sigKey,
  signifier,
  subsetItems,
  sumChildrenLength,
  unrank,
  unroot,
} from '../util.js'

const parse = require('esprima').parse

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

/*
  @param focus  Needed for Editable to determine where to restore the selection after delete
  @param allowSingleContextParent  Pass through to Child since the SearchChildren component does not have direct access. Default: false.
  @param allowSingleContext  Allow showing a single context in context view. Default: false.
*/
export const Children = connect(({ contextBindings, cursorBeforeEdit, cursor, contextViews, data, dataNonce }, props) => {

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
  const showContextsParent = isContextViewActive(unrank(contextOf(itemsResolvedLive)), { state: store.getState() })
  const itemsRanked = showContexts && showContextsParent
    ? contextOf(props.itemsRanked)
    : props.itemsRanked

  // use live items if editing
  // if editing, replace the signifier with the live value from the cursor
  const itemsRankedLive = isEditing && props.contextChain.length === 0
    ? contextOf(props.itemsRanked).concat(signifier(cursor))
    : itemsRanked

  return {
    contextBinding: (contextBindings || {})[encodeItems(unrank(itemsRankedLive))],
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
({ contextBinding, dataNonce, isEditingPath, focus, itemsRanked, contextChain = [], childrenForced, expandable, showContexts, count = 0, depth = 0, dropTarget, isDragInProgress, isHovering, allowSingleContextParent, allowSingleContext }) => {

  // <Children> render

  const { contextChildren, cursor, data } = store.getState()
  const item = getThought(sigKey(itemsRanked), 1)
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

  let codeResults // eslint-disable-line fp/no-let

  if (item && item.code) {

    // ignore parse errors
    let ast // eslint-disable-line fp/no-let
    try {
      ast = parse(item.code).body[0].expression
    }
    catch (e) {
    }

    try {
      const env = {
        // find: predicate => Object.keys(data).find(key => predicate(getThought(key, data))),
        find: predicate => rankItemsSequential(Object.keys(data).filter(predicate)),
        findOne: predicate => Object.keys(data).find(predicate),
        home: () => getChildrenWithRank(RANKED_ROOT),
        itemInContext: getChildrenWithRank,
        item: Object.assign({}, getThought(sigKey(itemsRanked), data), {
          children: () => getChildrenWithRank(itemsRanked)
        })
      }
      codeResults = evaluate(ast, env)

      // validate that each item is ranked
      if (codeResults && codeResults.length > 0) {
        codeResults.forEach(item => {
          assert(item)
          assert.notStrictEqual(item.key, undefined)
        })
      }
    }
    catch (e) {
      store.dispatch({ type: 'error', value: e.message })
      console.error('Dynamic Context Execution Error', e.message)
      codeResults = null
    }
  }

  const show = depth < MAX_DEPTH && (isRoot(itemsRanked) || isEditingPath || store.getState().expanded[encodeItems(unrank(itemsResolved))])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = perma(() => getSubthoughtUnderSelection(sigKey(itemsRanked), 3))

  const children = childrenForced ? childrenForced // eslint-disable-line no-unneeded-ternary
    : codeResults && codeResults.length && codeResults[0] && codeResults[0].key ? codeResults
    : showContexts ? getContextsSortedAndRanked(/* subthought() || */sigKey(itemsRanked))
    : getChildrenWithRank(contextBinding || itemsRanked)

  // expand root, editing path, and contexts previously marked for expansion in setCursor
  return <React.Fragment>

    {contextBinding && showContexts ? <div className='text-note text-small'>(Bound to {unrank(contextBinding).join('/')})</div> : null}

    {show && showContexts && !(children.length === 0 && isRoot(itemsRanked))
      ? children.length < (allowSingleContext ? 1 : 2) ?
        <div className='children-subheading text-note text-small'>

          This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.<br/><br/>

          <span>{isMobile
              ? <span>Swipe <GestureDiagram path={subthoughtShortcut.gesture} size='14' color='darkgray' /></span>
              : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboardLabel)}</span>
            } to add "{sigKey(itemsRanked)}" to a new context.
          </span>

          <br/>{allowSingleContext
            ? 'A floating context... how interesting.'
            : <span>{isMobile
              ? <span>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture} size='14' color='darkgray'/* mtach .children-subheading color */ /></span>
              : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard)}</span>
            } to return to the normal view.</span>
          }
        </div>

        : children.length > (showContexts && !allowSingleContext ? 1 : 0) ? <div className='children-subheading text-note text-small' style={{ top: '4px' }}>Context{children.length === 1 ? '' : 's'}:
        </div>
      : null
    : null}

    {children.length > (showContexts && !allowSingleContext ? 1 : 0) && show ? <ul
        // data-items={showContexts ? encodeItems(unroot(unrank(itemsRanked))) : null}
        className={classNames({
          children: true,
          'context-chain': showContexts,
          ['distance-from-cursor-' + distance]: true,
          'editing-path': isEditingPath
        })}
      >
        {children.map((child, i) => {

          // Because the current thought only needs to hash match another thought, we need to use the exact value of the child from the other context
          // child.context SHOULD always be defined when showContexts is true
          const otherChild = (
              showContexts
              && child.context
              // this check should not be needed, but my personal data has some data integrity issues so we have to handle missing contextChildren
              && contextChildren[encodeItems(child.context)]
              && contextChildren[encodeItems(child.context)]
                .find(child => hashThought(child.key) === hashThought(sigKey(itemsRanked)))
            )
            || signifier(itemsRanked)

          // do not render items pending animation
          const childItemsRanked = showContexts
            // replace signifier rank with rank from child when rendering showContexts as children
            // i.e. Where Context > Item, use the Item rank while displaying Context
            ? rankItemsFirstMatch(child.context)
              // override original rank of first item with rank in context
              .map((item, i) => i === 0 ? { key: item.key, rank: child.rank } : item)
              .concat(otherChild)
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
            allowSingleContext={allowSingleContextParent}
          />
        })}
      {dropTarget(<li className={classNames({
        child: true,
        'drop-end': true,
        last: depth === 0
      })} style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none' }}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
      </li>)}
      </ul> : <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none' }}>{dropTarget(<li className={classNames({
          child: true,
          'drop-end': true,
          last: depth === 0
        })}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
      </li>)}</ul>}

    </React.Fragment>
})))
