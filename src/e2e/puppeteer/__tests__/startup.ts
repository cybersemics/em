import command from '../helpers/command'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import reloadWithDeferredInitialization from '../helpers/reloadWithDeferredInitialization'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 30000, hookTimeout: 20000 })

it('keeps typing in the same thought when background initialization finishes', async () => {
  const finishInitialization = await reloadWithDeferredInitialization()
  expect(await getEditingText()).toBeUndefined()

  try {
    await press('Enter')
    await waitForCursor('')
    expect(await getEditingText()).toBe('')
    await keyboard.type('before')
    await waitForEditable('before')

    await finishInitialization()
    await waitForBrowserSettled()
    expect(await getEditingText()).toBe('before')

    await keyboard.type(' after')
    await waitForEditable('before after')
    expect(await getEditingText()).toBe('before after')
  } finally {
    await finishInitialization()
  }
})

it('keeps note focus when background initialization finishes', async () => {
  const finishInitialization = await reloadWithDeferredInitialization()
  try {
    await newThought('parent')
    await command('note')
    await waitForSelector('[aria-label=note-editable]')
    await keyboard.type('before')
    expect(await page.$eval('[aria-label=note-editable]', note => note.textContent)).toBe('before')

    await finishInitialization()
    await waitForBrowserSettled()
    expect(
      await page.$eval('[aria-label=note-editable]', note => note.contains(window.getSelection()?.focusNode ?? null)),
    ).toBe(true)

    await keyboard.type(' after')
    expect(await page.$eval('[aria-label=note-editable]', note => note.textContent)).toBe('before after')
    expect(await page.$$eval('[data-editable]', thoughts => thoughts.map(thought => thought.textContent))).toEqual([
      'parent',
    ])
  } finally {
    await finishInitialization()
  }
})
