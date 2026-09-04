import { beforeAll, expect, it } from 'vitest'
import generateEmoji from '../prompts/generateEmoji'

const semanticCases: Record<string, string> = {
  Art: '🖼️🎨🖌️🖍️🧵🗿🎭🖋️🧶✨',
  Blank: '⬜◻️▫️🫥📄⚪⚫➖◽🔲',
  Books: '📚📖📘📕📗📙📓📔📒🔖',
  Cosmos: '🌌🪐✨🌠🌍🌎🌏☄️🌙⭐',
  Discourse: '💬🗨️📣🗣️🧠📢📝📰🎙️📖',
  Dog: '🐕🐶🦮🐾🦴🐕‍🦺🐩🐺🏠🦊',
  Email: '📧💌✉️📨📩📬📪📫🗳️📝',
  Events: '🎟️🎤🎪🎬🎉🎭🎫🎙️🎼📅',
  Film: '🎬🎥📽️🎞️🍿🎦🎭📺🎟️📹',
  Finance: '💰💹📈🏦💵💴💶💷🪙💳',
  Food: '🍽️🍳🥘🍞🥄🍴🥗🍎🥣🍲',
  Health: '🩺🏥💊🩹⚕️🩻🧬🦷🪥💉',
  Home: '🏡🏠🛋️🛏️🚪🪴🪑🛁🖼️🔑',
  Irritable: '🌵🦔🐡🦂🐝🐍🦀🌶️🦨🐗',
  Mind: '🧠💭🧩🔍🌀💡🪞📖🧘🎓',
  Peace: '☮️🕊️🪷🌿🕯️🤝🌈🫂🫒☀️',
  Question: '❓🤔⁉️🧠💬❔🔍🧐💭🗨️',
  Work: '🛠️🔨🔧🧰⚙️🏭🚜🪚⛏️🧱',
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Minimum expected examples required among all evaluated results. */
const TOTAL_RESULT_MATCH_THRESHOLD = 2

/** Removes presentation selectors so equivalent text and emoji forms compare equally. */
const normalizeEmoji = (value: string): string => value.replace(/\uFE0F/g, '')

beforeAll(() => {
  if (!process.env.OPENAI_API_KEY_GENERATE_EMOJI && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_GENERATE_EMOJI or OPENAI_API_KEY is required')
  }
})

it.concurrent.each(Object.entries(semanticCases))(
  '%s returns at least two expected emoji',
  async (category, expectedValue) => {
    const expected = [
      ...new Set(Array.from(segmenter.segment(expectedValue), part => normalizeEmoji(part.segment))),
    ]
    const [actual] = (await generateEmoji([category])).map(emojis => emojis.map(normalizeEmoji))
    const matches = actual.filter(emoji => expected.includes(emoji))

    expect(
      matches.length,
      `Expected: ${expected.join(' ')}\nActual: ${actual.join(' ')}\nMatches: ${matches.join(' ')}`,
    ).toBeGreaterThanOrEqual(TOTAL_RESULT_MATCH_THRESHOLD)
  },
)
