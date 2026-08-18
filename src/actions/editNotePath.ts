import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { getAllChildren } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import createThought from './createThought'
import deleteThought from './deleteThought'
import editThought from './editThought'

interface NoteChild {
  id: ThoughtId
  value: string
}

interface Payload {
  children: NoteChild[]
  noteOffset?: number
  path: Path
  previousChildIds: ThoughtId[]
}

/** Reconciles the visible children referenced by a path-based note in a single undoable action. */
const editNotePath = (state: State, { children, noteOffset, path, previousChildIds }: Payload): State => {
  const parentId = head(path)
  if (!getThoughtById(state, parentId)) return state

  const childIds = new Set(getAllChildren(state, parentId))
  const nextChildIds = new Set(children.map(child => child.id))

  return reducerFlow([
    ...children.map(child => (state: State) => {
      const thought = getThoughtById(state, child.id)

      if (thought) {
        return thought.parentId === parentId
          ? editThought(state, {
              path: appendToPath(path, thought.id) as SimplePath,
              oldValue: thought.value,
              newValue: child.value,
            })
          : state
      }

      return createThought(state, {
        id: child.id,
        path,
        rank: getNextRank(state, parentId),
        value: child.value,
      })
    }),
    ...previousChildIds
      .filter(id => childIds.has(id) && !nextChildIds.has(id))
      .map(id => deleteThought({ pathParent: path, thoughtId: id })),
    noteOffset == null ? null : state => ({ ...state, noteOffset }),
  ])(state)
}

/** Action creator for editNotePath. */
export const editNotePathActionCreator =
  (payload: Parameters<typeof editNotePath>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editNotePath', ...payload })

export default _.curryRight(editNotePath)

registerActionMetadata('editNotePath', {
  undoable: true,
  isNavigation: false,
})
