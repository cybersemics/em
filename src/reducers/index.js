// reducers
import alert from './alert.js'
import authenticate from './authenticate.js'
import clear from './clear.js'
import codeChange from './codeChange.js'
import cursorBeforeSearch from './cursorBeforeSearch.js'
import cursorHistory from './cursorHistory.js'
import deleteData from './deleteData.js'
import dragInProgress from './dragInProgress.js'
import editing from './editing.js'
import error from './error.js'
import existingThoughtChange from './existingThoughtChange.js'
import existingThoughtDelete from './existingThoughtDelete.js'
import existingThoughtMove from './existingThoughtMove.js'
import expandContextThought from './expandContextThought.js'
import loadLocalState from './loadLocalState.js'
import modalComplete from './modalComplete.js'
import modalRemindMeLater from './modalRemindMeLater.js'
import newThoughtSubmit from './newThoughtSubmit.js'
import render from './render.js'
import search from './search.js'
import searchLimit from './searchLimit.js'
import selectionChange from './selectionChange.js'
import setCursor from './setCursor.js'
import setView from './setView.js'
import settings from './settings.js'
import showModal from './showModal.js'
import status from './status.js'
import thoughtIndex from './thoughtIndex.js'
import toggleBindContext from './toggleBindContext.js'
import toggleCodeView from './toggleCodeView.js'
import toggleContextView from './toggleContextView.js'
import toggleProseView from './toggleProseView.js'
import toggleQueue from './toggleQueue.js'
import toggleSidebar from './toggleSidebar.js'
import toggleSplitView from './toggleSplitView.js'
import tutorial from './tutorial.js'
import tutorialChoice from './tutorialChoice.js'
import tutorialStep from './tutorialStep.js'
import exportExec from './exportExec.js'
import { setToolbarOverlay, prioritizeScroll } from './toolbarOverlay.js'

import { initialState } from '../util'

export default (state = initialState(), action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    alert,
    authenticate,
    clear,
    codeChange,
    cursorBeforeSearch,
    cursorHistory,
    deleteData,
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
    setView,
    setToolbarOverlay,
    settings,
    showModal,
    status,
    thoughtIndex,
    toggleBindContext,
    toggleCodeView,
    toggleContextView,
    toggleProseView,
    toggleQueue,
    toggleSidebar,
    toggleSplitView,
    tutorial,
    tutorialChoice,
    tutorialStep,
    exportExec,

  })[action.type] || (() => {
    if (!action.type.startsWith('@@')) {
      console.error('Unrecognized action:', action.type, action)
    }
    return state
  }))(state, action))
}
