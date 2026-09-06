const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Service from '../@types/Service'
import organizeThought from '../prompts/organizeThought'

const input = `[] milk
[1] apples
  [2] granny smith
[3] bananas`

const outline = [
  {
    id: null,
    text: 'Fruit',
    children: [
      { id: '1', text: null, children: [{ id: '2', text: null, children: [] }] },
      { id: '3', text: null, children: [] },
    ],
  },
]

beforeEach(() => {
  completeChat.mockReset()
})

it('returns the reorganized outline from one LLM request', async () => {
  completeChat.mockResolvedValueOnce({ outline })

  await expect(organizeThought(input)).resolves.toEqual(outline)
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
      service: Service.ORGANIZE_THOUGHT,
    }),
  )
})

it('rejects a response that omits an input id', async () => {
  completeChat.mockResolvedValueOnce({
    outline: [{ id: '1', text: null, children: [{ id: '2', text: null, children: [] }] }],
  })

  await expect(organizeThought(input)).rejects.toThrow(
    'The LLM did not return a valid reorganization of the input thoughts',
  )
})

it('rejects a response that invents an id', async () => {
  completeChat.mockResolvedValueOnce({
    outline: [
      { id: '1', text: null, children: [{ id: '2', text: null, children: [] }] },
      { id: '3', text: null, children: [] },
      { id: '99', text: null, children: [] },
    ],
  })

  await expect(organizeThought(input)).rejects.toThrow(
    'The LLM did not return a valid reorganization of the input thoughts',
  )
})
