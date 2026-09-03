import { afterEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Records the options that the OpenAI client is constructed with. Hoisted so that it is defined before vi.mock runs. */
const { constructOpenAI } = vi.hoisted(() => ({ constructOpenAI: vi.fn() }))

vi.mock('openai', async importOriginal => {
  const actual = await importOriginal<typeof import('openai')>()
  return {
    ...actual,
    /** A stand-in for the OpenAI client that records the key it is constructed with and returns a fixed completion. */
    default: class {
      chat = {
        completions: {
          parse: async () => ({ choices: [{ message: { parsed: { thought: 'California' } } }] }),
        },
      }

      /** Records the client options so that the test can assert on the API key. */
      constructor(options: { apiKey?: string }) {
        constructOpenAI(options)
      }
    },
  }
})

afterEach(() => {
  constructOpenAI.mockClear()
  vi.unstubAllEnvs()
})

it.each([
  [Service.DEFINE_TERMS, 'OPENAI_API_KEY_DEFINE_TERMS', 'define-terms-key'],
  [Service.GENERATE_EMOJI, 'OPENAI_API_KEY_GENERATE_EMOJI', 'generate-emoji-key'],
  [Service.GENERATE_THOUGHT, 'OPENAI_API_KEY_GENERATE_THOUGHT', 'generate-thought-key'],
] as const)('authenticates %s with its service key', async (service, environmentVariable, apiKey) => {
  vi.stubEnv(environmentVariable, apiKey)
  vi.stubEnv('OPENAI_API_KEY', 'shared-key')

  await completeChat({
    messages: [{ role: 'user', content: 'Complete this thought.' }],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    schema: z.object({ thought: z.string() }),
    service,
  })

  expect(constructOpenAI).toHaveBeenCalledWith({ apiKey })
})

it('falls back to the shared key when the service has no key of its own', async () => {
  vi.stubEnv('OPENAI_API_KEY_GENERATE_THOUGHT', undefined)
  vi.stubEnv('OPENAI_API_KEY', 'shared-key')

  await completeChat({
    messages: [{ role: 'user', content: 'The state after Arkansas alphabetically.' }],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    schema: z.object({ thought: z.string() }),
    service: Service.GENERATE_THOUGHT,
  })

  expect(constructOpenAI).toHaveBeenCalledWith({ apiKey: 'shared-key' })
})

it('throws when neither the service key nor the shared key is set', async () => {
  vi.stubEnv('OPENAI_API_KEY_GENERATE_THOUGHT', undefined)
  vi.stubEnv('OPENAI_API_KEY', undefined)

  await expect(
    completeChat({
      messages: [{ role: 'user', content: 'The state after Arkansas alphabetically.' }],
      model: Model.GPT_5_6_LUNA,
      reasoningEffort: ReasoningEffort.NONE,
      schema: z.object({ thought: z.string() }),
      service: Service.GENERATE_THOUGHT,
    }),
  ).rejects.toThrow('Missing OPENAI_API_KEY_GENERATE_THOUGHT and OPENAI_API_KEY')

  expect(constructOpenAI).not.toHaveBeenCalled()
})
