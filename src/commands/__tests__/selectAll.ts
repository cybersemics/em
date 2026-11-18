import indentCommand from '../indent'
import selectAllCommand from '../selectAll'

describe('isChainable', () => {
  // https://github.com/cybersemics/em/issues/5874
  it.skip('does not chain Indent', () => {
    expect(selectAllCommand.isChainable(indentCommand)).toBe(false)
  })
})
