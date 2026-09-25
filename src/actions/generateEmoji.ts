import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
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

/** A thought whose emoji are requested from the AI service, captured from the pre-generation snapshot. */
interface EmojiRequest {
  /** The thought value without the prefix that this command previously generated, which is the concept sent to the service. */
  baseValue: string
  /** The prefix that this command previously generated, or an empty string. */
  cachedPrefix: string
  /** True when the thought is the cursor, so that the caret can be preserved across the edit. */
  isCursor: boolean
  simplePath: SimplePath
  thought: Thought
}

/** Adds an emoji prefix to a thought value. */
const addEmojiPrefix = (emoji: string, value: string): string => `${emoji}${value ? ` ${value}` : ''}`

/**
 * Generates emoji for the thoughts at the given paths in one request, or instantly cycles cached alternatives for
 * thoughts that the command already generated.
 *
 * Pending text is a display-only overlay, leaving document values and memberships unchanged during inference.
 *
 * Takes an explicit list of paths instead of reading state.cursor so that every thought of a multiselect can be
 * generated in one request and one LLM completion.
 */
const generateEmoji =
  (paths: Path[]): Thunk<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState()
    const cursorPath = state.cursor ? simplifyPath(state, state.cursor) : null

    const thoughts = paths.flatMap(path => {
      const simplePath = simplifyPath(state, path)
      const thought = getThoughtById(state, head(simplePath))
      // Do nothing for a thought whose generation is already in progress.
      return thought && !thought.generating
        ? [
            {
              cache: generatedEmojiStore.getState().entries[thought.id],
              isCursor: !!cursorPath && equalPath(simplePath, cursorPath),
              simplePath,
              thought,
            },
          ]
        : []
    })

    // Cycle the cached alternatives without a request for each thought that still shows the value this command
    // produced.
    thoughts
      .filter(({ cache, thought }) => cache && thought.value === cache.renderedValue)
      .forEach(({ cache, isCursor, simplePath, thought }) => {
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
        generatedEmojiStore.update(state => ({
          entries: {
            ...state.entries,
            [thought.id]: { ...cache, index, renderedValue: value },
          },
        }))
      })

    const requests = thoughts
      .filter(({ cache, thought }) => !cache || thought.value !== cache.renderedValue)
      .map(({ cache, isCursor, simplePath, thought }) => {
        // If the concept was edited after this command generated its prefix, replace that prefix rather than stacking
        // a second generated emoji. Any other leading emoji is part of the user's source value and is preserved.
        const cachedEmoji = cache?.emojis[cache.index]
        const cachedPrefix =
          cachedEmoji && thought.value.startsWith(`${cachedEmoji} `)
            ? `${cachedEmoji} `
            : cachedEmoji === thought.value
              ? cachedEmoji
              : ''

        return {
          baseValue: cachedPrefix ? thought.value.slice(cachedPrefix.length) : thought.value,
          cachedPrefix,
          isCursor,
          simplePath,
          thought,
        } satisfies EmojiRequest
      })

    if (requests.length === 0) return

    if (!import.meta.env.VITE_AI_URL) {
      throw new Error('import.meta.env.VITE_AI_URL is not configured')
    }

    dispatch(
      updateThoughts({
        thoughtIndexUpdates: Object.fromEntries(
          requests.map(request => [
            request.thought.id,
            {
              ...request.thought,
              generating: true,
              displayValue: `${request.thought.value}...`,
            },
          ]),
        ),
        local: false,
        remote: false,
      }),
    )

    // The ten alternatives for each request, in request order, or null when the batch failed.
    let emojiLists: string[][] | null = null
    try {
      const response = await fetch(`${import.meta.env.VITE_AI_URL}/generateEmoji`, {
        body: JSON.stringify({ values: requests.map(request => request.baseValue) }),
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
        generatedEmojis.length === requests.length &&
        generatedEmojis.every(
          (emojis): emojis is string[] =>
            Array.isArray(emojis) && emojis.length === 10 && emojis.every(emoji => typeof emoji === 'string'),
        )
      ) {
        emojiLists = generatedEmojis
      } else {
        throw new Error('Invalid AI response')
      }
    } catch {
      dispatch(error({ value: 'Failed to generate emoji' }))
    }

    requests.forEach((request, index) => {
      const { baseValue, cachedPrefix, isCursor, simplePath, thought } = request
      const thoughtPending = getThoughtById(getState(), thought.id)
      // bail if the thought was deleted while its emoji were being generated
      if (!thoughtPending) return

      // Do not overwrite an edit that was made while inference was in flight.
      if (thoughtPending.value !== thought.value || !thoughtPending.generating) {
        if (thoughtPending.generating) {
          dispatch(
            updateThoughts({
              thoughtIndexUpdates: {
                [thought.id]: {
                  ...thoughtPending,
                  generating: false,
                  displayValue: undefined,
                },
              },
              local: false,
              remote: false,
            }),
          )
        }
        return
      }

      const emojis = emojiLists?.[index]
      const emoji = emojis?.[0]
      const value = emoji ? addEmojiPrefix(emoji, baseValue) : thought.value
      const newPrefixLength = emoji ? emoji.length + (baseValue ? 1 : 0) : 0
      const cursorOffsetDelta = emoji ? newPrefixLength - cachedPrefix.length : 0

      dispatch([
        // Clear the transient overlay before recording the generated edit in undo history.
        updateThoughts({
          thoughtIndexUpdates: {
            [thought.id]: {
              ...thoughtPending,
              generating: false,
              displayValue: undefined,
            },
          },
          local: false,
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

      if (!emoji || !emojis) return

      generatedEmojiStore.update(state => ({
        entries: {
          ...state.entries,
          [thought.id]: {
            baseValue,
            emojis,
            index: 0,
            renderedValue: value,
          },
        },
      }))
    })
  }

export default generateEmoji
