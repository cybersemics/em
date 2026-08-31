const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Service from '../@types/Service'
import defineTerm from '../prompts/defineTerm'

beforeEach(() => {
  completeChat.mockReset()
})

it('returns a 10–20 word dictionary entry for the term', async () => {
  const definition = 'A domesticated canine mammal commonly kept for companionship, work, protection, or sport.'
  completeChat.mockResolvedValueOnce({ definition })

  await expect(defineTerm('Dog')).resolves.toBe(definition)
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('dictionary entry for the given term in 10-20 words'),
          role: 'system',
        }),
        { content: 'Dog', role: 'user' },
      ],
      service: Service.DEFINE_TERM,
    }),
  )
})

it('rejects definitions containing fewer than 10 words', async () => {
  completeChat.mockResolvedValueOnce({ definition: 'Too short.' })

  await expect(defineTerm('Example')).rejects.toThrow('The definition must contain at least 10 words')
})

it('rejects definitions containing more than 20 words', async () => {
  completeChat.mockResolvedValueOnce({
    definition:
      'This definition deliberately contains far more than twenty separate words so that the function rejects it before any invalid response can reach the client application.',
  })

  await expect(defineTerm('Example')).rejects.toThrow('The definition must contain at most 20 words')
})
