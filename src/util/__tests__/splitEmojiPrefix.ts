import splitEmojiPrefix from '../splitEmojiPrefix'

it('split the leading emoji and the whitespace that follows it', () => {
  expect(splitEmojiPrefix('🧠 Brain')).toEqual({ prefixLength: 3, valuePrefix: '🧠 ', valueRest: 'Brain' })
  expect(splitEmojiPrefix('🧠  Brain')).toEqual({ prefixLength: 4, valuePrefix: '🧠  ', valueRest: 'Brain' })
})

it('split the leading emoji when no whitespace follows it', () => {
  expect(splitEmojiPrefix('🧠Brain')).toEqual({ prefixLength: 2, valuePrefix: '🧠', valueRest: 'Brain' })
})

it('split a group of leading emoji', () => {
  expect(splitEmojiPrefix('🚦🖌📧🖼🏵 Projects')).toEqual({
    prefixLength: 11,
    valuePrefix: '🚦🖌📧🖼🏵 ',
    valueRest: 'Projects',
  })
})

it('do not break zwj sequenced emoji', () => {
  expect(splitEmojiPrefix('👩🏻‍🏫 Reading')).toEqual({
    prefixLength: 8,
    valuePrefix: '👩🏻‍🏫 ',
    valueRest: 'Reading',
  })
})

it('split an emoji with a variant selector', () => {
  expect(splitEmojiPrefix('🖼️ Pictures')).toEqual({ prefixLength: 4, valuePrefix: '🖼️ ', valueRest: 'Pictures' })
})

it('do not split a value that does not start with an emoji', () => {
  expect(splitEmojiPrefix('Brain 🧠')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: 'Brain 🧠' })
  expect(splitEmojiPrefix('Brain')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: 'Brain' })
  expect(splitEmojiPrefix('')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: '' })
})

it('do not split a value that is nothing but an emoji', () => {
  expect(splitEmojiPrefix('🧠')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: '🧠' })
  expect(splitEmojiPrefix('🧠 ')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: '🧠 ' })
  expect(splitEmojiPrefix('🧠👾')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: '🧠👾' })
})

it('re-balance formatting tags onto both halves', () => {
  expect(splitEmojiPrefix('<b>🧠 Brain</b>')).toEqual({
    prefixLength: 3,
    valuePrefix: '<b>🧠 </b>',
    valueRest: '<b>Brain</b>',
  })
  expect(splitEmojiPrefix('🧠 <b>Brain</b>')).toEqual({
    prefixLength: 3,
    valuePrefix: '🧠 ',
    valueRest: '<b>Brain</b>',
  })
  expect(splitEmojiPrefix('<b>🧠</b> Brain')).toEqual({
    prefixLength: 3,
    valuePrefix: '<b>🧠</b> ',
    valueRest: 'Brain',
  })
})

it('do not split a formatted value that is nothing but an emoji', () => {
  expect(splitEmojiPrefix('<b>🧠</b>')).toEqual({ prefixLength: 0, valuePrefix: '', valueRest: '<b>🧠</b>' })
})
