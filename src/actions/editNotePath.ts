import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { getChildrenRanked, getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import command from '../util/command'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import createThought from './createThought'
import deleteThought from './deleteThought'
import editThought from './editThought'

interface Payload {
  noteOffset?: number
  path: Path
  values: string[]
}

/** Reconciles the visible children referenced by a path-based note in a single undoable action. */
const editNotePath = (
  state: State,
  { noteOffset, path, values }: Payload,
  document?: ThoughtspaceTransaction,
): State => {
  const parentId = head(path)
  if (!getThoughtById(state, parentId)) return state

  const currentChildren = getChildrenSorted(state, parentId)
  const matchedChildIds = new Set(
    values.flatMap((value, index) => (currentChildren[index]?.value === value ? [currentChildren[index].id] : [])),
  )

  // Preserve unchanged values before assigning edited values so sorting changes do not redirect subsequent edits.
  const exactMatches = values.map((value, index) => {
    const samePositionChild = currentChildren[index]
    if (samePositionChild?.value === value) return samePositionChild

    const child = currentChildren.find(child => child.value === value && !matchedChildIds.has(child.id))
    if (child) matchedChildIds.add(child.id)
    return child
  })

  const children = values.map((value, index) => {
    const exactMatch = exactMatches[index]
    if (exactMatch) return { id: exactMatch.id, value }

    const child = currentChildren.find(child => !matchedChildIds.has(child.id))
    if (child) matchedChildIds.add(child.id)
    return { id: child?.id, value }
  })

  return reducerFlow([
    ...children.map(child => (state: State) => {
      const thought = child.id ? getThoughtById(state, child.id) : undefined

      if (thought) {
        return thought.parentId === parentId
          ? editThought(
              state,
              {
                path: appendToPath(path, thought.id) as SimplePath,
                oldValue: thought.value,
                newValue: child.value,
              },
              document,
            )
          : state
      }

      return createThought(
        state,
        {
          path,
          afterId: getChildrenRanked(state, parentId).at(-1)?.id ?? null,
          value: child.value,
        },
        document,
      )
    }),
    ...currentChildren
      .map(child => child.id)
      .filter(id => !matchedChildIds.has(id))
      .map(id => deleteThought({ pathParent: path, thoughtId: id })),
    noteOffset == null ? null : state => ({ ...state, noteOffset }),
  ])(state, document)
}

/** Action creator for editNotePath. */
export const editNotePathActionCreator =
  (payload: Parameters<typeof editNotePath>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'editNotePath', ...payload })

export default command(editNotePath)

registerActionMetadata('editNotePath', {
  undoable: true,
  isNavigation: false,
})
