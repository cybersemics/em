import Command from '../@types/Command'
import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import simplifyPath from '../selectors/simplifyPath'
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

/**
 * Generates a new value for the thought at the given path and applies it to the thought. If the thought is empty and
 * its first child is a URL, the title of the webpage is fetched; otherwise the value is generated with AI. The thought
 * is set to a pending value and marked as generating while the request is in flight. Returns the new value, or null if
 * no generation was performed.
 *
 * Takes an explicit path instead of reading state.cursor so that it can be run for every thought of a multiselect.
 * Cursor-specific side effects (cursorCleared and the caret at the end of the generated value) are the caller's
 * responsibility, since they apply to a single thought and this may be one of many running concurrently.
 */
const generateThoughtAtPathActionCreator =
  (path: Path): Thunk<Promise<string | null>> =>
  async (dispatch, getState) => {
    const state = getState()

    const simplePath = simplifyPath(state, path)
    const thought = getThoughtById(state, head(simplePath))
    if (!thought) return null

    // Do nothing if a generation is already in progress for this thought. Two overlapping runs would each restore their
    // own snapshot of the thought and race to edit it.
    if (thought.generating) return null

    const children = getChildrenRanked(state, thought.id)
    const firstChild = children[0]
    // Fetch the webpage title when the thought is empty and its first child is a URL. Otherwise generate with AI.
    const shouldFetchTitle = thought.value === '' && !!firstChild && isURL(firstChild.value)

    if (!shouldFetchTitle && !import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    const valuePending = `${thought.value}...`

    // set to pending while the value is being generated
    dispatch(
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
    )

    let valueNew = thought.value

    if (shouldFetchTitle) {
      try {
        const title = await fetchWebpageTitle(firstChild.value)
        valueNew = title || ''
      } catch {
        dispatch(error({ value: 'Failed to fetch webpage title' }))
        valueNew = ''
      }
    } else {
      // prompt with ancestors and siblings
      const ancestors = pathToContext(state, parentOf(simplePath))
      const siblingsText = children.map(child => (child.id === thought.id ? `${child.value}_` : child.value)).join('\n')

      // if there is only one child, then insert the "blank" at the end of the ancestor chain:
      //   e.g. Films/Watched/Carol/Starring:/_
      // Otherwise, insert it after all the children:
      //   e.g. Films/Watched/Carol/Starring:/
      //        Cate Blanchett
      //        Rooney Mara
      //        _
      const ancestorsText = ancestors.join('/')
      const input = `${ancestorsText}${children.length > 1 ? '/\n' : ''}${siblingsText}`

      // generate thought
      const res = await fetch(import.meta.env.VITE_AI_URL!, { method: 'POST', body: input })
      const { content, err } = (await res.json()) as { content: string; err: { status: number; message: string } }
      if (err) {
        if (err.status === 429) {
          dispatch(alert('Rate limit reached. Please try again later.'))
        } else {
          dispatch(error({ value: err.message }))
        }
      } else {
        // Trim the AI content to avoid double spaces
        const trimmedContent = content.trim()
        valueNew = `${thought.value}${thought.value && trimmedContent ? ' ' : ''}${trimmedContent}`
      }
    }

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
        force: true,
        oldValue: thought.value,
        newValue: valueNew,
        path: simplePath,
      }),
    ])

    return valueNew
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
    execMulticursor: (cursors, dispatch) => {
      /** Generates a thought for every selected thought within a single undo bracket. */
      const generateAll = async () => {
        // Yield before opening the undo bracket. executeCommandWithMulticursor is synchronous: it opens its own
        // bracket, calls execMulticursor, and closes the bracket again as soon as it returns — long before any
        // generation completes. A bracket opened here synchronously would be closed by that same run, and every
        // generated thought would land outside it and cost the user another undo.
        await Promise.resolve()

        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateThought' }))

        // Generate concurrently, so that the selection takes one round trip rather than one per thought and every
        // selected thought shows its pending state immediately. allSettled rather than all, so that a rejected request
        // cannot skip the dispatch below and leave the bracket open over the remaining generations.
        await Promise.allSettled(cursors.map(path => dispatch(generateThoughtAtPathActionCreator(path))))

        dispatch(setIsMulticursorExecuting({ value: false }))
      }

      generateAll()
    },
  },
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: async (dispatch, getState) => {
    const state = getState()

    // do nothing if generation is already in progress
    if (state.cursorCleared) return

    const cursor = state.cursor!

    // Render the cursor thought as an empty thought while its value is generated. cursorCleared is a single global
    // flag that only applies to the thought being edited, so it is set here rather than in generateThoughtAtPath.
    dispatch(cursorCleared({ value: true }))

    const valueNew = await dispatch(generateThoughtAtPathActionCreator(cursor))

    // editThought resets cursorCleared as part of the same reducer pass that updates the thought, which is what allows
    // the new value to reach the DOM. Resetting it here only has an effect when nothing was generated.
    dispatch([
      ...(valueNew !== null ? [setCursor({ path: cursor, offset: valueNew.length })] : []),
      cursorCleared({ value: false }),
    ])
  },
} satisfies Command

export default generateThought
