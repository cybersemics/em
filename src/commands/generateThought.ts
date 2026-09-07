import Command from '../@types/Command'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import { HOME_TOKEN } from '../constants'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
import requestAiDisclosure from '../util/aiDisclosure'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import isURL from '../util/isURL'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'

/** Fetches the title of a webpage from its URL. */
const fetchWebpageTitle = async (url: string): Promise<string | null> => {
  // Ensure the URL has a protocol
  const fullUrl = url.startsWith('http') ? url : `https://${url}`

  const response = await fetch(fullUrl, {
    method: 'GET',
    mode: 'cors',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()

  // Extract title from HTML
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    // Decode HTML entities in the title content
    const rawTitle = titleMatch[1].trim()
    // Decode HTML entities manually for the most common ones
    const decodedTitle = rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')

    // Replace < and > with ( and ) to avoid HTML tag conflicts in the thought system
    const cleanTitle = decodedTitle.replace(/</g, '(').replace(/>/g, ')')

    return cleanTitle
  }

  return null
}

/** Returns true when generating the thought at the given path will send context to the AI service. */
const generatesWithAi = (state: State, path: Path) => {
  const simplePath = simplifyPath(state, path)
  const thought = getThoughtById(state, head(simplePath))
  if (!thought || thought.generating) return false
  const firstChild = getChildrenRanked(state, thought.id)[0]
  return thought.value !== '' || !firstChild || !isURL(firstChild.value)
}

/** A thought whose value is being generated, captured from the pre-generation snapshot. */
interface GenerationTarget {
  simplePath: SimplePath
  thought: Thought
  /** The URL whose webpage title becomes the value, or null when the value is generated with AI. */
  url: string | null
}

/** Builds the indented outline of a thought's ancestors and siblings that is sent to the AI service, marking the thought with [x] and its context with []. */
const buildInput = (state: State, { simplePath, thought }: GenerationTarget): string => {
  const ancestors = pathToContext(state, parentOf(simplePath))
  const siblings = getChildrenRanked(state, head(parentOf(simplePath)) ?? HOME_TOKEN)
  const ancestorLines = ancestors.map((ancestor, index) => `${'  '.repeat(index)}[]${ancestor ? ` ${ancestor}` : ''}`)
  const siblingIndent = '  '.repeat(ancestors.length)
  const siblingLines = siblings.map(
    sibling => `${siblingIndent}${sibling.id === thought.id ? '[x]' : '[]'}${sibling.value ? ` ${sibling.value}` : ''}`,
  )
  return [...ancestorLines, ...siblingLines].join('\n')
}

/**
 * Generates a new value for the thought at each of the given paths and applies it to the thought. If a thought is
 * empty and its first child is a URL, the title of the webpage is fetched; otherwise the value is generated with AI.
 * Every thought that is generated with AI is sent in one request and one LLM completion, and every prompt is built
 * from the same pre-generation snapshot. Each thought is set to a pending value and marked as generating while its
 * request is in flight. Returns the new values in path order, or null for a thought that was not generated.
 *
 * Takes an explicit list of paths instead of reading state.cursor so that it can be run for every thought of a
 * multiselect.
 * Cursor-specific side effects (cursorCleared and the caret at the end of the generated value) are the caller's
 * responsibility, since they apply to a single thought and this may be one of many.
 */
const generateThoughtAtPathsActionCreator =
  (paths: Path[]): Thunk<Promise<(string | null)[]>> =>
  async (dispatch, getState) => {
    const state = getState()

    const targets = paths.map(path => {
      const simplePath = simplifyPath(state, path)
      const thought = getThoughtById(state, head(simplePath))
      // Do nothing if a generation is already in progress for this thought. Two overlapping runs would each restore
      // their own snapshot of the thought and race to edit it.
      if (!thought || thought.generating) return null
      const firstChild = getChildrenRanked(state, thought.id)[0]
      // Fetch the webpage title when the thought is empty and its first child is a URL. Otherwise generate with AI.
      const url = thought.value === '' && !!firstChild && isURL(firstChild.value) ? firstChild.value : null
      return { simplePath, thought, url } satisfies GenerationTarget
    })
    const activeTargets = targets.filter(target => target !== null)
    const titleTargets = activeTargets.filter(
      (target): target is GenerationTarget & { url: string } => target.url !== null,
    )
    const aiTargets = activeTargets.filter(target => target.url === null)

    if (aiTargets.length > 0 && !import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    if (activeTargets.length === 0) return targets.map(() => null)

    // set to pending while the values are being generated
    dispatch(
      updateThoughts({
        thoughtIndexUpdates: Object.fromEntries(
          activeTargets.map(target => [
            target.thought.id,
            {
              ...target.thought,
              value: `${target.thought.value}...`,
              generating: true,
            },
          ]),
        ),
        lexemeIndexUpdates: {},
        local: false,
        remote: false,
        overwritePending: true,
      }),
    )

    /** Fetches the webpage title for a target, or an empty string when it cannot be fetched. */
    const generateTitle = async (target: GenerationTarget & { url: string }): Promise<string> => {
      try {
        const title = await fetchWebpageTitle(target.url)
        return title || ''
      } catch {
        dispatch(error({ value: 'Failed to fetch webpage title' }))
        return ''
      }
    }

    /** Generates every AI target in one request. Returns the original values when the request fails, so that the thoughts are restored. */
    const generateWithAi = async (): Promise<string[]> => {
      const originalValues = aiTargets.map(target => target.thought.value)
      if (aiTargets.length === 0) return originalValues

      try {
        const res = await fetch(`${import.meta.env.VITE_AI_URL!}/generateThought`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: aiTargets.map(target => buildInput(state, target)) }),
        })
        const response: unknown = await res.json()
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid AI response')
        }
        const generatedThoughts = 'thoughts' in response ? response.thoughts : undefined
        const errorMessage = 'error' in response ? response.error : undefined
        if (typeof errorMessage === 'string') {
          if (res.status === 429) {
            dispatch(alert('Rate limit reached. Please try again later.'))
          } else {
            dispatch(error({ value: errorMessage }))
          }
          return originalValues
        }

        // The batch is applied all or nothing: a response that is missing a thought cannot be matched to the selection.
        if (
          !Array.isArray(generatedThoughts) ||
          generatedThoughts.length !== aiTargets.length ||
          generatedThoughts.some(thought => typeof thought !== 'string' || !thought.trim())
        ) {
          throw new Error('Invalid AI response')
        }
        return generatedThoughts.map(thought => (thought as string).trim())
      } catch {
        dispatch(error({ value: 'Failed to generate thought' }))
        return originalValues
      }
    }

    // Fetch webpage titles concurrently with the single AI request, so that the selection takes one round trip.
    const [titles, aiValues] = await Promise.all([Promise.all(titleTargets.map(generateTitle)), generateWithAi()])
    const valuesNew = new Map<ThoughtId, string>([
      ...titleTargets.map((target, index) => [target.thought.id, titles[index]] as const),
      ...aiTargets.map((target, index) => [target.thought.id, aiValues[index]] as const),
    ])

    return targets.map(target => {
      if (!target) return null
      const { simplePath, thought } = target
      const valueNew = valuesNew.get(thought.id)!

      const thoughtPending = getThoughtById(getState(), thought.id)
      // bail if the thought was deleted while its value was being generated
      if (!thoughtPending) return null

      dispatch([
        // Restore the original value before applying the generated one. updateThoughts is not undoable, so the pending
        // value would otherwise become the state that undo reverts to, leaving the thought at "a..." rather than "a". It
        // is also why editThought was previously given an oldValue whose Lexeme was never created. Both updates are
        // dispatched in the same batch, so the restored value is never rendered.
        updateThoughts({
          thoughtIndexUpdates: {
            [thought.id]: {
              ...thoughtPending,
              value: thought.value,
              generating: false,
            },
          },
          lexemeIndexUpdates: {},
          local: false,
          remote: false,
          overwritePending: true,
        }),
        // editThought automatically sets Thought.generating to false
        editThought({
          cursorOffset: getState().isMulticursorExecuting ? undefined : valueNew.length,
          force: true,
          oldValue: thought.value,
          newValue: valueNew,
          path: simplePath,
          // The generation completes whenever the request returns, not as part of a typing stream, so it must never
          // merge with a user edit that happens to be contiguous in the same direction.
          preventMerge: true,
        }),
      ])

      return valueNew
    })
  }

/** Generate a thought using AI. */
const generateThought = {
  id: 'generateThought',
  label: 'Generate Thought' as const,
  description: 'Generates a thought using AI.',
  // svg: Icon,
  keyboard: { key: 'g', meta: true, alt: true },
  gesture: 'ur',
  svg: GenerateThoughtIcon,
  multicursor: {
    // preventSetCursor is not needed: execMulticursor never moves the cursor, so the restore at the end of the loop
    // sets it to the path it is already on.
    execMulticursor: (cursors, dispatch, getState) => {
      /** Generates a thought for every selected thought in one request within a single undo bracket. */
      const generateAll = async () => {
        // Yield before opening the undo bracket. executeCommandWithMulticursor is synchronous: it opens its own
        // bracket, calls execMulticursor, and closes the bracket again as soon as it returns — long before any
        // generation completes. A bracket opened here synchronously would be closed by that same run, and every
        // generated thought would land outside it and cost the user another undo.
        await Promise.resolve()

        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateThought' }))

        // finally rather than a bare await, so that a rejected request cannot skip the dispatch below and leave the
        // bracket open over subsequent edits.
        try {
          await dispatch(generateThoughtAtPathsActionCreator(cursors))
        } finally {
          dispatch(setIsMulticursorExecuting({ value: false }))
        }
      }

      /** Requests disclosure when any selected thought will use AI, then generates the full selection. */
      const generateAllWithDisclosure = () => {
        const usesAi = cursors.some(path => generatesWithAi(getState(), path))
        if (usesAi && requestAiDisclosure(generateAllWithDisclosure)) {
          dispatch(showModal({ id: 'aiDisclosure' }))
          return
        }
        generateAll()
      }

      generateAllWithDisclosure()
    },
  },
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: async (dispatch, getState, e, commandContext) => {
    const state = getState()

    // do nothing if generation is already in progress
    if (state.cursorCleared) return

    const cursor = state.cursor!

    if (
      generatesWithAi(state, cursor) &&
      requestAiDisclosure(() => generateThought.exec(dispatch, getState, e, commandContext))
    ) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return
    }

    // Render the cursor thought as an empty thought while its value is generated. cursorCleared is a single global
    // flag that only applies to the thought being edited, so it is set here rather than in generateThoughtAtPaths.
    dispatch(cursorCleared({ value: true }))

    const [valueNew] = await dispatch(generateThoughtAtPathsActionCreator([cursor]))

    // editThought resets cursorCleared as part of the same reducer pass that updates the thought, which is what allows
    // the new value to reach the DOM. Resetting it here only has an effect when nothing was generated.
    dispatch([
      ...(valueNew !== null ? [setCursor({ path: cursor, offset: valueNew.length })] : []),
      cursorCleared({ value: false }),
    ])
  },
} satisfies Command

export default generateThought
