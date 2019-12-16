// all util functions were moved into their own modules
// this file was created to allow an iterative migration to importing them directly

import { addContext } from './util/addContext.js'
import { addThought } from './util/addThought.js'
import { ancestors } from './util/ancestors.js'
import { asyncFocus } from './util/asyncFocus.js'
import { canShowModal } from './util/canShowModal.js'
import { chain } from './util/chain.js'
import { compareByRank } from './util/compareByRank.js'
import { componentToThought } from './util/componentToThought.js'
import { conjunction } from './util/conjunction.js'
import { contextChainToPath } from './util/contextChainToPath.js'
import { cursorBack } from './util/cursorBack.js'
import { cursorForward } from './util/cursorForward.js'
import { decodeCharacterEntities } from './util/decodeCharacterEntities.js'
import { decodeThoughtsUrl } from './util/decodeThoughtsUrl.js'
import { deleteThought } from './util/deleteThought.js'
import { editableNode } from './util/editableNode.js'
import { hashContext } from './util/hashContext.js'
import { hashContextUrl } from './util/hashContextUrl.js'
import { equalArrays } from './util/equalArrays.js'
import { equalThoughtRanked } from './util/equalThoughtRanked.js'
import { equalPath } from './util/equalPath.js'
import { escapeRegExp } from './util/escapeRegExp.js'
import { escapeSelector } from './util/escapeSelector.js'
import { exists } from './util/exists.js'
import { exit } from './util/exit.js'
import { expandThoughts } from './util/expandThoughts.js'
import { flatMap } from './util/flatMap.js'
import { flatten } from './util/flatten.js'
import { formatNumber } from './util/formatNumber.js'
import { getChildrenWithRank } from './util/getChildrenWithRank.js'
import { getChildrenWithRankDEPRECATED } from './util/getChildrenWithRankDEPRECATED.js'
import { getContexts } from './util/getContexts.js'
import { getContextsSortedAndRanked } from './util/getContextsSortedAndRanked.js'
import { getDescendants } from './util/getDescendants.js'
import { getNextRank } from './util/getNextRank.js'
import { getPrevRank } from './util/getPrevRank.js'
import { getRankAfter } from './util/getRankAfter.js'
import { getRankBefore } from './util/getRankBefore.js'
import { getSubthoughts } from './util/getSubthoughts.js'
import { getThought } from './util/getThought.js'
import { hashThought } from './util/hashThought.js'
import { modalCleanup } from './util/modalCleanup.js'
import { home } from './util/home.js'
import { importText } from './util/importText.js'
import { initEvents } from './util/initEvents.js'
import { initialState } from './util/initialState.js'
import { contextOf } from './util/contextOf.js'
import { isBefore } from './util/isBefore.js'
import { isContextViewActive } from './util/isContextViewActive.js'
import { isElementHiddenByAutoFocus } from './util/isElementHiddenByAutoFocus.js'
import { isElementInViewport } from './util/isElementInViewport.js'
import { isHTML } from './util/isHTML.js'
import { isRoot } from './util/isRoot.js'
import { isTutorial } from './util/isTutorial.js'
import { isURL } from './util/isURL.js'
import { thoughtsEditingFromChain } from './util/thoughtsEditingFromChain.js'
import { joinConjunction } from './util/joinConjunction.js'
import { lastThoughtsFromContextChain } from './util/lastThoughtsFromContextChain.js'
import { loadLocalState } from './util/loadLocalState.js'
import { login } from './util/login.js'
import { logout } from './util/logout.js'
import { makeCompareByProp } from './util/makeCompareByProp.js'
import { moveThought } from './util/moveThought.js'
import { newThought } from './util/newThought.js'
import { nextEditable } from './util/nextEditable.js'
import { nextSibling } from './util/nextSibling.js'
import { nextSiblings } from './util/nextSiblings.js'
import { notFalse } from './util/notFalse.js'
import { notNull } from './util/notNull.js'
import { oppositeDirection } from './util/oppositeDirection.js'
import { perma } from './util/perma.js'
import { prevEditable } from './util/prevEditable.js'
import { prevSibling } from './util/prevSibling.js'
import { rankThoughtsFirstMatch } from './util/rankThoughtsFirstMatch.js'
import { rankThoughtsSequential } from './util/rankThoughtsSequential.js'
import { reduceObj } from './util/reduceObj.js'
import { regExpEscapeSelector } from './util/regExpEscapeSelector.js'
import { removeContext } from './util/removeContext.js'
import { restoreCursorBeforeSearch } from './util/restoreCursorBeforeSearch.js'
import { restoreSelection } from './util/restoreSelection.js'
import { rootedContextOf } from './util/rootedContextOf.js'
import { rotateClockwise } from './util/rotateClockwise.js'
import { scrollIntoViewIfNeeded } from './util/scrollIntoViewIfNeeded.js'
import { selectNextEditable } from './util/selectNextEditable.js'
import { selectPrevEditable } from './util/selectPrevEditable.js'
import { headValue } from './util/headValue.js'
import { head } from './util/head.js'
import { headRank } from './util/headRank.js'
import { spellNumber } from './util/spellNumber.js'
import { splice } from './util/splice.js'
import { splitChain } from './util/splitChain.js'
import { strip } from './util/strip.js'
import { stripPunctuation } from './util/stripPunctuation.js'
import { subsetThoughts } from './util/subsetThoughts.js'
import { sumChildrenLength } from './util/sumChildrenLength.js'
import { sync } from './util/sync.js'
import { syncRemote } from './util/syncRemote.js'
import { timestamp } from './util/timestamp.js'
import { pathToContext } from './util/pathToContext.js'
import { unroot } from './util/unroot.js'
import { updateUrlHistory } from './util/updateUrlHistory.js'
import { userAuthenticated } from './util/userAuthenticated.js'

export {
  addContext,
  addThought,
  ancestors,
  asyncFocus,
  canShowModal,
  chain,
  compareByRank,
  componentToThought,
  conjunction,
  contextChainToPath,
  cursorBack,
  cursorForward,
  decodeCharacterEntities,
  decodeThoughtsUrl,
  deleteThought,
  editableNode,
  hashContext,
  hashContextUrl,
  equalArrays,
  equalThoughtRanked,
  equalPath,
  escapeRegExp,
  escapeSelector,
  exists,
  exit,
  expandThoughts,
  flatMap,
  flatten,
  formatNumber,
  getChildrenWithRank,
  getChildrenWithRankDEPRECATED,
  getContexts,
  getContextsSortedAndRanked,
  getDescendants,
  getNextRank,
  getPrevRank,
  getRankAfter,
  getRankBefore,
  getSubthoughts,
  getThought,
  hashThought,
  modalCleanup,
  home,
  importText,
  initEvents,
  initialState,
  contextOf,
  isBefore,
  isContextViewActive,
  isElementHiddenByAutoFocus,
  isElementInViewport,
  isHTML,
  isRoot,
  isTutorial,
  isURL,
  thoughtsEditingFromChain,
  joinConjunction,
  lastThoughtsFromContextChain,
  loadLocalState,
  login,
  logout,
  makeCompareByProp,
  moveThought,
  newThought,
  nextEditable,
  nextSibling,
  nextSiblings,
  notFalse,
  notNull,
  oppositeDirection,
  perma,
  prevEditable,
  prevSibling,
  rankThoughtsFirstMatch,
  rankThoughtsSequential,
  reduceObj,
  regExpEscapeSelector,
  removeContext,
  restoreCursorBeforeSearch,
  restoreSelection,
  rootedContextOf,
  rotateClockwise,
  scrollIntoViewIfNeeded,
  selectNextEditable,
  selectPrevEditable,
  headValue,
  headRank,
  head,
  spellNumber,
  splice,
  splitChain,
  strip,
  stripPunctuation,
  subsetThoughts,
  sumChildrenLength,
  sync,
  syncRemote,
  timestamp,
  pathToContext,
  unroot,
  updateUrlHistory,
  userAuthenticated,
}
