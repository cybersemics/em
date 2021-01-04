import { EMOJI_REGEX_STRING } from '../../constants'

const emojiRegex = new RegExp(EMOJI_REGEX_STRING)

it('Test emoji regex', () => {
  expect(emojiRegex.test('🧠 Big Brain')).toBe(true)
  expect(emojiRegex.test('👾 X Æ A-Xii 👾')).toBe(true)
  // previous emoji regex used in compareStringsWithEmoji detected string with apostrophe(’) as emoji
  // https://github.com/cybersemics/em/issues/952
  expect(emojiRegex.test('Twinsen’s Odyssey')).toBe(false)
})
