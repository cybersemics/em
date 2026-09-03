import { escape as escapeHtml, unescape as unescapeHtml } from 'html-escaper'
import Command from '../@types/Command'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import getThoughtById from '../selectors/getThoughtById'
import selectedPaths from '../selectors/selectedPaths'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import requestAiDisclosure from '../util/aiDisclosure'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import strip from '../util/strip'

/** Active Define Term request for each thought. */
const pendingDefinitions = new Map<ThoughtId, symbol>()

/** Returns the visible, decoded term represented by a thought value. */
const normalizeTerm = (value: string): string => unescapeHtml(strip(value))

/** Returns true when the thought at a path can be defined. */
const canDefineTermAtPath = (state: State, path: Path): boolean => {
  const thought = getThoughtById(state, head(simplifyPath(state, path)))
  if (!thought || thought.generating) return false
  const term = normalizeTerm(thought.value)
  return term.length > 0 && !term.includes(': ')
}

/** Defines the thought at a path and appends the definition if the source value is unchanged. */
const defineTermAtPath =
  (path: Path): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState()
    const simplePath = simplifyPath(state, path)
    const thought = getThoughtById(state, head(simplePath))
    if (!thought || !canDefineTermAtPath(state, simplePath)) return

    const originalValue = thought.value
    const term = normalizeTerm(originalValue)
    const requestId = Symbol()
    pendingDefinitions.set(thought.id, requestId)

    // Mark the thought as generating without changing its value. This prevents duplicate requests and displays the
    // existing pending indicator without creating an undoable edit.
    dispatch(
      updateThoughts({
        thoughtIndexUpdates: {
          [thought.id]: {
            ...thought,
            generating: true,
          },
        },
        lexemeIndexUpdates: {},
        local: false,
        overwritePending: true,
        remote: false,
      }),
    )

    try {
      if (!import.meta.env.VITE_AI_URL) {
        throw new Error('import.meta.env.VITE_AI_URL is not configured')
      }

      const response = await fetch(`${import.meta.env.VITE_AI_URL}/defineTerm`, {
        body: JSON.stringify({ term }),
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
        return
      }

      if (typeof definition !== 'string' || !definition.trim()) {
        throw new Error('Invalid AI response')
      }
      const normalizedDefinition = definition.trim().replace(/\s+/g, ' ')

      const currentState = getState()
      const currentThought = getThoughtById(currentState, thought.id)
      // A user edit clears Thought.generating. Do not overwrite it, even if the user changed the value back.
      if (
        !currentThought ||
        currentThought.value !== originalValue ||
        !currentThought.generating ||
        pendingDefinitions.get(thought.id) !== requestId
      )
        return

      const currentPath = thoughtToPath(currentState, thought.id)
      if (!currentPath) return

      dispatch(
        editThought({
          force: true,
          newValue: `${originalValue}: ${escapeHtml(normalizedDefinition)}`,
          oldValue: originalValue,
          path: simplifyPath(currentState, currentPath),
          preventMerge: true,
        }),
      )
    } catch {
      dispatch(error({ value: 'Failed to define term' }))
    } finally {
      if (pendingDefinitions.get(thought.id) !== requestId) return
      pendingDefinitions.delete(thought.id)
      const currentState = getState()
      const currentThought = getThoughtById(currentState, thought.id)
      if (currentThought?.generating && currentThought.value === originalValue) {
        dispatch(
          updateThoughts({
            thoughtIndexUpdates: {
              [thought.id]: {
                ...currentThought,
                generating: false,
              },
            },
            lexemeIndexUpdates: {},
            local: false,
            overwritePending: true,
            remote: false,
          }),
        )
      }
    }
  }

/** Defines the selected thoughts using AI and appends each definition. */
const defineTerm = {
  id: 'defineTerm',
  label: 'Define Term' as const,
  description: 'Appends a concise AI-generated dictionary definition to each selected thought.',
  gesture: 'url',
  svg: GenerateThoughtIcon,
  multicursor: {
    /** Defines all selected thoughts concurrently within one undo bracket. */
    execMulticursor: (cursors, dispatch) => {
      /** Waits for every definition request before closing the multicursor undo bracket. */
      const defineAll = async () => {
        await Promise.resolve()
        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'defineTerm' }))
        await Promise.allSettled(cursors.map(path => dispatch(defineTermAtPath(path))))
        dispatch(setIsMulticursorExecuting({ value: false }))
      }

      /** Requests disclosure before defining the full selection. */
      const defineAllWithDisclosure = () => {
        if (requestAiDisclosure(defineAllWithDisclosure)) {
          dispatch(showModal({ id: 'aiDisclosure' }))
          return
        }
        defineAll()
      }

      defineAllWithDisclosure()
    },
  },
  canExecute: state => {
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.length > 0 && paths.every(path => canDefineTermAtPath(state, path))
  },
  exec: async (dispatch, getState, event, commandContext) => {
    const cursor = getState().cursor
    if (!cursor) return

    if (requestAiDisclosure(() => defineTerm.exec(dispatch, getState, event, commandContext))) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return
    }

    await dispatch(defineTermAtPath(cursor))
  },
} satisfies Command

export default defineTerm
