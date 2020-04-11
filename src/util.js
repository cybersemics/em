// all util functions were moved into their own modules
// this file was created to allow an iterative migration to importing them directly

import { addContext } from './util/addContext'
import { addThought } from './util/addThought'
import { ancestors } from './util/ancestors'
import { asyncFocus } from './util/asyncFocus'
import { chain } from './util/chain'
import { checkIfPathShareSubcontext } from './util/checkIfPathShareSubcontext'
import { compareByRank } from './util/compareByRank'
import { compareThought } from './util/compareThought'
import { componentToThought } from './util/componentToThought'
import { conjunction } from './util/conjunction'
import { contextChainToPath } from './util/contextChainToPath'
import { contextOf } from './util/contextOf'
import { dataIntegrityCheck } from './util/dataIntegrityCheck'
import { decodeCharacterEntities } from './util/decodeCharacterEntities'
// import { decodeThoughtsUrl } from './util/decodeThoughtsUrl'
import { deleteThought } from './util/deleteThought'
import { download } from './util/download'
import { editableNode } from './util/editableNode'
import { ellipsize } from './util/ellipsize'
import { ellipsizeUrl } from './util/ellipsizeUrl'
import { equalArrays } from './util/equalArrays'
import { equalPath } from './util/equalPath'
import { equalThoughtRanked } from './util/equalThoughtRanked'
import { equalThoughtSorted } from './util/equalThoughtSorted'
import { escapeRegExp } from './util/escapeRegExp'
import { escapeSelector } from './util/escapeSelector'
// import { expandThoughts } from './util/expandThoughts'
// import { exportContext } from './util/exportContext'
import { excludeMetaThoughts } from './util/excludeMetaThoughts'
import { flatMap } from './util/flatMap'
import { flatten } from './util/flatten'
import { formatNumber } from './util/formatNumber'
import { getChildPath } from './util/getChildPath'
import { hashContext } from './util/hashContext'
import { hashThought } from './util/hashThought'
import { head } from './util/head'
import { headRank } from './util/headRank'
import { headValue } from './util/headValue'
import { importText } from './util/importText'
import { initEvents } from './util/initEvents'
import { initFirebase } from './util/initFirebase'
import { initialState } from './util/initialState'
import { isDescendant } from './util/isDescendant'
import { isDivider } from './util/isDivider'
import { isElementHiddenByAutoFocus } from './util/isElementHiddenByAutoFocus'
import { isElementInViewport } from './util/isElementInViewport'
import { isFunction } from './util/isFunction'
import { isHTML } from './util/isHTML'
import { isRoot } from './util/isRoot'
import { isEM } from './util/isEM'
import { isTutorial } from './util/isTutorial'
import { isURL } from './util/isURL'
import { joinConjunction } from './util/joinConjunction'
import { lastThoughtsFromContextChain } from './util/lastThoughtsFromContextChain'
import { loadLocalState } from './util/loadLocalState'
import { login } from './util/login'
import { logout } from './util/logout'
import { makeCompareByProp } from './util/makeCompareByProp'
import { modalCleanup } from './util/modalCleanup'
import { moveThought } from './util/moveThought'
import { nextThoughtElement } from './util/nextThoughtElement'
import { nextSibling } from './util/nextSibling'
import { notFalse } from './util/notFalse'
import { notNull } from './util/notNull'
import { oppositeDirection } from './util/oppositeDirection'
import { pathToContext } from './util/pathToContext'
import { parseJsonSafe } from './util/parseJsonSafe'
import { perma } from './util/perma'
import { prevThoughtElement } from './util/prevThoughtElement'
import { prevSibling } from './util/prevSibling'
import { rankThoughtsFirstMatch } from './util/rankThoughtsFirstMatch'
import { rankThoughtsSequential } from './util/rankThoughtsSequential'
import { reduceObj } from './util/reduceObj'
import { regExpEscapeSelector } from './util/regExpEscapeSelector'
import { removeContext } from './util/removeContext'
import { removeDuplicatedContext } from './util/removeDuplicatedContext'
import { restoreCursorBeforeSearch } from './util/restoreCursorBeforeSearch'
import { rootedContextOf } from './util/rootedContextOf'
import { rotateClockwise } from './util/rotateClockwise'
import { scrollIntoViewIfNeeded } from './util/scrollIntoViewIfNeeded'
import { selectNextEditable } from './util/selectNextEditable'
import { selectPrevEditable } from './util/selectPrevEditable'
import { setSelection } from './util/setSelection'
import { sort } from './util/sort'
import { spellNumber } from './util/spellNumber'
import { splice } from './util/splice'
import { splitChain } from './util/splitChain'
import { strip } from './util/strip'
import { stripPunctuation } from './util/stripPunctuation'
import { subsetThoughts } from './util/subsetThoughts'
import { subtree } from './util/subtree'
import { meta } from './util/meta'
import { sumSubthoughtsLength } from './util/sumSubthoughtsLength'
import { sync } from './util/sync'
import { syncRemote } from './util/syncRemote'
import { thoughtsEditingFromChain } from './util/thoughtsEditingFromChain'
import { timeDifference } from './util/timeDifference'
import { timestamp } from './util/timestamp'
import { unroot } from './util/unroot'
import { updateUrlHistory } from './util/updateUrlHistory'
import { userAuthenticated } from './util/userAuthenticated'
import { pathToIndex } from './util/pathToIndex'

export {
  addContext,
  addThought,
  ancestors,
  asyncFocus,
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
  // decodeThoughtsUrl,
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
  // exportContext,
  // expandThoughts,
  excludeMetaThoughts,
  flatMap,
  flatten,
  formatNumber,
  getChildPath,
  hashContext,
  hashThought,
  head,
  headRank,
  headValue,
  importText,
  initEvents,
  initFirebase,
  initialState,
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
