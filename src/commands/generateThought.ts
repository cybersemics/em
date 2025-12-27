import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
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

/** Generate a thought using AI. */
const generateThought: Command = {
  id: 'generateThought',
  label: 'Generate Thought',
  description: 'Generates a thought using AI.',
  // svg: Icon,
  keyboard: { key: 'g', meta: true, alt: true },
  gesture: 'ur',
  svg: GenerateThoughtIcon,
  multicursor: {
    disallow: true,
    error: 'Cannot generate multiple thoughts.',
  },
  canExecute: state => isDocumentEditable() && !!state.cursor,
  exec: async (dispatch, getState) => {
    const state = getState()

    // do nothing if generation is already in progress
    if (state.cursorCleared) return

    const simplePath = simplifyPath(state, state.cursor!)
    const thought = getThoughtById(state, head(simplePath))
    if (!thought) return

    // Check if current thought is empty and first child is a URL
    const isCurrentThoughtEmpty = thought.value === ''
    const children = getChildrenRanked(state, thought.id)
    const firstChild = children[0]
    const isFirstChildURL = firstChild && isURL(firstChild.value)
    const shouldFetchTitle = isCurrentThoughtEmpty && isFirstChildURL

    if (shouldFetchTitle) {
      // URL title fetching path
      const valuePending = '...'

      // set to pending while title is being fetched
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

      let valueNew = ''
      try {
        const title = await fetchWebpageTitle(firstChild.value)
        valueNew = title || ''
      } catch (err) {
        dispatch(error({ value: 'Failed to fetch webpage title' }))
        valueNew = ''
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
    } else {
      // AI generation path
      if (!import.meta.env.VITE_AI_URL) {
        throw new Error('import.meta.env.VITE_AI_URL is not configured')
      }

      const valuePending = `${thought.value}...`

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
    }
  },
}

export default generateThought
