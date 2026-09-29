import applyLetterCase from '../applyLetterCase'

describe('plain text', () => {
  it('applies LowerCase', () => {
    expect(applyLetterCase('LowerCase', 'Hello World')).toBe('hello world')
  })

  it('applies UpperCase', () => {
    expect(applyLetterCase('UpperCase', 'Hello World')).toBe('HELLO WORLD')
  })

  it('applies SentenceCase', () => {
    expect(applyLetterCase('SentenceCase', 'hello everyone, this is rose. thanks for your help.')).toBe(
      'Hello everyone, this is rose. Thanks for your help.',
    )
  })

  it('applies TitleCase', () => {
    expect(applyLetterCase('TitleCase', 'hello world')).toBe('Hello World')
  })
})

describe('HTML-tagged values (e.g. from background color formatting)', () => {
  it('applies SentenceCase to text wrapped in a font tag with background color', () => {
    const value = '<font style="background-color: rgb(0, 128, 255);">hello world. second sentence.</font>'
    expect(applyLetterCase('SentenceCase', value)).toBe(
      '<font style="background-color: rgb(0, 128, 255);">Hello world. Second sentence.</font>',
    )
  })

  it('applies SentenceCase to uppercase text wrapped in a font tag', () => {
    const value = '<font style="background-color: rgb(0, 128, 255);">HELLO WORLD. SECOND SENTENCE.</font>'
    expect(applyLetterCase('SentenceCase', value)).toBe(
      '<font style="background-color: rgb(0, 128, 255);">Hello world. Second sentence.</font>',
    )
  })

  it('SentenceCase result is idempotent for HTML-tagged values', () => {
    const value = '<font style="background-color: rgb(0, 128, 255);">Hello world. Second sentence.</font>'
    expect(applyLetterCase('SentenceCase', value)).toBe(value)
  })

  it('applies UpperCase to text wrapped in a font color tag without corrupting the markup', () => {
    const value = '<font color="#ff0000">hello world</font>'
    expect(applyLetterCase('UpperCase', value)).toBe('<font color="#ff0000">HELLO WORLD</font>')
  })

  it('applies LowerCase to text wrapped in a font color tag without corrupting the markup', () => {
    const value = '<font color="#FF0000">HELLO WORLD</font>'
    expect(applyLetterCase('LowerCase', value)).toBe('<font color="#FF0000">hello world</font>')
  })

  it('transforms text across nested tags while preserving the markup', () => {
    const value = '<b>hello <font color="#00FF00">green</font> world</b>'
    expect(applyLetterCase('UpperCase', value)).toBe('<b>HELLO <font color="#00FF00">GREEN</font> WORLD</b>')
  })
})

describe('transforms that change the length of the text', () => {
  // https://github.com/cybersemics/em/pull/4858#pullrequestreview-4893666301
  it('applies UpperCase to a value containing ß without truncating the text', () => {
    expect(applyLetterCase('UpperCase', '"Straße" means "Street" in German')).toBe('"STRASSE" MEANS "STREET" IN GERMAN')
  })

  it('applies UpperCase to a value containing ß in a tag without truncating the text', () => {
    expect(applyLetterCase('UpperCase', '<b>Straße</b> means street')).toBe('<b>STRASSE</b> MEANS STREET')
  })

  // title case does not capitalize a token that contains a period, so the transform of a prefix can be longer than the
  // transform of the whole value
  it('applies TitleCase across tags without duplicating text', () => {
    /** Extracts the plain text of an html string. */
    const textContent = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent
    expect(textContent(applyLetterCase('TitleCase', 'ᾷßx<b>.</b>ß<b>B</b>'))).toBe('ᾷßx.ßb')
  })
})

describe('a selected range', () => {
  // https://github.com/cybersemics/em/issues/4281
  it('transforms only the range, leaving the rest of the value unchanged', () => {
    expect(applyLetterCase('UpperCase', 'Welcome to the world of beautiful people', { start: 24, end: 33 })).toBe(
      'Welcome to the world of BEAUTIFUL people',
    )
  })

  it('transforms a range that spans tags while preserving the markup', () => {
    const value = '<b>hello <font color="#00FF00">green</font> world</b>'
    expect(applyLetterCase('UpperCase', value, { start: 6, end: 11 })).toBe(
      '<b>hello <font color="#00FF00">GREEN</font> world</b>',
    )
  })

  it('transforms a range whose transform changes the length of the text', () => {
    expect(applyLetterCase('UpperCase', 'Straße x', { start: 0, end: 6 })).toBe('STRASSE x')
  })

  it('transforms to the end of the value when no end is given', () => {
    expect(applyLetterCase('LowerCase', 'HELLO WORLD', { start: 6 })).toBe('HELLO world')
  })
})
