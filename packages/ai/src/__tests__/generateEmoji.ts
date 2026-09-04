const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import Service from '../@types/Service'
import generateEmoji from '../prompts/generateEmoji'

const candidates = ['🐕', '🐶', '🦮', '🐾', '🦴', '🐕‍🦺', '🐩', '🐺', '🏠', '🦊', '🌳', '⚽', '🚶', '🛋️', '❤️']
const bookCandidates = ['📚', '📖', '📘', '📕', '📗', '📙', '📓', '📔', '📒', '🔖', '📝', '✏️', '🖋️', '🏫', '🎓']

beforeEach(() => {
  completeChat.mockReset()
})

it('returns the first ten unique single-grapheme emoji', async () => {
  completeChat.mockResolvedValueOnce({ emojis_0: candidates })

  const result = await generateEmoji(['Dog'])

  expect(result).toEqual([candidates.slice(0, 10)])
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('Choose fifteen distinct emoji'),
          role: 'system',
        }),
        { content: 'Concept 0: Dog', role: 'user' },
      ],
      service: Service.GENERATE_EMOJI,
    }),
  )
})

it('returns emoji for every value in value order using one LLM request', async () => {
  completeChat.mockResolvedValueOnce({ emojis_0: candidates, emojis_1: bookCandidates })

  await expect(generateEmoji(['Dog', 'Books'])).resolves.toEqual([
    candidates.slice(0, 10),
    bookCandidates.slice(0, 10),
  ])
  expect(completeChat).toHaveBeenCalledTimes(1)
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [expect.objectContaining({ role: 'system' }), { content: 'Concept 0: Dog\nConcept 1: Books', role: 'user' }],
    }),
  )
})

it('builds a separate response field for each value, including duplicate values', async () => {
  const response = { emojis_0: candidates, emojis_1: bookCandidates, emojis_2: candidates }
  completeChat.mockResolvedValueOnce(response)

  await generateEmoji(['Dog', 'Books', 'Dog'])

  const schema = completeChat.mock.calls[0][0].schema
  expect(schema.parse(response)).toEqual(response)
})

it('removes duplicate emoji while preserving ranked order', async () => {
  completeChat.mockResolvedValueOnce({
    emojis_0: ['🐕', '🐶', '🐕', ...candidates.slice(2, 14)],
  })

  await expect(generateEmoji(['Dog'])).resolves.toEqual([candidates.slice(0, 10)])
})

it('removes invalid emoji candidates when at least ten valid candidates remain', async () => {
  completeChat.mockResolvedValueOnce({
    emojis_0: ['🐕🐶', ...candidates.slice(0, 14)],
  })

  await expect(generateEmoji(['Dog'])).resolves.toEqual([candidates.slice(0, 10)])
})

it('rejects responses with fewer than ten unique valid emoji for any value', async () => {
  completeChat.mockResolvedValueOnce({
    emojis_0: candidates,
    emojis_1: [...bookCandidates.slice(0, 9), ...bookCandidates.slice(0, 6)],
  })

  await expect(generateEmoji(['Dog', 'Books'])).rejects.toThrow('The LLM did not return 10 unique emoji')
})
