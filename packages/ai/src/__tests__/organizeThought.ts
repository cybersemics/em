const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import organizeThought from '../prompts/organizeThought'

const input = `[] milk
[1] apples
  [2] granny smith
[3] bananas`

const outline = `[new] Fruit
  [1] apples
    [2] granny smith
  [3] bananas`

beforeEach(() => {
  completeChat.mockReset()
})

it('returns the reorganized outline from one LLM request', async () => {
  completeChat.mockResolvedValueOnce({ outline })

  await expect(organizeThought(input)).resolves.toEqual(outline)
  const systemContent = completeChat.mock.calls[0][0].messages[0].content
  expect(systemContent).toContain('Example 1')
  expect(systemContent).toContain('Example 2')
  expect(systemContent).toContain('Example 3')
  expect(systemContent).toContain('leftover buckets')
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('You will be given an indented outline of values'),
          role: 'system',
        }),
        expect.objectContaining({
          content: expect.stringContaining(input),
          role: 'user',
        }),
      ],
      reasoningEffort: ReasoningEffort.LOW,
      service: Service.ORGANIZE_THOUGHT,
    }),
  )
})
