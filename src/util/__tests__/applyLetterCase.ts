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

  it('SentenceCase result does not equal LowerCase result for HTML-tagged values with text', () => {
    const value = '<font style="background-color: rgb(0, 128, 255);">HELLO WORLD</font>'
    const sentenceCase = applyLetterCase('SentenceCase', value)
    const lowerCase = applyLetterCase('LowerCase', value)
    expect(sentenceCase).not.toBe(lowerCase)
    expect(sentenceCase).toBe('<font style="background-color: rgb(0, 128, 255);">Hello world</font>')
    expect(lowerCase).toBe('<font style="background-color: rgb(0, 128, 255);">hello world</font>')
  })
})
