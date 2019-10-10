import { initialState } from '../store-utils.js'

import { status } from './status'
import { authenticate } from './authenticate'
import { clear } from './clear'
import { render } from './render'
import { data } from './data'
import { deleteTutorial } from './deleteTutorial'
import { deleteData } from './deleteData'
import { newItemSubmit } from './newItemSubmit'
import { setCursor } from './setCursor'
import { cursorHistory } from './cursorHistory'
import { existingItemChange } from './existingItemChange'
import { existingItemDelete } from './existingItemDelete'
import { existingItemMove } from './existingItemMove'
import { codeChange } from './codeChange'
import { settings } from './settings'
import { helperComplete } from './helperComplete'
import { helperRemindMeLater } from './helperRemindMeLater'
import { expandContextItem } from './expandContextItem'
import { showHelperIcon } from './showHelperIcon'
import { showHelper } from './showHelper'
import { editing } from './editing'
import { toggleContextView } from './toggleContextView'
import { toggleCodeView } from './toggleCodeView'
import { search } from './search'
import { cursorBeforeSearch } from './cursorBeforeSearch'
import { dragInProgress } from './dragInProgress'
import { selectionChange } from './selectionChange'
import { searchLimit } from './searchLimit'


export const appReducer = (state = initialState(), action) => {
    // console.info('ACTION', action)
    return Object.assign({}, state, (({

      status: status,

      authenticate: authenticate,

      // SIDE EFFECTS: localStorage, scroll
      // preserves some settings
      clear: clear(state),

      // force re-render
      render: render(state),

      // updates data and contextChildren with any number of items
      data: data(state),

      // SIDE EFFECTS: localStorage
      deleteTutorial: deleteTutorial(state),

      // SIDE EFFECTS: localStorage
      delete: deleteData(state),

      // SIDE EFFECTS: syncOne
      // addAsContext adds the given context to the new item
      newItemSubmit: newItemSubmit(state),

      // SIDE EFFECTS: updateUrlHistory, localStorage
      // set both cursorBeforeEdit (the transcendental signifier) and cursor (the live value during editing)
      // the other contexts superscript uses cursor when it is available
      setCursor: setCursor(state),

      cursorHistory: cursorHistory(state),

      // SIDE EFFECTS: syncRemoteData, localStorage, updateUrlHistory
      existingItemChange: existingItemChange(state),

      // SIDE EFFECTS: syncRemoteData, localStorage
      existingItemDelete: existingItemDelete(state),

      // side effect: syncRemoteData
      existingItemMove: existingItemMove(state),

      // SIDE EFFECTS: localStorage, syncRemoteData
      codeChange: codeChange(state),

      // SIDE EFFECTS: localStorage, syncRemote
      settings: settings,

      // SIDE EFFECTS: localStorage
      helperComplete: helperComplete(state),

      // SIDE EFFECTS: localStorage, restoreSelection
      helperRemindMeLater: helperRemindMeLater(state),

      expandContextItem: expandContextItem(state),

      showHelperIcon: showHelperIcon(state),

      showHelper: showHelper(state),

      // track editing independently of cursor to allow navigation when keyboard is hidden
      editing: editing,

      // SIDE EFFECTS: updateUrlHistory
      toggleContextView: toggleContextView(state),

      toggleCodeView: toggleCodeView(state),

      search: search,

      cursorBeforeSearch: cursorBeforeSearch,

      dragInProgress: dragInProgress,

      selectionChange: selectionChange,

      searchLimit: searchLimit

    })[action.type] || (() => state))(action, state))
  }