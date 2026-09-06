import _ from 'lodash'
import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import Path from '../@types/Path'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { removeMulticursorActionCreator as removeMulticursor } from '../actions/removeMulticursor'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import Icon from '../components/icons/NewSubthoughtIcon'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const exec = newThought({ insertNewSubthought: true })

const multicursor: Command['multicursor'] = {
  // Each selected thought is a distinct insertion parent, so execute once per selected thought.
  // A sibling filter would collapse a selection of siblings to a single insertion, silently discarding most of the selection.
  // preventSetCursor leaves the cursor in the last created subthought instead of restoring the old cursor.
  preventSetCursor: true,
  onComplete: (filteredCursors, dispatch, getState) => {
    const state = getState()

    // The new subthought is inserted with the highest rank in each selected thought, including in a sorted context.
    const newSubthoughtPaths = filteredCursors.reduce<Path[]>((accum, path) => {
      const lastChild = getThoughtById(state, head(path)) ? _.last(getChildrenRanked(state, head(path))) : null
      return lastChild ? [...accum, appendToPath(path, lastChild.id)] : accum
    }, [])

    dispatch(
      // A single selected thought behaves like the command without a multiselect: clear the selection so that the new subthought, which already has the cursor, can be typed into immediately.
      newSubthoughtPaths.length < 2
        ? [clearMulticursors()]
        : [
            // Move the selection from the selected thoughts to their new subthoughts. Thoughts are only expanded around the cursor and the multicursors, so otherwise every new subthought except the one with the cursor would be created out of sight.
            // Add the new subthoughts before removing the old selection so that the number of multicursors never passes through zero, which would close the Command Center on mobile.
            ...newSubthoughtPaths.map(path => addMulticursor({ path })),
            ...filteredCursors.map(path => removeMulticursor({ path })),
            // state.expanded is recalculated on setCursor, so set the cursor to apply the expansion of the new selection. The cursor is already in the last new subthought, so this does not move it.
            // The new subthoughts are selected rather than edited, so close the keyboard that each exec opened, otherwise the Command Center stays closed over the selection on mobile (see selectNewCursors in commands.ts).
            setCursor({ path: _.last(newSubthoughtPaths)!, isKeyboardOpen: false, preserveMulticursor: true }),
          ],
    )
  },
}

const newSubthoughtCommand = {
  id: 'newSubthought',
  label: 'New Subthought' as const,
  description: 'Create a new subthought in the current thought. Adds it to the bottom of any existing subthoughts.',
  gesture: 'rdr',
  keyboard: { key: Key.Enter, meta: true },
  multicursor,
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
} satisfies Command

export default newSubthoughtCommand
