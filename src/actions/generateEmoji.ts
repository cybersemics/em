import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import generatedEmojiStore from '../stores/generatedEmoji'
import equalPath from '../util/equalPath'
import head from '../util/head'
import { alertActionCreator as alert } from './alert'
import { editThoughtActionCreator as editThought } from './editThought'
import { errorActionCreator as error } from './error'
import { updateThoughtsActionCreator as updateThoughts } from './updateThoughts'

interface GeneratedEmojiResult {
  /** Change in the leading generated prefix length, used to preserve the logical caret position. */
  cursorOffsetDelta: number
  /** Generated thought value. */
  value: string
}

/** Adds an emoji prefix to a thought value. */
const addEmojiPrefix = (emoji: string, value: string): string => `${emoji}${value ? ` ${value}` : ''}`

/** Updates the in-memory generated emoji cache for a thought. */
const setCacheEntry = (
  id: string,
  entry: {
    baseValue: string
    emojis: string[]
    index: number
    renderedValue: string
  },
) => {
  generatedEmojiStore.update(state => ({
    entries: {
      ...state.entries,
      [id]: entry,
    },
  }))
}

/**
 * Generates emoji for the thought at a path, or instantly cycles cached alternatives.
 *
 * The pending value is applied outside undo history and restored before the final edit so Undo returns to the actual
 * source thought rather than its temporary ellipsis state.
 */
const generateEmoji =
  (path: Path): Thunk<Promise<GeneratedEmojiResult | null>> =>
  async (dispatch, getState) => {
    const state = getState()
    const simplePath = simplifyPath(state, path)
    const thought = getThoughtById(state, head(simplePath))
    if (!thought || thought.generating) return null

    const cache = generatedEmojiStore.getState().entries[thought.id]
    const isCursor = !!state.cursor && equalPath(simplePath, simplifyPath(state, state.cursor))

    if (cache && thought.value === cache.renderedValue) {
      const index = (cache.index + 1) % cache.emojis.length
      const value = addEmojiPrefix(cache.emojis[index], cache.baseValue)
      const cursorOffsetDelta = cache.emojis[index].length - cache.emojis[cache.index].length

      dispatch(
        editThought({
          ...(isCursor && !state.isMulticursorExecuting && state.cursorOffset != null
            ? { cursorOffset: Math.max(0, state.cursorOffset + cursorOffsetDelta) }
            : null),
          force: true,
          newValue: value,
          oldValue: thought.value,
          path: simplePath,
          preventMerge: true,
        }),
      )
      setCacheEntry(thought.id, { ...cache, index, renderedValue: value })
      return { cursorOffsetDelta, value }
    }

    if (!import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    // If the concept was edited after this command generated its prefix, replace that prefix rather than stacking a
    // second generated emoji. Any other leading emoji is part of the user's source value and is preserved.
    const cachedEmoji = cache?.emojis[cache.index]
    const cachedPrefix =
      cachedEmoji && thought.value.startsWith(`${cachedEmoji} `)
        ? `${cachedEmoji} `
        : cachedEmoji === thought.value
          ? cachedEmoji
          : ''
    const baseValue = cachedPrefix ? thought.value.slice(cachedPrefix.length) : thought.value
    const valuePending = `${thought.value}...`

    dispatch(
      updateThoughts({
        thoughtIndexUpdates: {
          [thought.id]: {
            ...thought,
            generating: true,
            value: valuePending,
          },
        },
        lexemeIndexUpdates: {},
        local: false,
        overwritePending: true,
        remote: false,
      }),
    )

    let emojis: string[] | null = null
    try {
      const response = await fetch(`${import.meta.env.VITE_AI_URL}/generateEmoji`, {
        body: JSON.stringify({ value: baseValue }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response')
      }

      const generatedEmojis = 'emojis' in result ? result.emojis : undefined
      const errorMessage = 'error' in result ? result.error : undefined
      if (typeof errorMessage === 'string') {
        if (response.status === 429) {
          dispatch(alert('Rate limit reached. Please try again later.'))
        } else {
          dispatch(error({ value: errorMessage }))
        }
      } else if (
        Array.isArray(generatedEmojis) &&
        generatedEmojis.length === 10 &&
        generatedEmojis.every(emoji => typeof emoji === 'string')
      ) {
        emojis = generatedEmojis
      } else {
        throw new Error('Invalid AI response')
      }
    } catch {
      dispatch(error({ value: 'Failed to generate emoji' }))
    }

    const thoughtPending = getThoughtById(getState(), thought.id)
    if (!thoughtPending) return null

    // Do not overwrite an edit that was made while inference was in flight.
    if (thoughtPending.value !== valuePending || !thoughtPending.generating) {
      if (thoughtPending.generating) {
        dispatch(
          updateThoughts({
            thoughtIndexUpdates: {
              [thought.id]: {
                ...thoughtPending,
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
      return null
    }

    const emoji = emojis?.[0]
    const value = emoji ? addEmojiPrefix(emoji, baseValue) : thought.value
    const newPrefixLength = emoji ? emoji.length + (baseValue ? 1 : 0) : 0
    const cursorOffsetDelta = emoji ? newPrefixLength - cachedPrefix.length : 0

    dispatch([
      updateThoughts({
        thoughtIndexUpdates: {
          [thought.id]: {
            ...thoughtPending,
            generating: false,
            value: thought.value,
          },
        },
        lexemeIndexUpdates: {},
        local: false,
        overwritePending: true,
        remote: false,
      }),
      ...(emoji
        ? [
            editThought({
              ...(isCursor && !getState().isMulticursorExecuting && state.cursorOffset != null
                ? { cursorOffset: Math.max(0, state.cursorOffset + cursorOffsetDelta) }
                : null),
              force: true,
              newValue: value,
              oldValue: thought.value,
              path: simplePath,
              preventMerge: true,
            }),
          ]
        : []),
    ])

    if (!emoji || !emojis) return null

    setCacheEntry(thought.id, {
      baseValue,
      emojis,
      index: 0,
      renderedValue: value,
    })
    return { cursorOffsetDelta, value }
  }

export default generateEmoji
