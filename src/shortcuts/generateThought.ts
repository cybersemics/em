import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
// import Icon from '../components/icons/BoldTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'

/** Generate a thought using AI. */
const generateThought: Shortcut = {
  id: 'generateThought',
  label: 'Generate Thought',
  description: 'Generates a thought using AI.',
  // svg: Icon,
  keyboard: { key: 'g', meta: true, alt: true },
  gesture: 'ur',
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: async (dispatch, getState) => {
    if (!import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    const state = getState()

    // do nothing if generation is already in progress
    if (state.cursorCleared) return

    const simplePath = simplifyPath(state, state.cursor!)
    const thought = getThoughtById(state, head(simplePath))
    const valuePending = `${thought.value}...`

    // prompt with ancestors and siblings
    const ancestors = pathToContext(state, parentOf(simplePath))
    const children = getChildrenRanked(state, thought.parentId)
    const ancestorsText = ancestors.join('/')
    const siblingsText = children.map(child => (child.id === thought.id ? `${child.value}_` : child.value)).join('\n')

    // if there is only one child, then insert the "blank" at the end of the ancestor chain:
    //   e.g. Films/Watched/Carol/Starring:/_
    // Otherwise, insert it after all the children:
    //   e.g. Films/Watched/Carol/Starring:/
    //        Cate Blanchett
    //        Rooney Mara
    //        _
    const input = `${ancestorsText}${children.length > 1 ? '/\n' : ''}${siblingsText}`

    // set to pending while thought is being generated
    dispatch([
      updateThoughts({
        thoughtIndexUpdates: {
          [thought.id]: {
            ...thought,
            value: valuePending,
            generating: true,
          },
        },
        lexemeIndexUpdates: {},
        local: false,
        remote: false,
        overwritePending: true,
      }),
      cursorCleared({ value: true }),
    ])

    // generate thought
    let valueNew = thought.value
    const res = await fetch(import.meta.env.VITE_AI_URL!, { method: 'POST', body: input })
    const { content, err } = await res.json()
    if (err) {
      if (err.status === 429) {
        dispatch(alert('Rate limit reached. Please try again later.', { clearDelay: 3000 }))
      } else {
        dispatch(error({ value: err.message }))
      }
    } else {
      valueNew = `${thought.value ? thought.value + ' ' : ''}${content}`
    }

    // must reset cursorCleared before thought is updated for some reason, otherwise it is not updated in the DOM
    dispatch([
      // editThought automatically sets Thought.generating to false
      editThought({
        force: true,
        oldValue: valuePending,
        newValue: valueNew,
        path: simplePath,
      }),
      setCursor({ path: state.cursor, offset: valueNew.length }),
      cursorCleared({ value: false }),
    ])
  },
}

export default generateThought
