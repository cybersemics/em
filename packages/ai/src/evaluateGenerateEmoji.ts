import generateEmoji from './prompts/generateEmoji'

const cases: Record<string, string> = {
  Art: '🖼️🎨🖌️🖍️🧵🗿🎭🖋️🧶✨',
  Blank: '⬜◻️▫️🫥📄⚪⚫➖◽🔲',
  Books: '📚📖📘📕📗📙📓📔📒🔖',
  Cosmos: '🌌🪐✨🌠🌍🌎🌏☄️🌙⭐',
  Discourse: '💬🗨️📣🗣️🧠📢📝📰🎙️📖',
  Dog: '🐕🐶🦮🐾🦴🐕‍🦺🐩🐺🏠🦴',
  Email: '📧💌✉️📨📩📬📪📫🗳️📝',
  Events: '🎟️🎤🎪🎬🎉🎭🎫🎙️🎼📅',
  Film: '🎬🎥📽️🎞️🍿🎦🎭📺🎟️📹',
  Finance: '💰💹📈🏦💵💴💶💷🪙💳',
  Food: '🍽️🍳🥘🍞🥄🍴🥗🍎🥣🍲',
  Health: '🩺🏥💊🩹⚕️🩻🧬🦷🪥💉',
  Home: '🏡🏠🛋️🛏️🚪🪴🪑🛁🖼️🔑',
  Irritable: '🌵🦔🐡🦂🐝🐍🦀🌶️🦨🐗',
  Mind: '🧠💭🧩🔍🌀💡🪞📖🧘🎓',
  Peace: '☮️🕊️🪷🌿🕯️🤝🌈🫂🕊☀️',
  Question: '❓🤔⁉️🧠💬❔🔍🧐💭🗨️',
  Work: '🛠️🔨🔧🧰⚙️🏭🚜🪚⛏️🧱',
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Minimum expected examples required among all evaluated results. */
const TOTAL_RESULT_MATCH_THRESHOLD = 2

/** Removes presentation selectors so equivalent text and emoji forms compare equally. */
const normalizeEmoji = (value: string): string => value.replace(/\uFE0F/g, '')

/** Evaluates one semantic category against the configured fuzzy match thresholds. */
const evaluateCase = async (
  category: string,
  expectedValue: string,
  generateEmoji: (value: string) => Promise<string[]>,
) => {
  const expected = [
    ...new Set(Array.from(segmenter.segment(expectedValue), part => normalizeEmoji(part.segment))),
  ]

  try {
    const emojis = await generateEmoji(category)
    const actual = emojis.map(normalizeEmoji)
    const matches = actual.filter(emoji => expected.includes(emoji))
    return {
      actual,
      category,
      error: null,
      expected,
      matches,
      passed: matches.length >= TOTAL_RESULT_MATCH_THRESHOLD,
    }
  } catch (cause) {
    return {
      actual: [],
      category,
      error: cause instanceof Error ? cause.message : 'Generate Emoji failed',
      expected,
      matches: [],
      passed: false,
    }
  }
}

/** Evaluates Generate Emoji against the issue's nondeterministic semantic corpus. */
const main = async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }
  const results = await Promise.all(
    Object.entries(cases).map(([category, expected]) => evaluateCase(category, expected, generateEmoji)),
  )

  results.forEach(result => {
    const symbol = result.passed ? '✅' : '❌'
    if (result.error) {
      console.error(`${symbol} ${result.category}: Error:
${result.error}
`)
    } else {
    console.info(`${symbol} ${result.category}: ${result.matches.length} matches (minimum ${TOTAL_RESULT_MATCH_THRESHOLD})
     - Expected: ${result.expected.join(' ')}
     - Actual:   ${result.actual.join(' ')}
     - Matches:  ${result.matches.join(' ')}
`)
    }
  })

  const passedCount = results.filter(result => result.passed).length
  const failedCount = results.length - passedCount
  console.info(`
${passedCount} passed, ${failedCount} failed`)

  if (failedCount > 0) process.exitCode = 1
}

main()
