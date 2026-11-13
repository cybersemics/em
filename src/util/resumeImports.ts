import * as idb from 'idb-keyval'
import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import ResumeImport from '../@types/ResumeImport'
import abandonImportStore from '../stores/abandonImportStore'
import parseJsonSafe from './parseJsonSafe'
import storage from './storage'

// key for localStorage ResumeImport manifest
// base for idb resume import file
const RESUME_IMPORTS_KEY = 'resume-imports'

/** Generate the IDB key for a ResumeImport file. */
const resumeImportKey = (id: string) => `${RESUME_IMPORTS_KEY}-${id}`

/** Deletes the ResumeImport file manifest and raw file in IDB. */
const deleteResumeImport = async (id: string) => {
  await idb.del(resumeImportKey(id))
  const resumeImports = parseJsonSafe<Index<ResumeImport>>(storage.getItem(RESUME_IMPORTS_KEY) || '{}', {})
  storage.setItem(RESUME_IMPORTS_KEY, JSON.stringify(_.omit(resumeImports, id)))
}

/** Creates a small object that can be used to manage the persistence of a ResumeImport while it is being imported. */
const manager = (file: ResumeImport) => {
  /** Updates the persisted ResumeImport file to the latest number of imported thoughts. */
  // TODO: throttling update breaks resume file.path for some reason
  const update = async (path: Path | null, thoughtsImported: number, insertBefore?: boolean) => {
    if (abandonImportStore.getState()) return

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

  /** Initializes the ResumeImport file manifest and raw file in IDB. */
  const init = async (text: string) => {
    await update(file.path, 0, file.insertBefore)
    await idb.set(resumeImportKey(file.id), text)
  }

  return { del: () => deleteResumeImport(file.id), init, update }
}

/** Lists the unfinished imports recorded in the manifest. Synchronous, since the manifest is in localStorage, so that their names are known before their raw text has been read. */
const list = (): ResumeImport[] => {
  const resumeImports = parseJsonSafe<Index<ResumeImport>>(storage.getItem(RESUME_IMPORTS_KEY) || '{}', {})
  return Object.values(resumeImports).map(resumeImport => ({
    id: resumeImport.id,
    insertBefore: resumeImport.insertBefore,
    lastModified: resumeImport.lastModified,
    thoughtsImported: resumeImport.thoughtsImported,
    name: resumeImport.name,
    path: resumeImport.path,
    size: resumeImport.size,
  }))
}

/** Reads the raw text of each of the given unfinished imports from IDB, so that it can be handed to the import to resume from its checkpoint. A missing raw text is read as empty, which imports nothing and deletes the manifest. */
const withText = (resumeImports: ResumeImport[]): Promise<(ResumeImport & { text: string })[]> =>
  Promise.all(
    resumeImports.map(async resumeImport => {
      const text = await idb.get<string>(resumeImportKey(resumeImport.id))
      if (text == null) {
        console.warn(`Resume file missing from IDB: ${resumeImport.id}`, resumeImport)
      }
      return { ...resumeImport, text: text ?? '' }
    }),
  )

/** Persistence of unfinished file imports, so that an import interrupted by a refresh or crash is resumed on the next initialize. The localStorage manifest records each import's destination and the number of thoughts imported so far, and the raw text is stored in IDB. */
const resumeImports = { delete: deleteResumeImport, list, manager, withText }

export default resumeImports
