const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Service from '../@types/Service'
import defineTerms from '../prompts/defineTerms'

beforeEach(() => {
  completeChat.mockReset()
})

it('returns definitions in term order using one LLM request', async () => {
  const dogDefinition = 'A domesticated canine mammal commonly kept for companionship, work, protection, or sport.'
  const appleDefinition = 'A round, edible fruit with crisp flesh that grows on trees.'
  completeChat.mockResolvedValueOnce({
    definition_0: dogDefinition,
    definition_1: `  ${appleDefinition}`,
  })

  await expect(defineTerms(['Dog', 'Apple'])).resolves.toEqual([dogDefinition, appleDefinition])
  expect(completeChat).toHaveBeenCalledTimes(1)
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('dictionary entry for each term in 10-20 words'),
          role: 'system',
        }),
        { content: 'Terms to define:\n\nDog\nApple', role: 'user' },
      ],
      service: Service.DEFINE_TERMS,
    }),
  )
})

it('builds a separate response field for arbitrary and duplicate terms', async () => {
  const definitions = Object.fromEntries([
    ['definition_0', 'A special JavaScript property name that should still receive a valid definition.'],
    ['definition_1', 'The first definition for a duplicate term in the original request.'],
    ['definition_2', 'The second definition for a duplicate term in the original request.'],
  ])
  completeChat.mockResolvedValueOnce(definitions)

  await defineTerms(['__proto__', 'duplicate', 'duplicate'])

  const schema = completeChat.mock.calls[0][0].schema
  expect(Object.entries(schema.parse(definitions))).toEqual(Object.entries(definitions))
})
