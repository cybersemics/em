import toMilliseconds from '../toMilliseconds'

describe('toMilliseconds', () => {
  it('should parse ms strings', () => {
    expect(toMilliseconds('350ms')).toEqual(350)
  })

  it('should parse s strings', () => {
    expect(toMilliseconds('5s')).toEqual(5000)
  })

  it('should parse unitless strings as milliseconds', () => {
    expect(toMilliseconds('550')).toEqual(550)
  })
})
