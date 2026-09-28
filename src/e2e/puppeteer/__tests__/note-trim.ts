import clickNote from '../helpers/clickNote'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

// https://github.com/cybersemics/em/issues/5084
it('trims browser-generated spaces on blur without stealing focus or breaking redo', async () => {
  await paste(`
    - a
      - =note
        - seed
  `)
  await clickThought('a')
  await clickNote('seed')
  await press('Home')
  await keyboard.type('  ')
  await press('End')
  await keyboard.type('  ')

  const editingHtml = await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)
  expect(editingHtml).toBe('&nbsp; seed&nbsp;&nbsp;')

  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('seed')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - seed
`)

  await press('z', { meta: true })
  await waitUntil(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML === '&nbsp; seed&nbsp;&nbsp;')
  await press('z', { meta: true, shift: true })
  await waitUntil(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML === 'seed')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('seed')
})

// https://github.com/cybersemics/em/issues/5084
it('shows trimmed referenced notes after undo and redo', async () => {
  await paste(`
    - a
      - =note
        - =path
          - b
      - b
        - c
        - d
  `)
  await clickThought('a')
  await clickNote('c, d')
  await press('Home')
  await keyboard.type('  ')
  await press('End')
  await keyboard.type('  ')
  const editingHtml = await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)
  expect(editingHtml).toBe('&nbsp; c, d&nbsp;&nbsp;')

  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('c, d')

  await press('z', { meta: true })
  await waitUntil(() => document.activeElement?.getAttribute('aria-label') === 'note-editable')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('&nbsp; c, d&nbsp;&nbsp;')
  await press('z', { meta: true, shift: true })
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('c, d')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - =path
      - b
  - b
    - c
    - d
`)

  await clickNote('c, d')
  await press('End')
  await keyboard.type('e  ')
  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('c, de')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - =path
      - b
  - b
    - c
    - de
`)
})
