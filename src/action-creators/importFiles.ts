import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import createThought from '../action-creators/createThought'
import importText from '../action-creators/importText'
import getRankBefore from '../selectors/getRankBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import createId from '../util/createId'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Stream a file by chunk size and return whole lines. */
// See: https://stackoverflow.com/a/39505307/480608
function readLines(
  file: Blob,
  {
    chunkSizeBytes,
    data,
    complete,
  }: { chunkSizeBytes?: number; data?: (lines: string) => void; complete?: (err: DOMException | null) => void },
) {
  const chunkSize = chunkSizeBytes || 100000
  const decoder = new TextDecoder()
  let offset = 0
  let results = ''
  const fileReader = new FileReader()

  /** Reads the next chunk. */
  const seek = () => {
    if (offset !== 0 && offset >= file.size) {
      complete?.(null)
      return
    }
    const chunk = file.slice(offset, offset + chunkSize)
    fileReader.readAsArrayBuffer(chunk)
  }

  fileReader.onload = () => {
    // Use stream:true in case we cut the file
    // in the middle of a multi-byte character
    results += decoder.decode(fileReader.result as BufferSource, { stream: true })
    const lines = results.split('\n')
    offset += chunkSize

    // do not return partial lines
    // add them to the next chunk
    if (offset < file.size) {
      // eslint-disable-next-line fp/no-mutating-methods
      results = lines.pop()!
    }

    // yield all whole lines from this chunk
    if (lines.length > 0) {
      data?.(lines.join('\n') + '\n')
    }

    seek()
  }

  fileReader.onerror = () => {
    complete?.(fileReader.error)
  }

  seek()
}

/** Action-creator for importFiles. */
const importFilesActionCreator =
  ({
    path,
    files,
    insertBefore,
  }: {
    path: Path
    files: File[]
    // insert the imported thoughts before the path instead of in the path
    insertBefore?: boolean
  }): Thunk =>
  (dispatch, getState) => {
    const state = getState()

    const importPath = insertBefore ? ([...parentOf(path), createId()] as Path) : path

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

    files.forEach(file => {
      readLines(file, {
        data: text => {
          dispatch(importText({ text, path: importPath, preventSetCursor: true }))
        },
      })
    })
  }

export default importFilesActionCreator
