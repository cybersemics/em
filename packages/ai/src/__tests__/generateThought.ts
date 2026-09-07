const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import generateThought from '../prompts/generateThought'

const input = `[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x]
  [] Colorado`

beforeEach(() => {
  completeChat.mockReset()
})

it('returns the generated thought from one LLM request', async () => {
  completeChat.mockResolvedValueOnce({ thought: 'California' })

  await expect(generateThought(input)).resolves.toEqual('California')
  const systemContent = completeChat.mock.calls[0][0].messages[0].content
  expect(systemContent).toContain('Generate a complete replacement thought')
  expect(systemContent).toContain('not only a suffix to append')
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('Generate a complete replacement thought'),
          role: 'system',
        }),
        expect.objectContaining({
          content: expect.stringContaining(input),
          role: 'user',
        }),
      ],
      model: Model.GPT_5_6_LUNA,
      reasoningEffort: ReasoningEffort.NONE,
      service: Service.GENERATE_THOUGHT,
    }),
  )
})
