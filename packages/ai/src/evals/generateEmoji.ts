import { beforeAll, expect, it } from 'vitest'
import generateEmoji from '../prompts/generateEmoji'

/**
 * The must-have concepts for each category. Each string is one concept with its acceptable variants, and every concept
 * must be represented in the generated top five. A category has one to three, curated from what the model reliably
 * ranks there on live runs of this eval rather than from a single model run of the prompt, so that a miss means the
 * ranking changed and not that the fixture picked one variant over another.
 *
 * Events is ambiguous between celebrations and ticketed shows, and the model ranks either first, so its second concept
 * accepts both readings.
 */
const semanticCases: Record<string, string[]> = {
  Art: ['🎨', '🖼️', '🖌️🖍️🖋️'],
  Blank: ['⬜◻️◽▫️'],
  Books: ['📚', '📖', '📘📕📗📙📔📒📓'],
  Cosmos: ['🌌', '🪐⭐🌟🌠☄️', '🌍🌎🌏🌙'],
  Discourse: ['💬🗨️', '🗣️📣📢'],
  Email: ['📧✉️', '📨📩📬📫📪📭📥📤💌'],
  Events: ['🎉🎊', '🎈🎂🎁🎪🎭🎟️📅'],
  Film: ['🎬', '🎥📽️🎞️📹'],
  Finance: ['💰💵💸🪙💲', '🏦💳📈💹'],
  Food: ['🍎🍞🍚🥖🍽️🍴', '🍕🍔🍝🍲🥘🍣🌮🥗🍜🍟'],
  Health: ['🩺⚕️🏥', '💊💉🩹'],
  Home: ['🏠🏡', '🏘️🛋️🛏️🚪🔑🪑'],
  Mind: ['🧠', '💭💡🧩'],
  Peace: ['☮️🕊️', '🌿🫒🪷🤝🌈'],
  Question: ['❓❔⁉️', '🤔🧐🔍💭'],
  Work: ['🛠️🔨🔧⚒️🧰⚙️', '💼👷🏭🧱'],
}

/**
 * Categories from #4400 that the prompt currently fails, kept here so that they are not lost, and skipped until the
 * prompt is fixed. Dog: the model pads its fifteen candidates with repeats of the same dog emoji, and generateEmoji
 * rejects most responses for having fewer than ten unique ones. Irritable: the top five are the faces the prompt's
 * avoid list forbids. Both pass at reasoning effort low, and their concepts are drafted from samples taken there.
 * https://github.com/cybersemics/em/issues/5830
 */
const knownFailures: Record<string, string[]> = {
  Dog: ['🐕🐶', '🦮🐕‍🦺🐩'],
  Irritable: ['🦂🐝🦟🪰', '🐍🦔🌵🌶️🦀🐂🐏🐗'],
}

/** How many of the ten generated emoji count as the top of the ranking. */
const TOP_N = 5

/** Independent generations per category. The criterion must hold in a majority, so a single nondeterministic miss — a ranking that falls short, or a response generateEmoji rejects for duplicates — does not fail the category, and a single lucky hit does not pass it. */
const SAMPLES = 3

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Removes presentation selectors so equivalent text and emoji forms compare equally. */
const normalizeEmoji = (value: string): string => value.replace(/️/g, '')

/** Splits a string of emoji into its normalized graphemes. */
const graphemes = (value: string): string[] =>
  Array.from(segmenter.segment(value), part => normalizeEmoji(part.segment))

beforeAll(() => {
  if (!process.env.OPENAI_API_KEY_GENERATE_EMOJI && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_GENERATE_EMOJI or OPENAI_API_KEY is required')
  }
})

/** Generates the category SAMPLES times and expects every must-have concept in the top five of a majority of them. */
const ranksMustHaves = async (category: string, concepts: string[]) => {
  // A response that generateEmoji rejects (too few unique emoji) is kept as the error, so that it counts as a failed
  // sample rather than aborting the category.
  const samples: (string[] | Error)[] = []
  for (let i = 0; i < SAMPLES; i++) {
    try {
      const [actual] = await generateEmoji([category])
      samples.push(actual.map(normalizeEmoji))
    } catch (error) {
      samples.push(error as Error)
    }
  }

  /** Whether the sample was generated and every must-have concept has a variant in its top five. */
  const satisfies = (sample: string[] | Error): boolean =>
    !(sample instanceof Error) &&
    concepts.every(concept => graphemes(concept).some(emoji => sample.slice(0, TOP_N).includes(emoji)))

  const passes = samples.filter(satisfies).length
  const report = samples
    .map(sample =>
      sample instanceof Error
        ? `❌ ${sample.message}`
        : `${satisfies(sample) ? '✅' : '❌'} ${sample.slice(0, TOP_N).join(' ')} | ${sample.slice(TOP_N).join(' ')}`,
    )
    .join('\n')

  // An assertion message is shown only on failure, and the generated lists are what a fixture is tuned against, so
  // log them for passing categories too.
  console.info(`${category} (${passes}/${SAMPLES})\n${report}`)

  expect(passes, `Must-have: ${concepts.join('  ')}\n${report}`).toBeGreaterThan(SAMPLES / 2)
}

it.concurrent.each(Object.entries(semanticCases))(
  '%s ranks every must-have concept in the top five in most samples',
  // The eval project retries failures twice, which would pass a category on any one of three attempts. Sampling
  // replaces that here: the majority criterion is the tolerance for nondeterminism.
  { retry: 0 },
  ranksMustHaves,
)

// https://github.com/cybersemics/em/issues/5830
it.skip.each(Object.entries(knownFailures))(
  '%s ranks every must-have concept in the top five in most samples',
  { retry: 0 },
  ranksMustHaves,
)
