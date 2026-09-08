const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import generateThought from '../prompts/generateThought'

const potatoOutline = '[] Grocery list\n  [x] potato\n  [] carrot\n  [] onion'
const carrotOutline = '[] Grocery list\n  [] potato\n  [x] carrot\n  [] onion'

beforeEach(() => {
  completeChat.mockReset()
})

it('returns thoughts in outline order using one LLM request', async () => {
  completeChat.mockResolvedValueOnce({ thought_0: 'Potatoes', thought_1: '  Carrots ' })

  await expect(generateThought([potatoOutline, carrotOutline])).resolves.toEqual(['Potatoes', 'Carrots'])
  expect(completeChat).toHaveBeenCalledTimes(1)
  const systemContent = completeChat.mock.calls[0][0].messages[0].content
  expect(systemContent).toContain('generate a complete replacement thought')
  expect(systemContent).toContain('not only a suffix to append')
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('[x] identifies the thought that you will generate/replace'),
          role: 'system',
        }),
        {
          content: `Outline 0:\n\`\`\`\n${potatoOutline}\n\`\`\`\n\nOutline 1:\n\`\`\`\n${carrotOutline}\n\`\`\``,
          role: 'user',
        },
      ],
      model: Model.GPT_5_6_LUNA,
      reasoningEffort: ReasoningEffort.NONE,
      service: Service.GENERATE_THOUGHT,
    }),
  )
})

it('requires a non-empty replacement for every outline', async () => {
  completeChat.mockResolvedValueOnce({ thought_0: 'Potatoes', thought_1: 'Carrots' })

  await generateThought([potatoOutline, carrotOutline])

  const schema = completeChat.mock.calls[0][0].schema
  expect(schema.safeParse({ thought_0: 'Potatoes', thought_1: '  ' }).success).toBe(false)
  expect(schema.safeParse({ thought_0: 'Potatoes' }).success).toBe(false)
  expect(schema.safeParse({ thought_0: 'Potatoes', thought_1: 'Carrots' }).success).toBe(true)
})
