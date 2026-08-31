const completeChat = vi.hoisted(() => vi.fn())

vi.mock('../completeChat', () => ({ default: completeChat }))

import generateEmoji from '../prompts/generateEmoji'

const candidates = ['🐕', '🐶', '🦮', '🐾', '🦴', '🐕‍🦺', '🐩', '🐺', '🏠', '🦊', '🌳', '⚽', '🚶', '🛋️', '❤️']

beforeEach(() => {
  completeChat.mockReset()
})

it('returns the first ten unique single-grapheme emoji', async () => {
  completeChat.mockResolvedValueOnce({ emojis: candidates })

  const result = await generateEmoji('Dog')

  expect(result).toEqual(candidates.slice(0, 10))
  expect(completeChat).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('Choose fifteen distinct emoji'),
          role: 'system',
        }),
        { content: 'Dog', role: 'user' },
      ],
    }),
  )
})

it('removes duplicate emoji while preserving ranked order', async () => {
  completeChat.mockResolvedValueOnce({
    emojis: ['🐕', '🐶', '🐕', ...candidates.slice(2, 14)],
  })

  await expect(generateEmoji('Dog')).resolves.toEqual(candidates.slice(0, 10))
})

it('removes invalid emoji candidates when at least ten valid candidates remain', async () => {
  completeChat.mockResolvedValueOnce({
    emojis: ['🐕🐶', ...candidates.slice(0, 14)],
  })

  await expect(generateEmoji('Dog')).resolves.toEqual(candidates.slice(0, 10))
})

it('rejects responses with fewer than ten unique valid emoji', async () => {
  completeChat.mockResolvedValueOnce({
    emojis: [...candidates.slice(0, 9), ...candidates.slice(0, 6)],
  })

  await expect(generateEmoji('Dog')).rejects.toThrow('The LLM did not return 10 unique emoji')
})
