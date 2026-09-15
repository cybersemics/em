import type State from '../@types/State'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Clears matching committed writes or retains their edits with the reported failure. */
const recordThoughtWriteResult = (state: State, { writeIds, error }: { writeIds: string[]; error?: string }): State => {
  const completed = new Set(writeIds)
  const pendingThoughtWrites = Object.fromEntries(
    Object.entries(state.pendingThoughtWrites).flatMap(([id, write]) =>
      !completed.has(write.writeId) ? [[id, write]] : error !== undefined ? [[id, { ...write, error }]] : [],
    ),
  )
  return {
    ...state,
    pendingThoughtWrites,
  }
}

export default recordThoughtWriteResult

registerActionMetadata('recordThoughtWriteResult', { undoable: false })
