import React, { useState } from 'react'
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
import { Thought } from './Thought.js'
import { GestureDiagram } from './GestureDiagram.js'

// constants
import {
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
  RANKED_ROOT,
} from '../constants.js'

// util
import {
  attribute,
  chain,
  contextOf,
  equalPath,
  getChildPath,
  getContextsSortedAndRanked,
  getNextRank,
  getThought,
  getThoughtsRanked,
  hashContext,
  head,
  headValue,
  isContextViewActive,
  isFunction,
  isRoot,
  meta,
  pathToContext,
  rankThoughtsSequential,
  subsetThoughts,
  sumSubthoughtsLength,
  unroot,
} from '../util.js'

const parse = require('esprima').parse

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

const PAGINATION_SIZE_DESKTOP = 5
const PAGINATION_SIZE_MOBILE = 20

/*
  @param focus  Needed for Editable to determine where to restore the selection after delete
  @param allowSingleContextParent  Pass through to Subthought since the SearchSubthoughts component does not have direct access. Default: false.
  @param allowSingleContext  Allow showing a single context in context view. Default: false.
*/
export const Subthoughts = connect(({ cursorBeforeEdit, cursor, contextViews, thoughtIndex, dataNonce, showHiddenThoughts }, props) => {

  // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)

  // check if the cursor path includes the current thought
  // check if the cursor is editing an thought directly
  const isEditingPath = subsetThoughts(cursorBeforeEdit, thoughtsResolved)
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)

  const thoughtsResolvedLive = isEditing ? cursor : thoughtsResolved
  const showContexts = props.showContexts || isContextViewActive(thoughtsResolvedLive, { state: store.getState() })
  const showContextsParent = isContextViewActive(contextOf(thoughtsResolvedLive), { state: store.getState() })
  const thoughtsRanked = showContexts && showContextsParent
    ? contextOf(props.thoughtsRanked)
    : props.thoughtsRanked

  // use live thoughts if editing
  // if editing, replace the head with the live value from the cursor
  const thoughtsRankedLive = isEditing && props.contextChain.length === 0
    ? contextOf(props.thoughtsRanked).concat(head(cursor))
    : thoughtsRanked

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  return {
    contextBinding,
    isEditingAncestor: isEditingPath && !isEditing,
    showContexts,
    thoughtsRanked: thoughtsRankedLive,
    dataNonce,
    showHiddenThoughts,
  }
})(
  // dropping at end of list requires different logic since the default drop moves the dragged thought before the drop target
  (DropTarget('thought',
    // <Subthoughts> spec (options)
    {
      canDrop: (props, monitor) => {

        const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
        const thoughtsTo = props.thoughtsRanked
        const cursor = store.getState().cursor
        const distance = cursor ? cursor.length - thoughtsTo.length : 0
        const isHidden = distance >= 2
        // there is no self thought to check since this is <Subthoughts>
        const isDescendant = subsetThoughts(thoughtsTo, thoughtsFrom)

        // do not drop on descendants or thoughts hidden by autofocus
        return !isHidden && !isDescendant
      },
      drop: (props, monitor, component) => {

        // no bubbling
        if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

        const { thoughtsRanked: thoughtsFrom } = monitor.getItem()
        const newPath = unroot(props.thoughtsRanked).concat({
          value: headValue(thoughtsFrom),
          rank: getNextRank(props.thoughtsRanked)
        })

        if (!equalPath(thoughtsFrom, newPath)) {

          store.dispatch(props.showContexts
            ? {
              type: 'newThoughtSubmit',
              value: headValue(props.thoughtsRanked),
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
      isDragInProgress: monitor.getItem(),
      isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
    })
  )(
    ({ contextBinding, dataNonce, isEditingAncestor, thoughtsRanked, contextChain = [], childrenForced, expandable, showContexts, count = 0, depth = 0, dropTarget, isDragInProgress, isHovering, allowSingleContextParent, allowSingleContext, showHiddenThoughts }) => {

      // <Subthoughts> render
      const [page, setPage] = useState(1)

      const { cursor, thoughtIndex } = store.getState()
      const thought = getThought(headValue(thoughtsRanked), 1)
      // If the cursor is a leaf, treat its length as -1 so that the autofocus stays one level zoomed out.
      // This feels more intuitive and stable for moving the cursor in and out of leaves.
      // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
      const cursorDepth = cursor
        ? cursor.length - (getThoughtsRanked(cursor).length === 0 ? 1 : 0)
        : 0
      const distance = cursor ? Math.max(0,
        Math.min(MAX_DISTANCE_FROM_CURSOR, cursorDepth - depth)
      ) : 0

      // resolve thoughts that are part of a context chain (i.e. some parts of thoughts expanded in context view) to match against cursor subset
      const thoughtsResolved = contextChain && contextChain.length > 0
        ? chain(contextChain, thoughtsRanked)
        : unroot(thoughtsRanked)

      let codeResults // eslint-disable-line fp/no-let

      if (thought && thought.code) {

        // ignore parse errors
        let ast // eslint-disable-line fp/no-let
        try {
          ast = parse(thought.code).body[0].expression
        }
        catch (e) {
        }

        try {
          const env = {
            // find: predicate => Object.keys(thoughtIndex).find(key => predicate(getThought(key, thoughtIndex))),
            find: predicate => rankThoughtsSequential(Object.keys(thoughtIndex).filter(predicate)),
            findOne: predicate => Object.keys(thoughtIndex).find(predicate),
            home: () => getThoughtsRanked(RANKED_ROOT),
            thoughtInContext: getThoughtsRanked,
            thought: Object.assign({}, getThought(headValue(thoughtsRanked), thoughtIndex), {
              children: () => getThoughtsRanked(thoughtsRanked)
            })
          }
          codeResults = evaluate(ast, env)

          // validate that each thought is ranked
          if (codeResults && codeResults.length > 0) {
            codeResults.forEach(thought => {
              assert(thought)
              assert.notStrictEqual(thought.value, undefined)
            })
          }
        }
        catch (e) {
          store.dispatch({ type: 'error', value: e.message })
          console.error('Dynamic Context Execution Error', e.message)
          codeResults = null
        }
      }

      const show = depth < MAX_DEPTH && (isRoot(thoughtsRanked) || isEditingAncestor || store.getState().expanded[hashContext(thoughtsResolved)])

      // disable intrathought linking until add, edit, delete, and expansion can be implemented
      // const subthought = perma(() => getSubthoughtUnderSelection(headValue(thoughtsRanked), 3))

      const children = childrenForced ? childrenForced // eslint-disable-line no-unneeded-ternary
        : codeResults && codeResults.length && codeResults[0] && codeResults[0].value ? codeResults
          : showContexts ? getContextsSortedAndRanked(/* subthought() || */headValue(thoughtsRanked))
            : getThoughtsRanked(contextBinding || thoughtsRanked)

      // Ensure that editable newThought is visible.
      const editIndex = (cursor && children) ? children.findIndex(child => {
        const childPath = getChildPath(child, thoughtsRanked, showContexts)
        const isEditingPath = subsetThoughts(cursor, childPath)
        return equalPath(cursor, childPath) || isEditingPath
      }) : 0
      const filteredChildren = children.filter(child => {
        const value = showContexts ? head(child.context) : child.value
        return showHiddenThoughts ||
          (!isFunction(value) && !meta(pathToContext(unroot(thoughtsRanked)).concat(value)).hidden)
      })
      const paginationSize = isMobile ? PAGINATION_SIZE_MOBILE : PAGINATION_SIZE_DESKTOP
      const proposedPageSize = paginationSize * page
      if (editIndex > proposedPageSize - 1) {
        setPage(page + 1)
        return null
      }
      const isPaginated = filteredChildren.length > proposedPageSize
      // expand root, editing path, and contexts previously marked for expansion in setCursor
      return <React.Fragment>

        {contextBinding && showContexts ? <div className='text-note text-small'>(Bound to {pathToContext(contextBinding).join('/')})</div> : null}

        {show && showContexts && !(children.length === 0 && isRoot(thoughtsRanked))
          ? children.length < (allowSingleContext ? 1 : 2) ?

            // No children
            <div className='children-subheading text-note text-small'>

              This thought is not found in any {children.length === 0 ? '' : 'other'} contexts.<br /><br />

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
            </div>

            // "Contexts:"
            : children.length > (showContexts && !allowSingleContext ? 1 : 0) ? <div className='children-subheading text-note text-small' style={{ top: '4px' }}>Context{children.length === 1 ? '' : 's'}:
            </div>

              : null

          : null}

        {children.length > (showContexts && !allowSingleContext ? 1 : 0) && show ? <ul
          // thoughtIndex-thoughts={showContexts ? hashContext(unroot(pathToContext(thoughtsRanked))) : null}
          className={classNames({
            children: true,
            'context-chain': showContexts,
            ['distance-from-cursor-' + distance]: true
          })}
        >
          {filteredChildren
            .map((child, i) => {
              const childPath = getChildPath(child, thoughtsRanked, showContexts)

              const key = childPath.reduce((keyString, path) => keyString + path.value, '')
              const keyPathString = (key.length === 0 ? `empty` : key) + `${child.rank}`

              /* simply using index i as key will result in very sophisticated rerendering when new Empty thoughts are added.
              The main problem is that when a new Thought is added it will get key (index) of the previous thought,
              causing React DOM to think it as old component that needs re-render and thus the new thoughyt won't be able to mount itself as a new component.

              By using reducing childPath to get path string and adding rank to it will generate a unique key for every new thought.
              Using this keyString will help React DOM to properly identify old components and the new one. Thus eliminating sophisticated
              re-renders.
            */

              return child ? <Thought
                key={keyPathString}
                thoughtsRanked={childPath}
                // grandchildren can be manually added in code view
                childrenForced={child.children}
                rank={child.rank}
                showContexts={showContexts}
                contextChain={showContexts ? contextChain.concat([thoughtsRanked]) : contextChain}
                count={count + sumSubthoughtsLength(children)}
                depth={depth + 1}
                allowSingleContext={allowSingleContextParent}
                isPaginated={i >= proposedPageSize}
              /> : null
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
        {isPaginated && show && distance !== 2 && <a className='indent text-note' onClick={() => setPage(page + 1)}>More...</a>}
      </React.Fragment>
    })))
