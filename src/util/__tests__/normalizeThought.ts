import normalizeThought from '../normalizeThought'

// use variable names to make en dash and em dash easier to distinguish in tests
const LONG_DASH = `–` // en dash
const LONGER_DASH = `—` // em dash

describe('algebra', () => {
  test('addition and subtraction should be distinguished', () => {
    expect(normalizeThought('3 + 4')).not.toBe(normalizeThought('3 - 4'))
    expect(normalizeThought('3+4')).not.toBe(normalizeThought('3-4'))
  })
})

describe('ampersand', () => {
  test('ampersand should be match the word "and"', () => {
    expect(normalizeThought('a & b')).toBe(normalizeThought('a and b'))
  })
})

describe('boolean', () => {
  test('boolean && expressions should be distinguished from numbers with the same digits', () => {
    expect(normalizeThought('3 && 4')).not.toBe(normalizeThought('34'))
  })
  test('boolean || expressions should be distinguished from numbers with the same digits', () => {
    expect(normalizeThought('3 || 4')).not.toBe(normalizeThought('34'))
  })
  test('boolean negation expressions should be distinguished from numbers with the same digits', () => {
    expect(normalizeThought('!a')).not.toBe(normalizeThought('a'))
  })
})

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

describe('hashtags and mentions', () => {
  test('hashtags should be distinguished from text', () => {
    expect(normalizeThought('#test')).not.toBe(normalizeThought('test'))
  })
  test('mentions should be distinguished from text', () => {
    expect(normalizeThought('@test')).not.toBe(normalizeThought('test'))
  })
})

describe('html', () => {
  test('<b>text</b> should match text', () => {
    expect(normalizeThought('hello <b>world</b>')).toBe(normalizeThought('hello world'))
  })
})

describe('hyphen', () => {
  test('lone hyphen shuld be distinguished', () => {
    expect(normalizeThought('-')).not.toBe(normalizeThought(''))
    expect(normalizeThought(LONG_DASH)).not.toBe(normalizeThought(''))
    expect(normalizeThought(LONGER_DASH)).not.toBe(normalizeThought(''))
  })
  test('hyphenated words are not distinguished from non-hyphenated words', () => {
    expect(normalizeThought('sense-making')).toBe(normalizeThought('sensemaking'))
    expect(normalizeThought(`sense${LONG_DASH}making`)).toBe(normalizeThought('sensemaking'))
    expect(normalizeThought(`sense${LONGER_DASH}making`)).toBe(normalizeThought('sensemaking'))
  })
  test('negative numbers are distinguished from positive numbers', () => {
    expect(normalizeThought('-500')).not.toBe(normalizeThought('500'))
    expect(normalizeThought(`${LONG_DASH}500`)).not.toBe(normalizeThought('500'))
    expect(normalizeThought(`${LONGER_DASH}500`)).not.toBe(normalizeThought(`500`))
  })
  test('ranges are distinguished from numbers with the same digits', () => {
    expect(normalizeThought('1020')).not.toBe(normalizeThought('10-20'))
    expect(normalizeThought(`10${LONG_DASH}20`)).not.toBe(normalizeThought('10'))
    expect(normalizeThought(`10${LONGER_DASH}20`)).not.toBe(normalizeThought(`20`))
  })
  test('hyphen at word boundary should be distinguished', () => {
    expect(normalizeThought('A')).not.toBe(normalizeThought('A-'))
    expect(normalizeThought(`A${LONG_DASH}`)).not.toBe(normalizeThought('A'))
    expect(normalizeThought(`A${LONGER_DASH}`)).not.toBe(normalizeThought('A'))
  })
  test('hyphen at beginning or end of line should be distinguished', () => {
    expect(normalizeThought('Points: -500')).not.toBe(normalizeThought('Points: 500'))
    expect(normalizeThought(`Points: ${LONG_DASH}500`)).not.toBe(normalizeThought('Points: 500'))
    expect(normalizeThought(`Points: ${LONGER_DASH}500`)).not.toBe(normalizeThought('Points: 500'))
  })
})

describe('metaprogramming', () => {
  test('metaprogramming attributes should be distinguished', () => {
    expect(normalizeThought('=test')).not.toBe(normalizeThought('test'))
  })
})

describe('numbers', () => {
  test('fractions should be distinguished from numbers with the same digits', () => {
    expect(normalizeThought('1/2')).not.toBe(normalizeThought('12'))
  })
  test('ratios should be distinguished from numbers with the same digits', () => {
    expect(normalizeThought('1:2')).not.toBe(normalizeThought('12'))
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
  test('non-hyphen punctuation is ignored', () => {
    expect(normalizeThought('You? And me!')).toBe(normalizeThought('You and me'))
  })
  test('lone punctuation should be distinguished from each other', () => {
    expect(normalizeThought('?')).not.toBe(normalizeThought('!'))
  })
  test('ending punctuation should be ignored', () => {
    expect(normalizeThought('Hello.')).toBe(normalizeThought('Hello'))
    expect(normalizeThought('Hello?')).toBe(normalizeThought('Hello'))
    expect(normalizeThought('Hello!')).toBe(normalizeThought('Hello'))
    expect(normalizeThought('Hello:')).toBe(normalizeThought('Hello'))
    expect(normalizeThought('Hello;')).toBe(normalizeThought('Hello'))
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

describe('diacritics', () => {
  test('characters with diacritics should match those without diacritics', () => {
    expect(normalizeThought('Lacoön')).toBe(normalizeThought('Lacoon'))
  })
})

describe('whitespace', () => {
  test('whitespace is ignored', () => {
    expect(normalizeThought('\ta\nb c ')).toBe(normalizeThought('abc'))
  })
})
