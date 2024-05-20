import * as idb from 'idb-keyval'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import Block from '../@types/Block'
import Context from '../@types/Context'
import Dispatch from '../@types/Dispatch'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import { alertWithMinistore } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { pullActionCreator as pull } from '../actions/pull'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { AlertType, HOME_PATH, HOME_TOKEN } from '../constants'
import globals from '../globals'
import contextToPath from '../selectors/contextToPath'
import { exportContext } from '../selectors/exportContext'
import findDescendant from '../selectors/findDescendant'
import { anyChild, findAnyChild } from '../selectors/getChildren'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import isPending from '../selectors/isPending'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import syncStatusStore from '../stores/syncStatus'
import addContext from '../util/addContext'
import appendToPath from '../util/appendToPath'
import flattenTree from '../util/flattenTree'
import hashThought from '../util/hashThought'
import head from '../util/head'
import htmlToJson from '../util/htmlToJson'
import initialState from '../util/initialState'
import newLexeme from '../util/newLexeme'
import numBlocks from '../util/numBlocks'
import parentOf from '../util/parentOf'
import parseJsonSafe from '../util/parseJsonSafe'
import pathToContext from '../util/pathToContext'
import series from '../util/series'
import storage from '../util/storage'
import textToHtml from '../util/textToHtml'
import unroot from '../util/unroot'

/** Represents a file that is imported with drag-and-drop. Unifies imports from the File API and Clipboard. */
interface VirtualFile {
  lastModified: number
  name: string
  size: number
  text: () => Promise<string>
}

/** Meta information for a file import that is stored in IDB and automatically resumed on initialize. */
interface ResumeImport {
  /** Unique id for the import.
      Importing the same file a second time will generate a new ResumeImport with a new id. */
  id: string
  /** Insert the imported thoughts before the path instead of as children of the path. Creates a new empty thought to import into. */
  insertBefore?: boolean
  lastModified: number
  /** Number of thoughts that have already been imported. */
  thoughtsImported: number
  name: string
  /** Import destination path. */
  path: Path
  size: number
}

type ResumableFile = VirtualFile & ResumeImport

// key for localStorage ResumeImport manifest
// base for idb resume import file
const RESUME_IMPORTS_KEY = 'resume-imports'

/** Generate the IDB key for a ResumeImport file. */
const resumeImportKey = (id: string) => `${RESUME_IMPORTS_KEY}-${id}`

/** Deletes the ResumeImport file manifest and raw file in IDB. */
export const deleteResumableFile = async (id: string) => {
  // NOTE: This will clear all preserved thoughts, not just the import cursor.
  // This is safe at the current time since the only other use of preserveSet is for export.
  globals.preserveSet.clear()
  await idb.del(resumeImportKey(id))
  const resumeImports = parseJsonSafe<Index<ResumeImport>>(storage.getItem(RESUME_IMPORTS_KEY) || '{}', {})
  storage.setItem(RESUME_IMPORTS_KEY, JSON.stringify(_.omit(resumeImports, id)))
}

/** Creates a small object that can be used to manage the persistence of a ResumableFile. */
const resumeImportsManager = (file: ResumableFile) => {
  /** Initializes the ResumeImport file manifest and raw file in IDB. */
  const init = async (text: string) => {
    await update(file.path, 0, file.insertBefore)
    await idb.set(resumeImportKey(file.id), text)
  }

  /** Updates the persisted ResumeImport file to the latest number of imported thoughts. */
  // TODO: throttling update breaks resume file.path for some reason
  const update = async (path: Path | null, thoughtsImported: number, insertBefore?: boolean) => {
    const resumeImports = parseJsonSafe<Index<ResumeImport>>(storage.getItem(RESUME_IMPORTS_KEY) || '{}', {})
    storage.setItem(
      RESUME_IMPORTS_KEY,
      JSON.stringify({
        ...(resumeImports || {}),
        [file.id]: {
          id: file.id,
          // use the original insertBefore for the first import of the first thought
          // See: insertBeforeNew
          insertBefore: thoughtsImported === 1 ? insertBefore : file.insertBefore,
          lastModified: file.lastModified,
          thoughtsImported,
          name: file.name,
          path: path || file.path,
          size: file.size,
        },
      }),
    )
  }

  return { del: () => deleteResumableFile(file.id), init, update }
}

/** Gets all saved imports as ResumableFiles. */
resumeImportsManager.getFiles = async (): Promise<ResumableFile[]> => {
  const resumeImports = parseJsonSafe<Index<ResumeImport>>(storage.getItem(RESUME_IMPORTS_KEY) || '{}', {})
  return Object.values(resumeImports).map(resumeImport => ({
    id: resumeImport.id,
    insertBefore: resumeImport.insertBefore,
    lastModified: resumeImport.lastModified,
    thoughtsImported: resumeImport.thoughtsImported,
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
}

/** Pulls the thoughts in the given context if they exist. */
const pullDuplicateDescendants =
  (id: ThoughtId, context: Context): Thunk =>
  async (dispatch, getState) => {
    if (context.length === 0) return
    const stateBeforePull = getState()

    // if thought is pending, pull it
    if (isPending(stateBeforePull, getThoughtById(stateBeforePull, id))) {
      // Must be forced, otherwise thoughts can be missed.
      // (Not sure how, since pull calls getPendingDescentants, which should be the same.)
      await dispatch(pull([id], { force: true, maxDepth: 1 }))
    }

    // if there is a duplicate, recurse
    const stateAfterPull = getState()
    const duplicate = findDescendant(stateAfterPull, id, context[0])
    if (duplicate) {
      await dispatch(pullDuplicateDescendants(duplicate, context.slice(1)))
    }
  }

/** Action-creator for importFiles. */
export const importFilesActionCreator =
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

    // allow aborting the import if there is an error
    let abort = false
    const stateStart = getState()
    const importPath = path || HOME_PATH

    // if the destination thought is empty, then it will get destroyed by importText, so we need to calculate a new insertBefore and path for subsequent thoughts
    // these will be saved to the ResumableFile but ignored on the first thought
    const destThought = getThoughtById(stateStart, head(importPath))
    const destIsLeaf = !anyChild(stateStart, head(importPath))
    const destEmpty = destThought.value === '' && destIsLeaf
    const siblingAfter = destEmpty ? nextSibling(stateStart, importPath) : null
    const insertBeforeNew = destEmpty && !!siblingAfter
    const pathNew = destEmpty
      ? siblingAfter
        ? appendToPath(parentOf(importPath), siblingAfter.id)
        : rootedParentOf(stateStart, importPath)
      : importPath

    // normalize native files from drag-and-drop and resumed files stored in IDB
    const resumableFiles: ResumableFile[] = files
      ? files.map(file => ({
          id: nanoid(),
          insertBefore: insertBeforeNew,
          lastModified: file.lastModified,
          thoughtsImported: 0,
          name: file.name,
          path: pathNew,
          size: file.size,
          text: () => file.text(),
        }))
      : await resumeImportsManager.getFiles()

    // import one file at a time
    const fileTasks = resumableFiles.map((file, i) => async () => {
      /** An action-creator that imports a block. */
      const importBlock =
        ({ block, ancestors, i }: { block: Block; ancestors: Block[]; i: number }) =>
        (dispatch: Dispatch, getState: () => State) =>
        async (): Promise<void> => {
          /** Updates importProgress alert and resumeImports. */
          const updateImportProgress = async () => {
            // update resumeImports with thoughtsImported
            const importProgress = (i + 1) / numThoughts
            const importProgressString = (Math.floor(importProgress * 1000) / 10).toFixed(1)
            syncStatusStore.update({ importProgress })
            dispatch(
              alertWithMinistore(`Importing ${fileProgressString}... ${importProgressString}%`, {
                alertType: AlertType.ImportFile,
                clearDelay: i === numThoughts - 1 ? 5000 : undefined,
                importFileId: file.id,
              }),
            )

            const resumePath = i === 0 ? contextToPath(getState(), unroot([...parentContext, block.scope]))! : file.path
            await manager.update(resumePath, i + 1)
          }

          const path = resume ? file.path : ancestors.length === 0 ? importPath : pathNew
          // get the context relative to the import root
          // the relative context is appended to the base context to get the destination context
          const relativeAncestorContext = ancestors.map(block => block.scope)

          // must replicate descendants before calculating baseContext and parentContext
          await dispatch(pullDuplicateDescendants(head(path), [...relativeAncestorContext, block.scope]))

          const stateAfterPull = getState()

          // if inserting into an empty destination with a sibling afterwards, import into the parent
          const baseContext = pathToContext(
            stateAfterPull,
            insertBeforeNew
              ? rootedParentOf(stateAfterPull, path)
              : destEmpty && ancestors.length === 0
                ? rootedParentOf(stateAfterPull, path)
                : path,
          )
          const parentContext =
            ancestors.length === 0 ? baseContext : [...unroot(baseContext), ...relativeAncestorContext]
          // TODO: It would be better to get the id from importText rather than contextToPath
          const parentPath = contextToPath(stateAfterPull, parentContext)

          // validate parentPath
          if (!parentPath) {
            const partialPath = parentContext.map((id, i) =>
              findDescendant(stateAfterPull, HOME_TOKEN, parentContext.slice(0, i + 1)),
            )
            const errorMessage = `Error importing ${parentContext.join('/')}.`
            console.error(errorMessage, 'Missing parentPath.', {
              importPath,
              baseContext,
              parentContext,
              parentPath: partialPath,
            })

            // ask user if they want to skip the thought or cancel the import
            if (!window.confirm(`${errorMessage}\n\nSkip thought?`)) {
              abort = true
              await manager.del()
            }
            return
          }

          // import into parent path after empty destination thought is destroyed
          const importThoughtPath = ancestors.length === 0 && insertBeforeNew ? pathNew : parentPath

          const id = head(parentPath)
          const duplicate = findAnyChild(stateAfterPull, id, child => child.value === block.scope)
          const lexeme = getLexeme(stateAfterPull, block.scope)
          const hasContext = !!lexeme?.contexts.includes(id)

          return new Promise<void>(resolve => {
            /** Updates the progress and resolves the task. */
            const updateAndResolve = () => updateImportProgress().then(resolve)

            dispatch([
              // delete empty destination thought
              i === 0 && destEmpty ? deleteThought({ pathParent: parentPath, thoughtId: head(importPath) }) : null,
              // If the thought is a duplicate, immediately update the import progress and resolve the task.
              duplicate
                ? // It is possible for the Lexeme to be missing if the import was interrupted after the thought was saved but before the Lexeme was saved.
                  // In this case, recreate the Lexeme.
                  hasContext
                  ? updateAndResolve
                  : updateThoughts({
                      lexemeIndexUpdates: {
                        [hashThought(block.scope)]: lexeme
                          ? addContext(lexeme, {
                              id: duplicate.id,
                            })
                          : newLexeme({
                              created: duplicate.lastUpdated,
                              id: duplicate.id,
                              lastUpdated: duplicate.lastUpdated,
                              value: block.scope,
                            }),
                      },
                      thoughtIndexUpdates: {},
                      idbSynced: updateAndResolve,
                    })
                : // import the new thought
                  // Any missing children from previously interrupted imports are cleaned up in createThought.
                  newThought({
                    at: importThoughtPath,
                    insertNewSubthought: ancestors.length > 0 || !insertBeforeNew,
                    insertBefore: ancestors.length === 0 && insertBeforeNew,
                    preventSetCursor: true,
                    value: block.scope,
                    idbSynced: updateAndResolve,
                  }),
              // set cursor to new thought on the first iteration
              // ensure the last imported thought is not deleted by freeThoughts
              (dispatch, getState) => {
                const stateAfterImport = getState()
                const cursorNew = contextToPath(stateAfterImport, unroot([...parentContext, block.scope]))

                // preserve cursor from being deallocated during import
                // NOTE: This will clear all preserved thoughts, not just the import cursor.
                // This is safe at the current time since the only other use of preserveSet is for export.
                if (cursorNew) {
                  globals.preserveSet = new Set(cursorNew)
                }

                // set cursor to first imported thought
                if (i === 0) {
                  dispatch(setCursor({ path: cursorNew, editing: false }))
                }
              },
            ])
          })
        }

      const manager = resumeImportsManager(file)
      const fileProgressString = file.name + (resumableFiles.length > 1 ? ` (${i + 1}/${resumableFiles.length})` : '')

      // read file
      dispatch(
        alertWithMinistore(`${resume ? 'Resume import of' : 'Reading'} ${fileProgressString}`, {
          alertType: AlertType.ImportFile,
          importFileId: file.id,
        }),
      )
      const text = await file.text()

      // if importing a new file, initialize resumeImports in IDB as soon as possible
      if (!resume) {
        dispatch(alertWithMinistore(`Storing ${fileProgressString}`, { alertType: AlertType.ImportFile }))
        manager.init(text)
      }

      // convert ThoughtIndices to plain text
      let exported = text
      if (text.startsWith('{')) {
        dispatch(alertWithMinistore(`Parsing ${fileProgressString}`, { alertType: AlertType.ImportFile }))
        const { thoughtIndex, lexemeIndex } = JSON.parse(text) as ThoughtIndices
        const stateImported = initialState()
        stateImported.thoughts.thoughtIndex = thoughtIndex
        stateImported.thoughts.lexemeIndex = lexemeIndex
        exported = exportContext(stateImported, HOME_TOKEN, 'text/plain')
      }

      const json = htmlToJson(textToHtml(exported))
      const numThoughts = numBlocks(json)

      syncStatusStore.update({ importProgress: 0 / numThoughts })
      dispatch(
        alertWithMinistore(`Importing ${fileProgressString}...`, {
          alertType: AlertType.ImportFile,
          importFileId: file.id,
        }),
      )

      const importTasks = flattenTree(
        json,
        // cannot properly short circuit flattenTree, so just discontinue all remaining iterations
        (block, ancestors, i) => (abort ? null : dispatch(importBlock({ block, ancestors, i }))),
        { start: file.thoughtsImported },
      )

      // import thoughts serially
      // otherwise thoughts will get imported out of order
      await series(importTasks)
      await manager.del()
    })

    // import files serially
    // this could be parallelized as long as they have different import destinations
    await series(fileTasks)

    dispatch(alertWithMinistore(null, { alertType: AlertType.ImportFile }))
  }
