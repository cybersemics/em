import addEmojiSpace from '../addEmojiSpace'

it('add space if text starts with emojis', () => {
  expect(addEmojiSpace('🧠Brain')).toEqual('🧠 Brain')
  expect(addEmojiSpace('👾👾Aliens')).toEqual('👾👾 Aliens')
  expect(addEmojiSpace('party🎉')).toEqual('party🎉')
  expect(addEmojiSpace('🧠')).toEqual('🧠')
  expect(addEmojiSpace('🚦🖌📧🖼🏵Projects')).toEqual('🚦🖌📧🖼🏵 Projects')
})

it('add space for emoji with selectors(\ufe0f) at the end.', () => {
  expect(addEmojiSpace('🖼️')).toEqual('🖼️')
  expect(addEmojiSpace('🖼️🖼️Ola')).toEqual('🖼️🖼️ Ola')
  expect(addEmojiSpace('🖥️')).toEqual('🖥️')
  expect(addEmojiSpace('🖥️🖼️Amigo')).toEqual('🖥️🖼️ Amigo')
})

it('do not break zwj sequenced emojis.', () => {
  expect(addEmojiSpace('👩🏻‍🏫Reading')).toEqual('👩🏻‍🏫 Reading')
  expect(addEmojiSpace('👩🏻‍🏫')).toEqual('👩🏻‍🏫')
  expect(addEmojiSpace('👩‍👩‍👦‍👦💏Family')).toEqual('👩‍👩‍👦‍👦💏 Family')
})

it('only add extra spaces if emojis are followed by non whitespace character.', () => {
  expect(addEmojiSpace('🐶🐰 Animals')).toEqual('🐶🐰 Animals')
  expect(addEmojiSpace('The Great Gatsby')).toEqual('The Great Gatsby')
})
