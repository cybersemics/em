import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import globals from '../globals.js'
import { store } from '../store.js'
import { clientId, isMac, isMobile } from '../browser.js'
import * as AsyncFocus from '../async-focus.js'

// components
import ContentEditable from 'react-contenteditable'
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
import { StaticSuperscript } from './StaticSuperscript.js'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
  RENDER_DELAY,
  ROOT_TOKEN,
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

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
export const ThoughtAnnotation = connect(({ cursor, cursorBeforeEdit, focusOffset }, props) => {

  // reerender annotation in realtime when thought is edited
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing
    ? intersections(props.itemsRanked).concat(signifier(props.showContexts ? intersections(cursor) : cursor))
    : props.itemsRanked

  return {
    itemsRanked: itemsRankedLive,
    isEditing,
    focusOffset
  }
})(({ itemsRanked, showContexts, contextChain, homeContext, isEditing, focusOffset }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection
  const key = sigKey(showContexts ? intersections(itemsRanked) : itemsRanked)
  const subthoughts = /*getSubthoughts(key, 3)*/key ? [{
    text: key,
    contexts: getContexts(key)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>
    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === key ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text'>{subthought.text}</span>
          </span>
          {subthought.contexts.length > (subthought.text === key ? 1 : 0)
            ? <StaticSuperscript n={subthought.contexts.length} />
            : null
          }
        </React.Fragment>
      })
    }
  </div>
})

