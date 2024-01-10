import Shortcut from '../@types/Shortcut'
import alert from '../action-creators/alert'
import cursorCleared from '../action-creators/cursorCleared'
import editThoughtActionCreator from '../action-creators/editThought'
import error from '../action-creators/error'
import setCursorActionCreator from '../action-creators/setCursor'
import updateThoughtsActionCreator from '../action-creators/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
// import Icon from '../components/icons/BoldTextIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'

/** Repeats a string n time. */
const repeat = (s: string, n: number) => new Array(n).fill(s).join('')

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
    if (!process.env.REACT_APP_AI_URL) {
      throw new Error('process.env.REACT_APP_AI_URL is not configured')
    }

    const state = getState()

    // do nothing if generation is already in progress
    if (state.cursorCleared) return

    const simplePath = simplifyPath(state, state.cursor!)
    const thought = getThoughtById(state, head(simplePath))
    const valuePending = `${thought.value}...`

    // prompt with ancestors and siblings
    const ancestors = pathToContext(state, parentOf(simplePath))
    const siblings = getChildrenRanked(state, thought.parentId)
    const ancestorsText = ancestors.map((value, i) => `${repeat('  ', i)}- ${value}`).join('\n')
    const siblingsText = siblings.map(child => `${repeat('  ', ancestors.length)}- ${child.value}`).join('\n')
    const input = `${ancestorsText}\n${siblingsText}`

    // set to pending while thought is being generated
    dispatch([
      updateThoughtsActionCreator({
        thoughtIndexUpdates: {
          [thought.id]: {
            ...thought,
            value: valuePending,
            pending: true,
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
    const res = await fetch(process.env.REACT_APP_AI_URL!, { method: 'POST', body: input })
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
      editThoughtActionCreator({
        force: true,
        oldValue: valuePending,
        newValue: valueNew,
        path: simplePath,
      }),
      setCursorActionCreator({ path: state.cursor, offset: valueNew.length }),
      cursorCleared({ value: false }),
    ])
  },
}

export default generateThought
