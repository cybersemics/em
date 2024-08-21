import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
  const { setColor, clickThought, paste, waitForEditable } = helpers()

  it('Set the text color of the selection', async () => {
    const importText = `
    - Labrador
    - Golden Retriever`

    await paste(importText)

    await waitForEditable('Golden Retriever')
    await clickThought('Golden Retriever')
    const result = await setColor('Golden Retriever', 'foreColor', '#ff0000', 1, 4)
    expect(result?.textColor).toBe('#ff0000')
    expect(result?.backColor).toBe(null)
  })

  it('Set the background color of the selection', async () => {
    const importText = `
    - Labrador
    - Golden Retriever`

    await paste(importText)

    await waitForEditable('Golden Retriever')
    await clickThought('Golden Retriever')
    const result = await setColor('Golden Retriever', 'backColor', 'rgb(255, 0, 0)', 1, 4)
    expect(result?.textColor).toBe(null)
    expect(result?.backColor).toBe('rgb(255, 0, 0)')
  })
})
