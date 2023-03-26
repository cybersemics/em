import * as idb from 'idb-keyval'
import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import createThought from '../action-creators/createThought'
import importText from '../action-creators/importText'
import { AlertType, HOME_PATH, HOME_TOKEN } from '../constants'
import { exportContext } from '../selectors/exportContext'
import { anyChild } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import syncStatusStore from '../stores/syncStatus'
import appendToPath from '../util/appendToPath'
import chunkOutline from '../util/chunkOutline'
import createChildrenMap from '../util/createChildrenMap'
import createId from '../util/createId'
import head from '../util/head'
import initialState from '../util/initialState'
import parentOf from '../util/parentOf'
import series from '../util/series'
import alert from './alert'
import pull from './pull'

interface VirtualFile {
  lastModified: number
  name: string
  size: number
  text: () => Promise<string>
}

/** Meta information for a file import that is stored in IDB and automatically resumed on initialize. */
interface ResumeImport {
  /** Unique id for the import.
      importing the same file a second time will generate a new ResumeImport with a new id. */
  id: string
  /** Insert the imported thoughts before the path instead of as children of the path. Creates a new empty thought to import into. */
  insertBefore?: boolean
  lastModified: number
  /** Lines of the file that have already been imported. */
  linesCompleted: number
  name: string
  /** Import destination path. */
  path: Path
  size: number
}

type ResumableFile = VirtualFile & ResumeImport

// The number of lines of text that are imported at once.
// This is kept small to ensure that slower devices report steady progress, but large enough to reduce state churn.
// The bottleneck is IDB, so the overhead for a high number of small chunks should be minimal as long as it involves the same number of IDB transactions. This is assumed to be the case since each thought and lexeme has a separate Y.Doc and thus separate IDB transaction, regardless of the import chunk size.
// Efficency may be improved by introducing parallelism.
// Chunk sizes of 5, 20, and 500 when importing 300 thoughts result in about 15s, 12s, and 10s import time, respectively.
const CHUNK_SIZE = 20

/** Generate the IDB key for a ResumeImport file. */
const resumeImportKey = (id: string) => `resumeImports-${id}`

/** Action-creator for importFiles. */
const importFilesActionCreator =
  ({
    files,
    insertBefore,
    path,
    resume,
  }: {
    /** Files to import into the path. Either files or resume must be set. */
    files?: VirtualFile[]
    /** Insert the imported thoughts before the path instead of as children of the path. Creates a new empty thought to import into. */
    insertBefore?: boolean
    /** Import destination path. Ignored during resume import, where the path is stored in the ResumeImport manifest. */
    path?: Path
    /** If true, resumes unfinished imports. Either files or resume must be set. */
    resume?: boolean
  }): Thunk =>
  async (dispatch, getState) => {
    if (!files && !resume) {
      throw new Error('importFiles must specify files or resume.')
    }

    const state = getState()
    const importPath = insertBefore ? ([...parentOf(path!), createId()] as Path) : path || HOME_PATH

    // insert empty import destination when importing before the path
    if (!resume && insertBefore) {
      const simplePath = simplifyPath(state, path || HOME_PATH)
      dispatch(
        createThought({
          path: rootedParentOf(state, importPath),
          value: '',
          rank: getRankBefore(state, simplePath),
          id: head(importPath),
        }),
      )
    }

    // if the destination thought is empty, then it will get destroyed by importText, so we need to calculate a new insertBefore and path for subsequent chunks
    // these will be saved to the ResumableFile but ignored in the first chunk
    const destThought = getThoughtById(state, head(importPath))
    const destIsLeaf = !anyChild(state, head(importPath))
    const destEmpty = destThought.value === '' && destIsLeaf
    const siblingAfter = destEmpty ? nextSibling(state, importPath) : null
    const insertBeforeNew = destEmpty && !!siblingAfter
    const pathNew = destEmpty
      ? siblingAfter
        ? appendToPath(parentOf(importPath), siblingAfter.id)
        : rootedParentOf(state, importPath)
      : importPath

    // normalize native files from drag-and-drop and resumed files stored in IDB
    const resumableFiles: ResumableFile[] = files
      ? files.map(file => {
          return {
            id: createId(),
            insertBefore: insertBeforeNew,
            lastModified: file.lastModified,
            linesCompleted: 0,
            name: file.name,
            // this will be ignored in the first chunk
            path: pathNew,
            size: file.size,
            text: () => file.text(),
          }
        })
      : Object.values((await idb.get<Index<ResumeImport>>('resumeImports')) || []).map(resumeImport => ({
          id: resumeImport.id,
          insertBefore: resumeImport.insertBefore,
          lastModified: resumeImport.lastModified,
          linesCompleted: resumeImport.linesCompleted,
          name: resumeImport.name,
          path: resumeImport.path,
          size: resumeImport.size,
          text: async () => {
            const text = await idb.get<string>(resumeImportKey(resumeImport.id))
            if (text == null) {
              console.warn(`Resume file missing from IDB: %{resumeImport.id}`, resumeImport)
              return ''
            }
            return text
          },
        }))

    // import one file at a time
    const fileTasks = resumableFiles.map((file, i) => async () => {
      const fileProgressString = file.name + (resumableFiles.length > 1 ? ` (${i + 1}/${resumableFiles.length})` : '')

      // read
      dispatch(
        alert(`${resume ? 'Resume import of' : 'Reading'} ${fileProgressString}`, { alertType: AlertType.ImportFile }),
      )
      const text = await file.text()

      // if importing a new file, initialize resumeImports in IDB
      if (!resume) {
        dispatch(alert(`Storing ${fileProgressString}`, { alertType: AlertType.ImportFile }))
        await idb.update<Index<ResumeImport>>('resumeImports', resumeImports => {
          return {
            ...(resumeImports || {}),
            [file.id]: {
              id: file.id,
              insertBefore: file.insertBefore,
              lastModified: file.lastModified,
              linesCompleted: file.linesCompleted,
              name: file.name,
              path: file.path,
              size: file.size,
            },
          }
        })
        await idb.set(resumeImportKey(file.id), text)
      }

      // convert ThoughtIndices to plain text
      let exported = text
      if (text.startsWith('{')) {
        dispatch(alert(`Parsing ${fileProgressString}`, { alertType: AlertType.ImportFile }))
        const { thoughtIndex, lexemeIndex } = JSON.parse(text) as ThoughtIndices

        // normalize
        dispatch(alert(`Normalizing ${fileProgressString}`, { alertType: AlertType.ImportFile }))
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

      syncStatusStore.update({ importProgress: 0 / chunks.length })
      dispatch(alert(`Importing ${fileProgressString}...`, { alertType: AlertType.ImportFile }))

      // use to calculate proper chunk index (relative to the start of the file, not where import resumed)
      const chunkStartIndex = Math.floor(file.linesCompleted / CHUNK_SIZE)

      const chunkTasks = chunks.slice(chunkStartIndex).map((chunk, j) => async () => {
        const chunkIndex = chunkStartIndex + j

        // There is one limitation to using importText's automerge to incrementally import chunks.
        // If the import destination is pending, duplicate contexts will not be merged.
        // Thus, we need to pull the import destination path before resuming import to avoid duplicates.
        // Use force to ignore pending status.
        // WARNING: If all of the imported thoughts cannot be held in memory at once, the pull will crash the browser and block resume.
        // TODO: Only pull necessary thoughts, or find a way to avoid merge conflicts to begin with.
        if (resume) {
          // await dispatch(pull([head(file.path)], { force: true, maxDepth: Infinity }))
          await dispatch(pull([head(file.path)], { force: true, maxDepth: Infinity }))
        }

        return new Promise<void>(resolve => {
          dispatch([
            importText({
              text: chunk,
              // use the original import path for the first import of the first chunk
              // See: pathNew
              path: chunkIndex === 0 ? importPath : file.path,
              // prevent setCursor on all but the first import of the first chunk
              // the first chunk should set the cursor in case pasting into an empty destination and triggering shouldImportIntoDummy
              preventSetCursor: chunkIndex !== 0,
              idbSynced: async () => {
                // update resumeImports with linesCompleted
                const linesCompleted = (chunkIndex + 1) * CHUNK_SIZE
                const importProgress = (chunkIndex + 1) / chunks.length
                const chunkProgressString = Math.round(importProgress * 100)
                syncStatusStore.update({ importProgress })
                dispatch(
                  alert(`Importing ${fileProgressString}... ${chunkProgressString}%`, {
                    alertType: AlertType.ImportFile,
                    clearDelay: chunkIndex === chunks.length - 1 ? 5000 : undefined,
                  }),
                )
                await idb.update<Index<ResumeImport>>('resumeImports', resumeImports => {
                  return {
                    ...(resumeImports || {}),
                    [file.id]: {
                      id: file.id,
                      // use the original insertBefore for the first import of the first chunk
                      // See: insertBeforeNew
                      insertBefore: chunkIndex === 0 ? insertBefore : file.insertBefore,
                      lastModified: file.lastModified,
                      linesCompleted,
                      name: file.name,
                      // use the original import path on the first chunk
                      // See: pathNew
                      path: file.path,
                      size: file.size,
                    },
                  }
                })

                resolve()
              },
            }),
          ])
        })
      })

      // import chunks serially
      // otherwise thoughts will get imported out of order
      await series(chunkTasks)

      // delete the ResumeImport file and manifest after all chunks are imported
      await idb.del(resumeImportKey(file.id))
      await idb.update<Index<ResumeImport>>('resumeImports', resumeImports => _.omit(resumeImports, file.id))
    })

    // import files serially
    // this could be parallelized as long as they have different import destinations
    await series(fileTasks)

    dispatch(alert(null, { alertType: AlertType.ImportFile }))
  }

export default importFilesActionCreator
