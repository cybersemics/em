import paste from '../helpers/paste';
import clickThought from '../helpers/clickThought';
import waitForEditable from '../helpers/waitForEditable';
import click from '../helpers/click';
import press from '../helpers/press';
import getSelection from '../helpers/getSelection';
import clickBullet from '../helpers/clickBullet';
import waitUntil from '../helpers/waitUntil';

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
  // TODO: Why is this failing?
  // it.skip('caret should be at the beginning of thought after split on enter', async () => {
  //   const importText = `
  //   - puppeteer
  //     - web scraping
  //   - insomnia
  //     - rest api`
  //   await paste(importText)
  //   await clickThought('puppeteer')
  //   await clickThought('web scraping')

  //   const editableNodeHandle = await waitForEditable(page, 'web scraping')
  //   await click(page, editableNodeHandle, { offset: 3 })

  //   await press(page, 'Enter')

  //   const offset = await getSelection(page, ).focusOffset
  //   expect(offset).toBe(0)
  // })

  it('clicking a bullet, the caret should move to the beginning of the thought', async () => {
    const importText = `
    - Don't stay awake for too long
      - I don't wanna fall asleep`

    await paste(importText)

    const editableNodeHandle = await waitForEditable("I don't wanna fall asleep")
    await click(editableNodeHandle, { offset: 10 })

    await clickBullet("Don't stay awake for too long")
    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking on the left edge of a thought, the caret should move to the beginning of the thought.', async () => {
    const importText = `
    - Purple Rain`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Purple Rain')

    await click(editableNodeHandle, { offset: 5 })
    await waitUntil(() => window.getSelection()?.focusOffset === 5)
    await click(editableNodeHandle, { edge: 'left' })

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking on the right edge of a thought, the caret should move to the end of the thought.', async () => {
    const importText = `
    - Richard Feynman`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Richard Feynman')

    await click(editableNodeHandle, { edge: 'left' })
    await waitUntil(() => window.getSelection()?.focusOffset === 0)
    await click(editableNodeHandle, { edge: 'right' })

    const offset = await getSelection().focusOffset
    expect(offset).toBe('Richard Feynman'.length)
  })
})
