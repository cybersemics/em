import * as idb from 'idb-keyval'
import _ from 'lodash'
import sanitize from 'sanitize-html'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import createThought from '../action-creators/createThought'
import importText from '../action-creators/importText'
import setCursor from '../action-creators/setCursor'
import { ALLOWED_ATTRIBUTES, ALLOWED_TAGS, AlertType, HOME_PATH, HOME_TOKEN } from '../constants'
import { replicateThought } from '../data-providers/yjs/thoughtspace'
import contextToPath from '../selectors/contextToPath'
import { exportContext } from '../selectors/exportContext'
import findDescendant from '../selectors/findDescendant'
import { anyChild } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import syncStatusStore from '../stores/syncStatus'
import appendToPath from '../util/appendToPath'
import createChildrenMap from '../util/createChildrenMap'
import createId from '../util/createId'
import head from '../util/head'
import htmlToJson from '../util/htmlToJson'
import initialState from '../util/initialState'
import mapBlocks from '../util/mapBlocks'
import numBlocks from '../util/numBlocks'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import series from '../util/series'
import textToHtml from '../util/textToHtml'
import unroot from '../util/unroot'
import alert from './alert'

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
  /** Number of thoughts that have already been imported. */
  thoughtsImported: number
  name: string
  /** Import destination path. */
  path: Path
  size: number
}

type ResumableFile = VirtualFile & ResumeImport

/** Generate the IDB key for a ResumeImport file. */
const resumeImportKey = (id: string) => `resumeImports-${id}`

/** Replicates all descendant values that already exist. */
const replicateDuplicateDescendants = async (state: State, id: ThoughtId, values: string[]) => {
  await replicateThought(id)
  if (values.length === 0) return
  const duplicate = findDescendant(state, id, values[0])
  if (duplicate) {
    await replicateDuplicateDescendants(state, duplicate, values.slice(1))
  }
}

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
    const importPath = path || HOME_PATH

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
            thoughtsImported: 0,
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
              thoughtsImported: file.thoughtsImported,
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

      const html = textToHtml(exported)

      // Close incomplete tags, preserve only allowed tags and attributes and decode the html.
      const htmlSanitized = unescape(
        sanitize(html, {
          allowedTags: ALLOWED_TAGS,
          allowedAttributes: ALLOWED_ATTRIBUTES,
          disallowedTagsMode: 'recursiveEscape',
        }),
      )
      const json = htmlToJson(htmlSanitized)
      const numThoughts = numBlocks(json)

      syncStatusStore.update({ importProgress: 0 / numThoughts })
      dispatch(alert(`Importing ${fileProgressString}...`, { alertType: AlertType.ImportFile }))

      const importTasks = mapBlocks(
        json,
        (block, ancestors, i) => async (): Promise<void> => {
          let state = getState()
          const path = ancestors.length === 0 ? importPath : file.path
          // get the context relative to the import root
          // the relative context is appended to the base context to get the destination context
          const relativeAncestorContext = ancestors.map(block => block.scope)
          // if inserting into an empty destination with a sibling afterwards, import into the parent
          const baseContext = pathToContext(
            state,
            insertBeforeNew
              ? rootedParentOf(state, path)
              : destEmpty && ancestors.length === 0
              ? rootedParentOf(state, path)
              : path,
          )
          const parentContext =
            ancestors.length === 0 ? baseContext : [...unroot(baseContext), ...relativeAncestorContext]
          // TODO: It would be better to get the id from importText rather than contextToPath
          const parentPath = contextToPath(state, parentContext)

          if (!parentPath) {
            throw new Error('Parent context does not exist to import into: ' + parentContext)
          }
          await replicateDuplicateDescendants(state, head(path), [...relativeAncestorContext, block.scope])
          state = getState()

          const emptyImportDestId = createId()

          const importThoughtPath =
            ancestors.length === 0 && destEmpty
              ? insertBeforeNew && !(destEmpty && i === 0)
                ? appendToPath(parentOf(importPath), emptyImportDestId)
                : i > 0
                ? rootedParentOf(state, path)
                : path
              : parentPath

          return new Promise<void>(resolve => {
            dispatch([
              ancestors.length === 0 && insertBeforeNew && !(destEmpty && i === 0)
                ? createThought({
                    path: rootedParentOf(state, importPath),
                    value: '',
                    rank: getRankBefore(state, simplifyPath(state, pathNew)),
                    id: emptyImportDestId,
                  })
                : null,
              setCursor({ path: destEmpty ? rootedParentOf(state, importPath) : importPath }),
              importText({
                // assume that all ancestors have already been created since we are importing in order
                // TODO: What happens if an ancestor gets deleted during an import?
                text: block.scope,
                // use the original import path for the first import of the first chunk
                // See: pathNew
                path: importThoughtPath,
                preventInline: true,
                preventSetCursor: true,
                idbSynced: async () => {
                  // update resumeImports with thoughtsImported
                  const importProgress = (i + 1) / numThoughts
                  const importProgressString = Math.round(importProgress * 100)
                  syncStatusStore.update({ importProgress })
                  dispatch(
                    alert(`Importing ${fileProgressString}... ${importProgressString}%`, {
                      alertType: AlertType.ImportFile,
                      clearDelay: i === numThoughts - 1 ? 5000 : undefined,
                    }),
                  )
                  await idb.update<Index<ResumeImport>>('resumeImports', resumeImports => {
                    return {
                      ...(resumeImports || {}),
                      [file.id]: {
                        id: file.id,
                        // use the original insertBefore for the first import of the first chunk
                        // See: insertBeforeNew
                        insertBefore: i === 0 ? insertBefore : file.insertBefore,
                        lastModified: file.lastModified,
                        thoughtsImported: i + 1,
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
        },
        { start: file.thoughtsImported },
      )

      // import thoughts serially
      // otherwise thoughts will get imported out of order
      await series(importTasks)

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
