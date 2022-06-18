const fs = require('fs')

const actionCreators = [
  'addLatestShortcuts',
  'archiveThought',
  '${name}',
  'bumpThoughtDown',
  'clear',
  'clearExpandBottom',
  'clearLatestShortcuts',
  'clearPushQueue',
  'collapseContext',
  'cursorBeforeSearch',
  'cursorBack',
  'cursorDown',
  'cursorForward',
  'cursorHistory',
  'cursorUp',
  'deleteAttribute',
  'deleteEmptyThought',
  'deleteThoughtWithCursor',
  'dragHold',
  'editableRender',
  'editing',
  'editingValue',
  'error',
  'expandHoverTop',
  'expandBottom',
  'editThought',
  'deleteThought',
  'extractThought',
  'heading',
  'indent',
  'insertMultipleThoughts',
  'isPushing',
  'join',
  'closeModal',
  'mergeThoughts',
  'moveThought',
  'moveThoughtDown',
  'moveThoughtUp',
  'newGrandChild',
  'newSubthought',
  'createThought',
  'outdent',
  'prependRevision',
  'search',
  'setRemoteSearch',
  'searchContexts',
  'searchLimit',
  'selectionChange',
  'setAttribute',
  'setCursor',
  'setFirstSubthought',
  'setNoteFocus',
  'setResourceCache',
  'settings',
  'splitSentences',
  'splitThought',
  'status',
  'toggleAbsoluteContext',
  'toggleAttribute',
  'toggleContextView',
  'toggleHiddenThoughts',
  'toggleNote',
  'toggleShortcutsDiagram',
  'toggleSidebar',
  'toggleSplitView',
  'tutorialChoice',
  'tutorialNext',
  'tutorialPrev',
  'tutorialStep',
  'undoArchive',
  'unknownAction',
  'updateThoughts',
]

actionCreators.forEach(name => {
  const text = `import ${name} from '../reducers/${name}'
import Thunk from '../@types/Thunk'

/** Action-creator for ${name}. */
const ${name}ActionCreator =
  (payload: Parameters<typeof ${name}>[1]): Thunk =>
  dispatch =>
    dispatch({ type: '${name}', ...payload })

export default ${name}ActionCreator
`

  fs.writeFileSync(`/Users/raine/projects/em/src/action-creators/${name}.ts`, text)
})
