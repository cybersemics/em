import { compareReasonable } from '../compareThought'

describe('tdd', () => {
  it('sort testY after testZ', () => {
    expect(compareReasonable('testY', 'testZ')).toBe(1)
    expect(compareReasonable('testZ', 'testY')).toBe(-1)
  })
})
