import normalizeThought from '../normalizeThought'

describe('case', () => {
  test('uppercase should not be distinguished from lowercase', () => {
    expect(normalizeThought('A')).toBe(normalizeThought('a'))
  })
})

describe('emoji', () => {
  test('emoji with text should match text', () => {
    expect(normalizeThought('🧠 Cybersemics')).toBe(normalizeThought('Cybersemics'))
  })
  test('lone emoji should be distinguished from each other', () => {
    expect(normalizeThought('🧠')).not.toBe(normalizeThought('📚'))
  })
})

describe('html', () => {
  test('<b>text</b> should match text', () => {
    expect(normalizeThought('hello <b>world</b>')).toBe(normalizeThought('hello world'))
  })
})

describe('hyphen', () => {
  test('hyphenated words are not distinguished from non-hyphenated words', () => {
    expect(normalizeThought('sense-making')).toBe(normalizeThought('sensemaking'))
  })
})

describe('metaprogramming', () => {
  test('metaprogramming attributes should be distinguished', () => {
    expect(normalizeThought('=test')).not.toBe(normalizeThought('test'))
  })
})

describe('plural', () => {
  test('plural is the same as singular', () => {
    expect(normalizeThought('dogs')).toBe(normalizeThought('dog'))
    expect(normalizeThought('geese')).toBe(normalizeThought('goose'))
  })

  test(`a lone 's' should not be considered plural`, () => {
    expect(normalizeThought('s')).not.toBe(normalizeThought(''))
  })
})

describe('punctuation', () => {
  test('punctuation is ignored', () => {
    expect(normalizeThought('You? And me!')).toBe(normalizeThought('You and me'))
  })
})

describe('quotes', () => {
  test('straight quotes are ignored', () => {
    expect(normalizeThought(`dog's`)).toBe(normalizeThought('dogs'))
  })
  test('curly quotes are ignored', () => {
    expect(normalizeThought(`dog’s`)).toBe(normalizeThought('dogs'))
  })
})

describe('whitespace', () => {
  test('whitespace is ignored', () => {
    expect(normalizeThought('\ta\nb c ')).toBe(normalizeThought('abc'))
  })
})
