import exportContextCommand from '../exportContext'

describe('exportContext', () => {
  it('uses "plain text" in the description', () => {
    expect(exportContextCommand.description).toBe('Download or copy the current context as plain text or html.')
  })
})
