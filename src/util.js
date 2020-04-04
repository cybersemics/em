// all util functions were moved into their own modules
// this file was created to allow an iterative migration to importing them directly

import { addContext } from './util/addContext.js'
import { addThought } from './util/addThought'
import { ancestors } from './util/ancestors.js'
import { asyncFocus } from './util/asyncFocus.js'
import { attribute } from './util/attribute.js'
import { autoProse } from './util/autoProse.js'
import { canShowModal } from './util/canShowModal.js'
import { chain } from './util/chain.js'
import { checkIfPathShareSubcontext } from './util/checkIfPathShareSubcontext'
import { compareByRank } from './util/compareByRank.js'
import { compareThought } from './util/compareThought'
import { componentToThought } from './util/componentToThought'
import { conjunction } from './util/conjunction.js'
import { contextChainToPath } from './util/contextChainToPath'
import { contextOf } from './util/contextOf'
import { dataIntegrityCheck } from './util/dataIntegrityCheck.js'
import { decodeCharacterEntities } from './util/decodeCharacterEntities.js'
import { decodeThoughtsUrl } from './util/decodeThoughtsUrl'
import { deleteThought } from './util/deleteThought'
import { download } from './util/download.js'
import { editableNode } from './util/editableNode.js'
import { ellipsize } from './util/ellipsize.js'
import { ellipsizeUrl } from './util/ellipsizeUrl.js'
import { equalArrays } from './util/equalArrays'
import { equalPath } from './util/equalPath'
import { equalThoughtRanked } from './util/equalThoughtRanked'
import { equalThoughtSorted } from './util/equalThoughtSorted.js'
import { escapeRegExp } from './util/escapeRegExp.js'
import { escapeSelector } from './util/escapeSelector.js'
import { exists } from './util/exists.js'
import { expandThoughts } from './util/expandThoughts.js'
import { exportContext } from './util/exportContext.js'
import { excludeMetaThoughts } from './util/excludeMetaThoughts.js'
import { flatMap } from './util/flatMap.js'
import { flatten } from './util/flatten.js'
import { formatNumber } from './util/formatNumber.js'
import { getChildPath } from './util/getChildPath.js'
import { getContexts } from './util/getContexts'
import { getContextsSortedAndRanked } from './util/getContextsSortedAndRanked'
import { getDescendants } from './util/getDescendants.js'
import { getNextRank } from './util/getNextRank.js'
import { getNgrams } from './util/getNgrams.js'
import { getPrevRank } from './util/getPrevRank.js'
import { getRankAfter } from './util/getRankAfter.js'
import { getRankBefore } from './util/getRankBefore.js'
import { getSetting } from './util/getSetting.js'
import { getStyle } from './util/getStyle.js'
import { getThought } from './util/getThought'
import { getThoughtAfter } from './util/getThoughtAfter.js'
import { getThoughtBefore } from './util/getThoughtBefore.js'
import { getThoughts } from './util/getThoughts.js'
import { getThoughtsRanked } from './util/getThoughtsRanked'
import { getThoughtsSorted } from './util/getThoughtsSorted'
import { getSortPreference } from './util/getSortPreference.js'
import { hashContext } from './util/hashContext'
import { hashContextUrl } from './util/hashContextUrl'
import { hashThought } from './util/hashThought'
import { head } from './util/head'
import { headRank } from './util/headRank.js'
import { headValue } from './util/headValue'
import { importText } from './util/importText.js'
import { initEvents } from './util/initEvents.js'
import { initFirebase } from './util/initFirebase.js'
import { initialState } from './util/initialState.js'
import { isBefore } from './util/isBefore.js'
import { isContextViewActive } from './util/isContextViewActive'
import { isDescendant } from './util/isDescendant'
import { isDivider } from './util/isDivider'
import { isElementHiddenByAutoFocus } from './util/isElementHiddenByAutoFocus.js'
import { isElementInViewport } from './util/isElementInViewport.js'
import { isFunction } from './util/isFunction.js'
import { isHTML } from './util/isHTML.js'
import { isRoot } from './util/isRoot'
import { isEM } from './util/isEM.js'
import { isTutorial } from './util/isTutorial.js'
import { isURL } from './util/isURL.js'
import { joinConjunction } from './util/joinConjunction.js'
import { lastThoughtsFromContextChain } from './util/lastThoughtsFromContextChain.js'
import { loadLocalState } from './util/loadLocalState.js'
import { login } from './util/login.js'
import { logout } from './util/logout.js'
import { makeCompareByProp } from './util/makeCompareByProp.js'
import { modalCleanup } from './util/modalCleanup.js'
import { moveThought } from './util/moveThought'
import { nextThoughtElement } from './util/nextThoughtElement.js'
import { nextSibling } from './util/nextSibling.js'
import { notFalse } from './util/notFalse.js'
import { notNull } from './util/notNull'
import { oppositeDirection } from './util/oppositeDirection.js'
import { pathToContext } from './util/pathToContext'
import { parseJsonSafe } from './util/parseJsonSafe.js'
import { perma } from './util/perma.js'
import { prevThoughtElement } from './util/prevThoughtElement.js'
import { prevSibling } from './util/prevSibling.js'
import { rankThoughtsFirstMatch } from './util/rankThoughtsFirstMatch.js'
import { rankThoughtsSequential } from './util/rankThoughtsSequential.js'
import { reduceObj } from './util/reduceObj.js'
import { regExpEscapeSelector } from './util/regExpEscapeSelector.js'
import { removeContext } from './util/removeContext.js'
import { removeDuplicatedContext } from './util/removeDuplicatedContext.js'
import { restoreCursorBeforeSearch } from './util/restoreCursorBeforeSearch.js'
import { rootedContextOf } from './util/rootedContextOf.js'
import { rotateClockwise } from './util/rotateClockwise.js'
import { scrollIntoViewIfNeeded } from './util/scrollIntoViewIfNeeded.js'
import { selectNextEditable } from './util/selectNextEditable.js'
import { selectPrevEditable } from './util/selectPrevEditable.js'
import { setSelection } from './util/setSelection.js'
import { sort } from './util/sort.js'
import { spellNumber } from './util/spellNumber.js'
import { splice } from './util/splice.js'
import { splitChain } from './util/splitChain'
import { strip } from './util/strip.js'
import { stripPunctuation } from './util/stripPunctuation.js'
import { subsetThoughts } from './util/subsetThoughts.js'
import { subtree } from './util/subtree.js'
import { meta } from './util/meta.js'
import { sumSubthoughtsLength } from './util/sumSubthoughtsLength.js'
import { sync } from './util/sync.js'
import { syncRemote } from './util/syncRemote.js'
import { thoughtsEditingFromChain } from './util/thoughtsEditingFromChain.js'
import { timeDifference } from './util/timeDifference.js'
import { timestamp } from './util/timestamp'
import { unroot } from './util/unroot'
import { updateUrlHistory } from './util/updateUrlHistory.js'
import { userAuthenticated } from './util/userAuthenticated.js'
import { pathToIndex } from './util/pathToIndex'

export {
  addContext,
  addThought,
  ancestors,
  asyncFocus,
  attribute,
  autoProse,
  canShowModal,
  chain,
  checkIfPathShareSubcontext,
  compareByRank,
  compareThought,
  componentToThought,
  conjunction,
  contextChainToPath,
  contextOf,
  dataIntegrityCheck,
  decodeCharacterEntities,
  decodeThoughtsUrl,
  deleteThought,
  download,
  editableNode,
  ellipsize,
  ellipsizeUrl,
  equalArrays,
  equalPath,
  equalThoughtRanked,
  equalThoughtSorted,
  escapeRegExp,
  escapeSelector,
  exists,
  exportContext,
  expandThoughts,
  excludeMetaThoughts,
  flatMap,
  flatten,
  formatNumber,
  getChildPath,
  getContexts,
  getContextsSortedAndRanked,
  getDescendants,
  getNextRank,
  getNgrams,
  getPrevRank,
  getRankAfter,
  getRankBefore,
  getSetting,
  getStyle,
  getThought,
  getThoughtAfter,
  getThoughtBefore,
  getThoughts,
  getThoughtsRanked,
  getThoughtsSorted,
  getSortPreference,
  hashContext,
  hashContextUrl,
  hashThought,
  head,
  headRank,
  headValue,
  importText,
  initEvents,
  initFirebase,
  initialState,
  isBefore,
  isContextViewActive,
  isDescendant,
  isDivider,
  isElementHiddenByAutoFocus,
  isElementInViewport,
  isFunction,
  isHTML,
  isRoot,
  isEM,
  isTutorial,
  isURL,
  joinConjunction,
  lastThoughtsFromContextChain,
  loadLocalState,
  login,
  logout,
  makeCompareByProp,
  modalCleanup,
  moveThought,
  nextThoughtElement,
  nextSibling,
  notFalse,
  notNull,
  oppositeDirection,
  parseJsonSafe,
  pathToContext,
  perma,
  prevThoughtElement,
  prevSibling,
  rankThoughtsFirstMatch,
  rankThoughtsSequential,
  reduceObj,
  regExpEscapeSelector,
  removeContext,
  removeDuplicatedContext,
  restoreCursorBeforeSearch,
  rootedContextOf,
  rotateClockwise,
  scrollIntoViewIfNeeded,
  selectNextEditable,
  selectPrevEditable,
  setSelection,
  sort,
  spellNumber,
  splice,
  splitChain,
  strip,
  stripPunctuation,
  subsetThoughts,
  subtree,
  meta,
  sumSubthoughtsLength,
  sync,
  syncRemote,
  thoughtsEditingFromChain,
  timeDifference,
  timestamp,
  unroot,
  updateUrlHistory,
  userAuthenticated,
  pathToIndex
}
