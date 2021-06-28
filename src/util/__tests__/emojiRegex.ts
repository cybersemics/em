import { EMOJI_REGEX, EMOJI_REGEX_GLOBAL } from '../../constants'

it('normal emojis', () => {
  expect('🧠 Big Brain'.match(EMOJI_REGEX)).toBeTruthy()
  expect('👾 X Æ A-Xii 👾'.match(EMOJI_REGEX)).toBeTruthy()
  expect('🚦'.match(EMOJI_REGEX)).toBeTruthy()
  expect('🖼️'.match(EMOJI_REGEX)).toBeTruthy()
})

it('prevent unwanted characters to be detected as emojis.', () => {
  // previous emoji regex used in compareStringsWithEmoji detected string with apostrophe(’) as emoji
  // https://github.com/cybersemics/em/issues/952
  expect('1234567890*&^’%$#@!-+\\;'.match(EMOJI_REGEX_GLOBAL)).toBeFalsy()
})

it('ios/macOS emojis without variant selector', () => {

  // Note: All these IOS/macOS emojis unicode don't have \ufe0f at the end. So they are detected as text represenation instead of emoji. RGI based emoji regex (in emoji-regex) doesn't detect them as emojis. Even though ios and mac os don't quite follow the standards, they are still emojis and needs to be detected as one.

  const emojis = ['👁', '🗣', '⛑', '🕶', '🕸', '🕊', '🐿', '🌪', '🌤', '🌦', '⛈', '🌩', '🌨', '🌬', '🌫', '⛸', '⛷', '🎖', '🏵', '🎗', '🎟', '♟', '⛴', '🏟', '🏜', '🏗', '🛤', '🛣', '🏞', '🏙', '🖥', '🖨', '🖲', '🗜', '🎞', '🎙', '🎚', '🎛', '⏲', '🕯', '⚒🛠', '🛡', '🕳']

  emojis.forEach(emoji => {
    expect(emoji.match(EMOJI_REGEX)).toBeTruthy()
  })
})

// About ZWJ sequences https://blog.emojipedia.org/emoji-zwj-sequences-three-letters-many-possibilities/
it('ZWJ Sequenced emoji should be detected as single emoji', () => {

  // Note: Some emojis are built from sequences of other emoji unicodes. But they should be detected as a single emoji.
  const zwjSequencedEmojis = ['👩‍👩‍👧‍👦', '👩🏻‍🦱', '👩🏽‍🏫', '👩🏼‍❤️‍💋‍👩🏽', '👩‍👧‍👦', '👨‍👨‍👦', '🧖🏽‍♀️', '🧝🏽‍♀️', '🙍🏼‍♀️', '🙆🏽‍♂️', '🙇🏽‍♀️', '👨‍👧‍👦']

  zwjSequencedEmojis.forEach(emoji => {
    expect(emoji.match(EMOJI_REGEX_GLOBAL)).toHaveLength(1)
  })
})
