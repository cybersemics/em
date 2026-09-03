import { last } from 'lodash'
import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import NewSubthoughtAboveIcon from '../components/icons/NewSubthoughtAboveIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const exec = newThought({ insertNewSubthought: true, insertBefore: true })

const newSubthoughtTopCommand = {
  id: 'newSubthoughtTop',
  label: 'New Subthought (above)' as const,
  description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
  gesture: 'rdu',
  keyboard: { key: Key.Enter, shift: true, meta: true },
  multicursor: {
    // preventSetCursor and clearMulticursor disable the generic restore of the old cursor and the old selection at the end of the multicursor loop, since execMulticursor sets both itself.
    preventSetCursor: true,
    clearMulticursor: true,
    // Each selected thought is a distinct insertion parent, so create a new subthought in each one.
    // The new subthoughts must then be selected, since a selected thought expands its parent (see expandThoughts): otherwise every new subthought except the one under the cursor would be created inside a collapsed thought and never appear.
    execMulticursor: (cursors, dispatch, getState) => {
      // No path is recomputed between iterations, as creating a subthought does not move any of the selected thoughts.
      const newSubthoughtPaths = cursors.map(path => {
        dispatch([setCursor({ path }), exec])
        // newThought sets the cursor to the new subthought.
        return getState().cursor
      })

      dispatch([
        ...newSubthoughtPaths.map(path => path && addMulticursor({ path })),
        // The cursor is already in the last new subthought, but addMulticursor does not recalculate state.expanded, so re-setting it is what expands the selected thoughts and reveals their new subthoughts.
        // The new subthoughts are selected rather than edited, so close the keyboard that each exec opened, otherwise the Command Center stays closed over the selection on mobile (see selectNewCursors in commands.ts).
        setCursor({
          path: last(newSubthoughtPaths) ?? null,
          isKeyboardOpen: false,
          offset: 0,
          preserveMulticursor: true,
        }),
      ])
    },
  },
  svg: NewSubthoughtAboveIcon,
  canExecute: () => isDocumentEditable(),
  exec,
} satisfies Command

export default newSubthoughtTopCommand
