import React from 'react'
import { connect } from 'react-redux'
import globals from '../globals.js'
import * as AsyncFocus from '../async-focus.js'

// components
import { Bullet } from './Bullet.js'
import { Child } from './Child.js'
import { Children } from './Children.js'
import { Code } from './Code.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'
import { Editable } from './Editable.js'
import { GestureDiagram } from './GestureDiagram.js'
import { Helper } from './Helper.js'
import { HomeLink } from './HomeLink.js'
import { Superscript } from './Superscript.js'
import { ThoughtAnnotation } from './ThoughtAnnotation.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
  RENDER_DELAY,
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
  parse,
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

const asyncFocus = AsyncFocus()

export const NewItem = connect(({ cursor }, props) => {
  const children = getChildrenWithRank(props.contextRanked)
  return {
    cursor,
    show: !children.length || children[children.length - 1].key !== ''
  }
})(({ show, contextRanked, cursor, showContexts, dispatch }) => {

  const context = unrank(contextRanked)
  const depth = unroot(context).length
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR,
      cursor.length - depth - 1
    )
  ) : 0

  return show ? <ul
      style={{ marginTop: 0 }}
      className={'children-new distance-from-cursor-' + distance}
  >
    <li className='child leaf'>
      <span className='bullet' />
      <div className='thought'>
        <a className='placeholder'
          onClick={() => {
            // do not preventDefault or stopPropagation as it prevents cursor

            // do not allow clicks if hidden by autofocus
            if (distance > 0) {
              cursorBack()
              return
            }

            const newRank = getNextRank(contextRanked)

            dispatch({
              type: 'newItemSubmit',
              context,
              addAsContext: showContexts,
              rank: newRank,
              value: ''
            })

            globals.disableOnFocus = true
            asyncFocus.enable()
            setTimeout(() => {
              globals.disableOnFocus = false
              restoreSelection(rankItemsSequential(unroot(context)).concat({ key: '', rank: newRank }))
            }, RENDER_DELAY)

          }}
        >Add a {showContexts ? 'context' : 'thought'}</a>
      </div>
    </li>
  </ul> : null
})

