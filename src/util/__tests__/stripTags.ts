import stripTags from '../stripTags'

describe('stripTags', () => {
  it('strips html tags', () => {
    expect(stripTags('<b>test</b>')).toBe('test')
  })

  it('strips an unterminated html-like tag', () => {
    expect(stripTags('<abc')).toBe('')
  })

  it('strips text from an unterminated html-like tag onward', () => {
    expect(stripTags('x<abc')).toBe('x')
  })
})
