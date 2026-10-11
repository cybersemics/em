import unwrapGeneratingEmoji from '../unwrapGeneratingEmoji'

it('returns the html unchanged when there is no wrap', () => {
  expect(unwrapGeneratingEmoji('🍎 Apples')).toBe('🍎 Apples')
})

it('removes a generating emoji wrap and keeps the emoji', () => {
  expect(unwrapGeneratingEmoji('<span data-generating-emoji>🍎</span> Apples')).toBe('🍎 Apples')
})

it('removes a boolean-attribute wrap serialized by the browser', () => {
  expect(unwrapGeneratingEmoji('<span data-generating-emoji="">🍎</span> Apples')).toBe('🍎 Apples')
})

it('keeps formatting tags around an unwrapped emoji', () => {
  expect(unwrapGeneratingEmoji('<b><span data-generating-emoji>🍌</span> Bananas</b>')).toBe('<b>🍌 Bananas</b>')
})
