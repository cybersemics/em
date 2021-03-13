/** Here's documentation for all action-creators. */
import { State } from '../util/initialState'
import { Thunk } from '../types'
import * as reducers from '../reducers'

/** Wraps a static action in a thunk. */
const reducerToThunk = <T extends (state: State, payload: any) => Record<string, any>>(name: string) =>
  (payload?: Parameters<T>[1]): Thunk<void> => dispatch => dispatch({ type: name, ...payload })

// export all reducers as properly typed thunks
export const archiveThought = reducerToThunk<typeof reducers.archiveThought>('archiveThought')
export const authenticate = reducerToThunk<typeof reducers.authenticate>('authenticate')
export const bumpThoughtDown = reducerToThunk<typeof reducers.bumpThoughtDown>('bumpThoughtDown')
export const clear = reducerToThunk<typeof reducers.clear>('clear')
export const clearPushQueue = reducerToThunk<typeof reducers.clearPushQueue>('clearPushQueue')
export const collapseContext = reducerToThunk<typeof reducers.collapseContext>('collapseContext')
export const cursorBeforeSearch = reducerToThunk<typeof reducers.cursorBeforeSearch>('cursorBeforeSearch')
export const cursorBack = reducerToThunk<typeof reducers.cursorBack>('cursorBack')
export const cursorDown = reducerToThunk<typeof reducers.cursorDown>('cursorDown')
export const cursorForward = reducerToThunk<typeof reducers.cursorForward>('cursorForward')
export const cursorHistory = reducerToThunk<typeof reducers.cursorHistory>('cursorHistory')
export const cursorUp = reducerToThunk<typeof reducers.cursorUp>('cursorUp')
export const deleteAttribute = reducerToThunk<typeof reducers.deleteAttribute>('deleteAttribute')
export const deleteData = reducerToThunk<typeof reducers.deleteData>('deleteData')
export const deleteEmptyThought = reducerToThunk<typeof reducers.deleteEmptyThought>('deleteEmptyThought')
export const deleteThought = reducerToThunk<typeof reducers.deleteThought>('deleteThought')
export const dragHold = reducerToThunk<typeof reducers.dragHold>('dragHold')
export const dragInProgress = reducerToThunk<typeof reducers.dragInProgress>('dragInProgress')
export const editableRender = reducerToThunk<typeof reducers.editableRender>('editableRender')
export const editing = reducerToThunk<typeof reducers.editing>('editing')
export const editingValue = reducerToThunk<typeof reducers.editingValue>('editingValue')
export const error = reducerToThunk<typeof reducers.error>('error')
export const existingThoughtChange = reducerToThunk<typeof reducers.existingThoughtChange>('existingThoughtChange')
export const existingThoughtDelete = reducerToThunk<typeof reducers.existingThoughtDelete>('existingThoughtDelete')
export const existingThoughtMove = reducerToThunk<typeof reducers.existingThoughtMove>('existingThoughtMove')
export const extractThought = reducerToThunk<typeof reducers.extractThought>('extractThought')
export const indent = reducerToThunk<typeof reducers.indent>('indent')
export const isPushing = reducerToThunk<typeof reducers.isPushing>('isPushing')
export const join = reducerToThunk<typeof reducers.join>('join')
export const modalRemindMeLater = reducerToThunk<typeof reducers.modalRemindMeLater>('modalRemindMeLater')
export const moveThoughtDown = reducerToThunk<typeof reducers.moveThoughtDown>('moveThoughtDown')
export const moveThoughtUp = reducerToThunk<typeof reducers.moveThoughtUp>('moveThoughtUp')
export const newGrandChild = reducerToThunk<typeof reducers.newGrandChild>('newGrandChild')
export const newSubthought = reducerToThunk<typeof reducers.newSubthought>('newSubthought')
export const newThoughtSubmit = reducerToThunk<typeof reducers.newThoughtSubmit>('newThoughtSubmit')
export const outdent = reducerToThunk<typeof reducers.outdent>('outdent')
export const prependRevision = reducerToThunk<typeof reducers.prependRevision>('prependRevision')
export const reconcile = reducerToThunk<typeof reducers.reconcile>('reconcile')
export const render = reducerToThunk<typeof reducers.render>('render')
export const search = reducerToThunk<typeof reducers.search>('search')
export const setRemoteSearch = reducerToThunk<typeof reducers.setRemoteSearch>('setRemoteSearch')
export const searchContexts = reducerToThunk<typeof reducers.searchContexts>('searchContexts')
export const searchLimit = reducerToThunk<typeof reducers.searchLimit>('searchLimit')
export const selectionChange = reducerToThunk<typeof reducers.selectionChange>('selectionChange')
export const setAttribute = reducerToThunk<typeof reducers.setAttribute>('setAttribute')
export const setCursor = reducerToThunk<typeof reducers.setCursor>('setCursor')
export const setFirstSubthought = reducerToThunk<typeof reducers.setFirstSubthought>('setFirstSubthought')
export const setNoteFocus = reducerToThunk<typeof reducers.setNoteFocus>('setNoteFocus')
export const setResourceCache = reducerToThunk<typeof reducers.setResourceCache>('setResourceCache')
export const settings = reducerToThunk<typeof reducers.settings>('settings')
export const showModal = reducerToThunk<typeof reducers.showModal>('showModal')
export const splitSentences = reducerToThunk<typeof reducers.splitSentences>('splitSentences')
export const splitThought = reducerToThunk<typeof reducers.splitThought>('splitThought')
export const status = reducerToThunk<typeof reducers.status>('status')
export const toggleAbsoluteContext = reducerToThunk<typeof reducers.toggleAbsoluteContext>('toggleAbsoluteContext')
export const toggleAttribute = reducerToThunk<typeof reducers.toggleAttribute>('toggleAttribute')
export const toggleContextView = reducerToThunk<typeof reducers.toggleContextView>('toggleContextView')
export const toggleHiddenThoughts = reducerToThunk<typeof reducers.toggleHiddenThoughts>('toggleHiddenThoughts')
export const toggleSidebar = reducerToThunk<typeof reducers.toggleSidebar>('toggleSidebar')
export const toggleSplitView = reducerToThunk<typeof reducers.toggleSplitView>('toggleSplitView')
export const tutorial = reducerToThunk<typeof reducers.tutorial>('tutorial')
export const tutorialChoice = reducerToThunk<typeof reducers.tutorialChoice>('tutorialChoice')
export const tutorialNext = reducerToThunk<typeof reducers.tutorialNext>('tutorialNext')
export const tutorialPrev = reducerToThunk<typeof reducers.tutorialPrev>('tutorialPrev')
export const tutorialStep = reducerToThunk<typeof reducers.tutorialStep>('tutorialStep')
export const undoArchive = reducerToThunk<typeof reducers.undoArchive>('undoArchive')
export const unknownAction = reducerToThunk<typeof reducers.unknownAction>('unknownAction')
export const updateThoughts = reducerToThunk<typeof reducers.updateThoughts>('updateThoughts')

// export custom action-creators
export { default as alert } from './alert'
export { default as cursorNext } from './cursorNext'
export { default as cursorPrev } from './cursorPrev'
export { default as dataIntegrityCheck } from './dataIntegrityCheck'
export { default as expandContextThought } from './expandContextThought'
export { default as home } from './home'
export { default as importText } from './importText'
export { default as loadFromUrl } from './loadFromUrl'
export { default as loadLocalState } from './loadLocalState'
export { default as loadPublicThoughts } from './loadPublicThoughts'
export { default as loadRemoteState } from './loadRemoteState'
export { default as loadResource } from './loadResource'
export { default as login } from './login'
export { default as logout } from './logout'
export { default as modalComplete } from './modalComplete'
export { default as newThought } from './newThought'
export { default as preloadSources } from './preloadSources'
export { default as pull } from './pull'
export { default as push } from './push'
export { default as restoreCursorBeforeSearch } from './restoreCursorBeforeSearch'
export { default as scrollCursorIntoView } from './scrollCursorIntoView'
export { default as setEditingValue } from './setEditingValue'
export { default as setInvalidState } from './setInvalidState'
export { default as subCategorizeAll } from './subCategorizeAll'
export { default as subCategorizeOne } from './subCategorizeOne'
export { default as suppressExpansion } from './suppressExpansion'
export { default as updateSplitPosition } from './updateSplitPosition'
export { default as userAuthenticated } from './userAuthenticated'
export { overlayHide, scrollPrioritize, overlayReveal } from './toolbar'
export { scaleFontDown, scaleFontUp } from './scaleSize'
export { default as toggleTopControlsAndBreadcrumbs } from './toggleTopControlsAndBreadcrumbs'
