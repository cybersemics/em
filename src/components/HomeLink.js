import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { DragDropContext, DragSource, DropTarget } from 'react-dnd'
import { store } from '../store.js'
import globals from '../globals.js'
import logo from '../logo-black-inline.png'
import logoDark from '../logo-white-inline.png'
import logoInline from '../logo-black-inline.png'
import logoDarkInline from '../logo-white-inline.png'

// components
import { Child } from './Child.js'
import { Helper } from './Helper.js'

// constants
import {
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
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

/** A link to the home screen */
export const HomeLink = connect(({ settings, focus, showHelper }) => ({
  dark: settings.dark,
  focus,
  showHelper
}))(({ dark, focus, showHelper, inline, dispatch }) =>
  <span className='home'>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={e => {
      e.preventDefault()
      if (store.getState().search != null) {
        dispatch({ type: 'search', value: null })
        restoreCursorBeforeSearch()
      }
      else {
        dispatch({ type: 'setCursor', itemsRanked: null, cursorHistoryClear: true })
        window.scrollTo(0, 0)
      }
    }}><span role='img' arial-label='home'><img className='logo' src={inline ? (dark ? logoDarkInline : logoInline) : (dark ? logoDark : logo)} alt='em' /></span></a>
    {showHelper === 'home' ? <Helper id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' /> : null}
  </span>
)

