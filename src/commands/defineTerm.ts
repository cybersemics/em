import { escape as escapeHtml, unescape as unescapeHtml } from 'html-escaper'
import Command from '../@types/Command'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { createThoughtActionCreator as createThought } from '../actions/createThought'
import { errorActionCreator as error } from '../actions/error'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import getPrevRank from '../selectors/getPrevRank'
import getThoughtById from '../selectors/getThoughtById'
import selectedPaths from '../selectors/selectedPaths'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import requestAiDisclosure from '../util/aiDisclosure'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import strip from '../util/strip'

/** The immutable input captured for one thought in a Define Term request. */
interface DefinitionRequest {
  originalValue: string
  requestId: symbol
  term: string
  thought: Thought
}

/** Active Define Term request for each thought. */
const pendingDefinitions = new Map<ThoughtId, symbol>()

/** Returns the visible, decoded term represented by a thought value. */
const normalizeTerm = (value: string): string => unescapeHtml(strip(value))

/** Returns true when the thought at a path can be defined. */
const canDefineTermAtPath = (state: State, path: Path): boolean => {
  const thought = getThoughtById(state, head(simplifyPath(state, path)))
  if (!thought || thought.generating) return false
  return normalizeTerm(thought.value).length > 0
}

/** Defines all thoughts at the given paths in one API request and adds each definition as the first subthought of its unchanged source thought. */
const defineTermAtPaths =
  (paths: Path[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState()
    const requests = paths
      .map(path => {
        const simplePath = simplifyPath(state, path)
        const thought = getThoughtById(state, head(simplePath))
        if (!thought || !canDefineTermAtPath(state, simplePath)) return null
        return {
          originalValue: thought.value,
          requestId: Symbol(),
          term: normalizeTerm(thought.value),
          thought,
        } satisfies DefinitionRequest
      })
      .filter(request => request !== null)

    // Preserve all-or-nothing eligibility if the state changed after canExecute.
    if (requests.length !== paths.length) return

    requests.forEach(request => pendingDefinitions.set(request.thought.id, request.requestId))
    dispatch(
      updateThoughts({
        thoughtIndexUpdates: Object.fromEntries(
          requests.map(request => [
            request.thought.id,
            {
              ...request.thought,
              generating: true,
            },
          ]),
        ),
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
        body: JSON.stringify({ terms: requests.map(request => request.term) }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response')
      }

      const definitions = 'definitions' in result ? result.definitions : undefined
      const errorMessage = 'error' in result ? result.error : undefined
      if (typeof errorMessage === 'string') {
        if (response.status === 429) {
          dispatch(alert('Rate limit reached. Please try again later.'))
        } else {
          dispatch(error({ value: errorMessage }))
        }
        return
      }

      if (
        !Array.isArray(definitions) ||
        definitions.length !== requests.length ||
        definitions.some(definition => typeof definition !== 'string' || !definition.trim())
      ) {
        throw new Error('Invalid AI response')
      }

      requests.forEach((request, index) => {
        const currentState = getState()
        const currentThought = getThoughtById(currentState, request.thought.id)
        if (
          !currentThought ||
          currentThought.value !== request.originalValue ||
          !currentThought.generating ||
          pendingDefinitions.get(request.thought.id) !== request.requestId
        )
          return

        const currentPath = thoughtToPath(currentState, request.thought.id)
        if (!currentPath) return
        const definition = (definitions[index] as string).trim().replace(/\s+/g, ' ')

        dispatch(
          createThought({
            path: simplifyPath(currentState, currentPath),
            rank: getPrevRank(currentState, request.thought.id),
            value: escapeHtml(definition),
          }),
        )
      })
    } catch {
      dispatch(error({ value: 'Failed to define term' }))
    } finally {
      const currentState = getState()
      const thoughtIndexUpdates = Object.fromEntries(
        requests.flatMap(request => {
          if (pendingDefinitions.get(request.thought.id) !== request.requestId) return []
          pendingDefinitions.delete(request.thought.id)
          const currentThought = getThoughtById(currentState, request.thought.id)
          return currentThought?.generating && currentThought.value === request.originalValue
            ? [[request.thought.id, { ...currentThought, generating: false }]]
            : []
        }),
      )

      if (Object.keys(thoughtIndexUpdates).length > 0) {
        dispatch(
          updateThoughts({
            thoughtIndexUpdates,
            lexemeIndexUpdates: {},
            local: false,
            overwritePending: true,
            remote: false,
          }),
        )
      }
    }
  }

/** Defines the selected thoughts using one AI request and adds each definition as a subthought. */
const defineTerm = {
  id: 'defineTerm',
  label: 'Define Term' as const,
  description: 'Adds a concise AI-generated dictionary definition as a subthought of each selected thought.',
  gesture: 'url',
  svg: GenerateThoughtIcon,
  multicursor: {
    /** Defines all selected thoughts in one request within one undo bracket. */
    execMulticursor: (cursors, dispatch) => {
      /** Waits for the definition request before closing the multicursor undo bracket. */
      const defineAll = async () => {
        await Promise.resolve()
        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'defineTerm' }))
        try {
          await dispatch(defineTermAtPaths(cursors))
        } finally {
          dispatch(setIsMulticursorExecuting({ value: false }))
        }
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

    await dispatch(defineTermAtPaths([cursor]))
  },
} satisfies Command

export default defineTerm
