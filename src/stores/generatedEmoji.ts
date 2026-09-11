import ministore from './ministore'

interface GeneratedEmojiCacheEntry {
  /** Thought value without the generated emoji prefix. */
  baseValue: string
  /** Ordered alternatives returned by inference. */
  emojis: string[]
  /** Index of the emoji currently applied to the thought. */
  index: number
  /** Exact thought value produced by the command. */
  renderedValue: string
}

interface GeneratedEmojiState {
  entries: Record<string, GeneratedEmojiCacheEntry>
}

/** In-memory alternatives generated for each thought. */
const generatedEmoji = ministore<GeneratedEmojiState>({ entries: {} })

export default generatedEmoji
