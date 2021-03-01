import { EMOJI_REGEX } from '../../constants'

it('Test emoji regex', () => {
  expect(EMOJI_REGEX.test('🧠 Big Brain')).toBe(true)
  expect(EMOJI_REGEX.test('👾 X Æ A-Xii 👾')).toBe(true)
  // previous emoji regex used in compareStringsWithEmoji detected string with apostrophe(’) as emoji
  // https://github.com/cybersemics/em/issues/952
  expect(EMOJI_REGEX.test('Twinsen’s Odyssey')).toBe(false)
  expect(EMOJI_REGEX.test('🚦')).toBe(true)
  expect(EMOJI_REGEX.test('🖼️')).toBe(true)
})
