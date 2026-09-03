const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Service from '../@types/Service'
import defineTerm from '../prompts/defineTerm'
import UpstreamResponseError from '../UpstreamResponseError'

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

it('trims a valid definition before counting and returning it', async () => {
  completeChat.mockResolvedValueOnce({
    definition: '  Exactly ten separate words form this valid\npadded dictionary definition.  ',
  })

  await expect(defineTerm('Example')).resolves.toBe(
    'Exactly ten separate words form this valid padded dictionary definition.',
  )
})

it('retries a definition containing fewer than 10 words', async () => {
  completeChat
    .mockResolvedValueOnce({ definition: 'Too short.' })
    .mockResolvedValueOnce({
      definition: 'A sufficiently detailed replacement definition containing exactly ten clear words.',
    })

  await expect(defineTerm('Example')).resolves.toBe(
    'A sufficiently detailed replacement definition containing exactly ten clear words.',
  )
  expect(completeChat).toHaveBeenCalledTimes(2)
})

it('retries a definition containing more than 20 words', async () => {
  completeChat
    .mockResolvedValueOnce({
      definition:
        'This definition deliberately contains far more than twenty separate words so that the function rejects it before any invalid response can reach the client application.',
    })
    .mockResolvedValueOnce({
      definition: 'A sufficiently detailed replacement definition containing exactly ten clear words.',
    })

  await expect(defineTerm('Example')).resolves.toBe(
    'A sufficiently detailed replacement definition containing exactly ten clear words.',
  )
  expect(completeChat).toHaveBeenCalledTimes(2)
})

it('reports an invalid upstream response after the retry is exhausted', async () => {
  completeChat.mockResolvedValue({ definition: 'Still too short.' })
  const result = defineTerm('Example')

  await expect(result).rejects.toThrow(UpstreamResponseError)
  await expect(result).rejects.toThrow('The AI could not generate a 10–20 word definition. Please try again.')
  expect(completeChat).toHaveBeenCalledTimes(2)
})
