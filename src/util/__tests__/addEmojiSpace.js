import { addEmojiSpace } from '../addEmojiSpace'

it('add space if text starts with emojis', () => {
  expect(addEmojiSpace('🧠Brain')).toEqual('🧠 Brain')
  expect(addEmojiSpace('👾👾Aliens')).toEqual('👾👾 Aliens')
  expect(addEmojiSpace('party🎉')).toEqual('party🎉')
})
