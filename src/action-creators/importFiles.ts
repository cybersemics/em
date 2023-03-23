import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import createThought from '../action-creators/createThought'
import importText from '../action-creators/importText'
import { AlertType, HOME_TOKEN } from '../constants'
import { exportContext } from '../selectors/exportContext'
import getRankBefore from '../selectors/getRankBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import chunkOutline from '../util/chunkOutline'
import createChildrenMap from '../util/createChildrenMap'
import createId from '../util/createId'
import head from '../util/head'
import initialState from '../util/initialState'
import parentOf from '../util/parentOf'
import series from '../util/series'
import alert from './alert'

// The number of lines that are imported at once.
// This is kept small to ensure that slower devices report steady progress.
// But larger than 1 to reduce state churn.
// The bottleneck is IDB, so the overhead for a high number of small chunks should be minimal as long as it involves the same number of IDB transactions. This is assumed to be the case since each thought and lexeme has a separate Y.Doc and thus separate IDB transaction, regardless of the import chunk size.
const CHUNK_SIZE = 20

/** Action-creator for importFiles. */
const importFilesActionCreator =
  ({
    path,
    files,
    insertBefore,
  }: {
    path: Path
    files: File[]
    // insert the imported thoughts before the path instead of as children of the path
    // creates a new empty thought to import into
    insertBefore?: boolean
  }): Thunk =>
  async (dispatch, getState) => {
    const state = getState()

    const importPath = insertBefore ? ([...parentOf(path), createId()] as Path) : path

    // insert empty import destination when importing before the path
    if (insertBefore) {
      const simplePath = simplifyPath(state, path)
      dispatch(
        createThought({
          path: rootedParentOf(state, importPath),
          value: '',
          rank: getRankBefore(state, simplePath),
          id: head(importPath),
        }),
      )
    }

    // import text one at a time
    const tasks = files.map((file, i) => async () => {
      // read
      const text = await file.text()

      // convert ThoughtIndices to plain text
      let exported = text
      if (text.startsWith('{')) {
        dispatch(alert(`Parsing ${file.name} (${i + 1} / ${files.length})`, { alertType: AlertType.ImportFile }))
        const { thoughtIndex, lexemeIndex } = JSON.parse(text) as ThoughtIndices

        // normalize
        dispatch(alert(`Normalizing ${file.name} (${i + 1} / ${files.length})`, { alertType: AlertType.ImportFile }))
        if (!Object.values(thoughtIndex)[0].childrenMap) {
          Object.entries(thoughtIndex).forEach(([id, thought]) => {
            thoughtIndex[id] = {
              ...thought,
              childrenMap: createChildrenMap(
                {
                  thoughts: {
                    lexemeIndex,
                    thoughtIndex,
                  },
                } as State,
                Object.keys((thought as any).children || {}) as ThoughtId[],
              ),
            }
          })
        }

        const stateImported = initialState()
        stateImported.thoughts.thoughtIndex = thoughtIndex
        stateImported.thoughts.lexemeIndex = lexemeIndex
        exported = exportContext(stateImported, HOME_TOKEN, 'text/plain')
      }

      // divide into chunks
      const chunks = chunkOutline(exported, { chunkSize: CHUNK_SIZE })

      chunks.forEach((chunk, j) => {
        dispatch(
          alert(`Importing ${file.name} ${Math.floor(((j + 1) / chunks.length) * 100)}% (${i + 1} / ${files.length})`, {
            alertType: AlertType.ImportFile,
          }),
        )
        dispatch(importText({ text: chunk, path: importPath, preventSetCursor: true }))
      })
    })

    await series(tasks)

    dispatch(alert(null, { alertType: AlertType.ImportFile }))
  }

export default importFilesActionCreator
