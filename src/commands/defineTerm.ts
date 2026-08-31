import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { errorActionCreator as error } from '../actions/error'
import { showModalActionCreator as showModal } from '../actions/showModal'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import getThoughtById from '../selectors/getThoughtById'
import requestAiDisclosure from '../util/aiDisclosure'
import head from '../util/head'

/** Defines the current thought using AI and displays the definition in an alert. */
const defineTerm = {
  id: 'defineTerm',
  label: 'Define Term' as const,
  description: 'Writes a concise dictionary definition for the current thought using AI.',
  gesture: 'url',
  svg: GenerateThoughtIcon,
  multicursor: false,
  canExecute: state => !!state.cursor && !!getThoughtById(state, head(state.cursor)),
  exec: async (dispatch, getState, event, commandContext) => {
    const cursor = getState().cursor
    if (!cursor) return

    if (requestAiDisclosure(() => defineTerm.exec(dispatch, getState, event, commandContext))) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return
    }

    const thought = getThoughtById(getState(), head(cursor))
    if (!thought) return
    if (!import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_AI_URL}/defineTerm`, {
        body: JSON.stringify({ term: thought.value }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response')
      }

      const definition = 'definition' in result ? result.definition : undefined
      const errorMessage = 'error' in result ? result.error : undefined
      if (typeof errorMessage === 'string') {
        if (response.status === 429) {
          dispatch(alert('Rate limit reached. Please try again later.'))
        } else {
          dispatch(error({ value: errorMessage }))
        }
      } else if (typeof definition === 'string' && definition.trim()) {
        dispatch(alert(definition.trim()))
      } else {
        throw new Error('Invalid AI response')
      }
    } catch {
      dispatch(error({ value: 'Failed to define term' }))
    }
  },
} satisfies Command

export default defineTerm
