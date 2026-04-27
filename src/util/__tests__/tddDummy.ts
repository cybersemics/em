import { compareReasonable } from '../compareThought'

describe('tdd', () => {
  it('sort testZ after testY', () => {
    expect(compareReasonable('testZ', 'testY')).toBe(1)
    expect(compareReasonable('testY', 'testZ')).toBe(-1)
  })
})
