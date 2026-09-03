import emojiRegex from 'emoji-regex'
import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Regular expression for matching emoji. */
const EMOJI_REGEX = emojiRegex()

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Returns true when a value consists of exactly one emoji grapheme. */
const isSingleEmoji = (value: string): boolean => {
  const graphemes = Array.from(segmenter.segment(value))
  const matches = value.match(EMOJI_REGEX)
  return graphemes.length === 1 && matches?.length === 1 && matches[0] === value
}

/** Generates ten ordered emoji that represent a thought value. The LLM returns 15 candidates, and we filter out duplicates and invalid emoji to return ten. */
const generateEmoji = async (value: string): Promise<string[]> => {
  const { emojis } = await completeChat({
    messages: [
      {
        role: 'system',
        content: `Choose fifteen distinct emoji that best represent the given concept.

Hard requirements:
- Return exactly fifteen *UNIQUE* candidates.
- Every candidate must be a single emoji grapheme.
- You *MUST* not return the same emoji more than once.

Prioritize:
- concrete, self-contained subjects whose inherent physical form embodies the concept
- representations where the association comes from the subject's stable, defining characteristics
- natural-world symbols before conventional reaction marks, effects, or event imagery
- instantly recognizable silhouettes with one dominant visual attribute
- symbols that work without relying on facial expressions, motion, or surrounding context
- widely recognized and visually unambiguous emoji

Avoid:
- generic reaction or decorative emoji
- smileys and facial expressions
- symbols representing only a brief emotional episode
- abstract marks when a concrete subject can communicate the same idea
- unrelated office, communication, or technology emoji

Order them from most to least semantically precise and culturally recognizable.`,
      },
      { role: 'user', content: value },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    service: Service.GENERATE_EMOJI,
    schema: z.object({
      emojis: z
        .array(z.string())
        .length(15)
        .describe(
          'Exactly fifteen distinct emoji graphemes ordered from most to least semantically precise and culturally recognizable.',
        ),
    }),
  })

  const uniqueEmojis = emojis.filter(
    (emoji, index) => isSingleEmoji(emoji) && emojis.findIndex(candidate => candidate === emoji) === index,
  )

  if (uniqueEmojis.length < 10) {
    throw new Error(`The LLM did not return 10 unique emoji: ${JSON.stringify(emojis)}`)
  }

  return uniqueEmojis.slice(0, 10)
}

export default generateEmoji
