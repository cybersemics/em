// reducers
import alert from './alert'
import authenticate from './authenticate'
import clear from './clear'
import codeChange from './codeChange'
import cursorBeforeSearch from './cursorBeforeSearch'
import cursorHistory from './cursorHistory'
import deleteData from './deleteData'
import deleteSubthoughts from './deleteSubthoughts'
import dragInProgress from './dragInProgress'
import editing from './editing'
import error from './error'
import existingThoughtChange from './existingThoughtChange'
import existingThoughtDelete from './existingThoughtDelete'
import existingThoughtMove from './existingThoughtMove'
import expandContextThought from './expandContextThought'
import loadLocalState from './loadLocalState'
import modalComplete from './modalComplete'
import modalRemindMeLater from './modalRemindMeLater'
import newThoughtSubmit from './newThoughtSubmit'
import render from './render'
import search from './search'
import searchLimit from './searchLimit'
import selectionChange from './selectionChange'
import setCursor from './setCursor'
import setFirstSubthought from './setFirstSubthought'
import setResourceCache from './setResourceCache'
import settings from './settings'
import showModal from './showModal'
import status from './status'
import thoughtIndex from './thoughtIndex'
import toggleCodeView from './toggleCodeView'
import toggleContextView from './toggleContextView'
import toggleHiddenThoughts from './toggleHiddenThoughts'
import toggleQueue from './toggleQueue'
import toggleSidebar from './toggleSidebar'
import toggleSplitView from './toggleSplitView'
import updateSplitPosition from './updateSplitPosition'
import tutorial from './tutorial'
import tutorialChoice from './tutorialChoice'
import tutorialStep from './tutorialStep'
import { prioritizeScroll, setToolbarOverlay } from './toolbarOverlay'
import invalidState from './invalidState'
import editingValue from './editingValue'

import { initialState } from '../util'

export default (state = initialState(), action) => {
  return Object.assign({}, state, (({

    alert,
    authenticate,
    clear,
    codeChange,
    cursorBeforeSearch,
    cursorHistory,
    deleteData,
    deleteSubthoughts,
    dragInProgress,
    editing,
    error,
    existingThoughtChange,
    existingThoughtDelete,
    existingThoughtMove,
    expandContextThought,
    loadLocalState,
    modalComplete,
    modalRemindMeLater,
    newThoughtSubmit,
    prioritizeScroll,
    render,
    search,
    searchLimit,
    selectionChange,
    setCursor,
    setFirstSubthought,
    setResourceCache,
    settings,
    setToolbarOverlay,
    showModal,
    status,
    thoughtIndex,
    toggleCodeView,
    toggleContextView,
    toggleHiddenThoughts,
    toggleQueue,
    toggleSidebar,
    updateSplitPosition,
    toggleSplitView,
    tutorial,
    tutorialChoice,
    tutorialStep,
    invalidState,
    editingValue
  })[action.type] || (() => {
    if (!action.type.startsWith('@@')) {
      console.error('Unrecognized action:', action.type, action)
    }
    return state
  }))(state, action))
}
